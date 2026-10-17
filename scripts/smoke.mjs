import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {run,reads,questions,resolve,tables} from './lib/domain.mjs';
import {importSalesforce} from './lib/import.mjs';
import {parseCsv} from './lib/csv.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'survey-test-'));
process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=tmp;process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
const schema='test_'+Date.now();let db;let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const tx=async(fn)=>{await db.exec('BEGIN');try{const v=await fn();await db.exec('COMMIT');return v;}catch(e){await db.exec('ROLLBACK');throw e;}};
const reject=async(fn,pattern)=>{await assert.rejects(()=>tx(fn),pattern);checks++;};
const sample=path.join(REPO_ROOT,'examples/salesforce');
const mapFile=path.join(sample,'mapping.json'),csvFile=path.join(sample,'responses.csv');
try{
 db=await getDb();if(process.env.TEST_DATABASE_URL){await db.exec(`create schema ${schema}; set search_path to ${schema}`);process.env.PGOPTIONS='-c search_path='+schema;}
 ok((await migrate(db)).ran.length===1,'migration applied');ok((await migrate(db)).ran.length===0,'migration repeat');
 const seed=fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8');await tx(()=>db.exec(seed));await tx(()=>db.exec(seed));
 ok((await db.query('select * from responses')).length===5,'idempotent seed');
 for(const cmd of Object.keys(reads)){const out=await run(db,cmd);ok(Array.isArray(out),cmd);}
 const cards=await run(db,'scorecards');ok(Number(cards.find(x=>x.survey==='SERVICE'&&x.question==='NPS'&&x.segment==='North').nps)===0,'NPS denominator');
 ok(Number(cards.find(x=>x.question==='CSAT'&&x.segment==='South').csat_percent)===50,'CSAT denominator');
 ok((await run(db,'attention')).length===2,'overdue action and retention');ok(Object.keys(await run(db,'insights')).length===10,'ten executed queries');
 ok((await resolve(db,'responses','sr-101')).source_id==='SR-101','case insensitive');ok((await resolve(db,'responses','30000000-0000-0000-0000-000000000001')).source_id==='SR-101','UUID');
 await reject(()=>resolve(db,'responses','alex'),/Ambiguous.*\n/s);
 const write=(name,v)=>{const f=path.join(tmp,name);fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v));return f;};
 const add=async(kind,d)=>tx(()=>run(db,'add',kind,{file:write(kind+'.json',d),actor:'Test operator'}));
 const s=await add('survey',{code:'NEW',name:'New survey',owner:'Test',purpose:'Check import and review',retention_days:30});
 const q=await add('question',{survey:s.id,code:'NPS',name:'Recommend?',kind:'nps'});
 const r=await add('response',{survey:s.id,source_id:'TEST-1',respondent:'Test Person',segment:'Test',received_on:'2026-09-01',review_due:'2099-01-01'});
 await reject(()=>run(db,'add','response',{file:write('bad-date.json',{survey:s.id,source_id:'BAD',respondent:'Test',segment:'Test',received_on:'2026-02-30',review_due:'2099-01-01'}),actor:'Test'}),/valid YYYY/);
 await add('answer',{response:r.id,question:'NPS',score:0});
 await reject(()=>run(db,'add','answer',{file:write('bad-score.json',{response:'SR-104',question:'CSAT',score:6}),actor:'Test'}),/range/);
 await reject(()=>db.query('insert into answers(survey_id,response_id,question_id,score) values($1,$2,$3,5)',[s.id,r.id,'20000000-0000-0000-0000-000000000001']),/foreign key|not present|Question/i);
 const a=await add('action',{response:r.id,title:'Test follow-up <script>alert(1)</script>',owner:'Mia',due_on:'2026-09-10'});
 await reject(()=>run(db,'close-action',a.id,{actor:'Test',closed:'2026-09-02',outcome:'Done',evidence:'Note'}),/Verify response/);
 await tx(()=>run(db,'verify-response',r.id,{actor:'Test',checked:'2026-09-02',reference:'Source checked'}));
 await tx(()=>run(db,'log',r.id,{actor:'Test',note:'Confirmed the source before use'}));
 await reject(()=>run(db,'review-retention',r.id,{actor:'Test',due:'2099-01-01'}),/reason/);
 await tx(()=>run(db,'review-retention',r.id,{actor:'Test',due:'2099-01-02',reason:'Synthetic test only'}));
 await tx(()=>run(db,'close-action',a.id,{actor:'Test',closed:'2026-09-03',outcome:'Recorded the actual callback',evidence:'Demo call record'}));
 await reject(()=>run(db,'close-action',a.id,{actor:'Test',closed:'2026-09-03',outcome:'Again',evidence:'Note'}),/already closed/);
 ok((await run(db,'response',r.id)).notes.length===1,'response file includes notes');
 ok(fs.existsSync((await run(db,'weekly-review')).file),'weekly draft');ok(fs.existsSync((await run(db,'draft-follow-up',r.id)).file),'follow-up draft');
 await reject(()=>run(db,'draft-follow-up','SR-103'),/Verify response/);
 // Import a configured wide CSV, including unchanged repeat and all-or-nothing failures.
 const first=await tx(()=>importSalesforce(db,csvFile,mapFile,'Test'));ok(first.imported===2,'import two');
 const second=await tx(()=>importSalesforce(db,csvFile,mapFile,'Test'));ok(second.unchanged===2,'idempotent import');
 const csv=fs.readFileSync(csvFile,'utf8');
 await reject(()=>importSalesforce(db,write('changed.csv',csv.replace('Clear communication.','Changed.')),mapFile,'Test'),/Changed source/);
 const changedMap=JSON.parse(fs.readFileSync(mapFile));changedMap.questions[0].kind='csat';
 await reject(()=>importSalesforce(db,csvFile,write('changed-map.json',changedMap),'Test'),/definition changed/);
 const bad=csv.replace('EXPORT-1','EXPORT-3').replace('EXPORT-2','EXPORT-4').replace(',10,5,',',11,5,');
 await reject(()=>importSalesforce(db,write('rollback.csv',bad),mapFile,'Test'),/range/);
 ok(!(await db.query("select * from responses where source_id='EXPORT-3'")).length,'rollback first row');
 await reject(()=>importSalesforce(db,write('duplicate.csv',csv.replace('EXPORT-2','EXPORT-1')),mapFile,'Test'),/Duplicate response/);
 const exp=await run(db,'export');for(const t of tables)ok(Array.isArray(exp[t]),'export '+t);
 ok(exp.responses.find(x=>x.source_id==='EXPORT-1').source_row['Response ID']==='EXPORT-1','original source preserved');
 const outFile=path.join(tmp,'backup.json');await run(db,'export',null,{out:outFile});await reject(()=>run(db,'export',null,{out:outFile}),/EEXIST/);
 ok(parseCsv('\ufeffa,b\r\n"hello, x","two\nlines"\r\n')[0].b==='two\nlines','CSV multiline BOM');
 assert.throws(()=>parseCsv('a,a\n1,2'),/unique/);assert.throws(()=>parseCsv('a,b\n"x,y'),/unclosed/);checks+=2;
 await db.close();db=null;
 const cli=(script,args=[],expected=0)=>{const r=spawnSync(process.execPath,['scripts/'+script,...args],{cwd:REPO_ROOT,env:process.env,encoding:'utf8',timeout:60000});assert.equal(r.status,expected,r.stderr||r.error?.message);checks++;return r.stdout;};
 for(const cmd of [...Object.keys(reads),'insights']){JSON.parse(cli('surveys.mjs',[cmd,'--json']));}
 cli('surveys.mjs',['response','alex'],1);cli('surveys.mjs',['scorecards','--oops'],1);cli('surveys.mjs',['import','salesforce','--file='+csvFile,'--map='+mapFile,'--actor=Test','--dry-run=false'],1);
 const dryCsv=write('dry.csv',csv.replace('EXPORT-1','DRY-1').replace('EXPORT-2','DRY-2'));
 const dry=JSON.parse(cli('surveys.mjs',['import','salesforce','--file='+dryCsv,'--map='+mapFile,'--actor=Test','--dry-run','--json']));ok(dry.dry_run&&dry.imported===2,'CLI dry run');
 ok(!JSON.parse(cli('surveys.mjs',['responses','--json'])).some(x=>x.source_id==='DRY-1'),'dry run leaves no rows');
 cli('view.mjs');cli('docs.mjs');
 ok(fs.readFileSync(path.join(tmp,'views/week.html'),'utf8').includes('Scores by segment'),'HTML view');
 const paper=fs.readdirSync(path.join(tmp,'docs-out/follow-up-paper')).find(x=>x.startsWith('test-1'));
 const html=fs.readFileSync(path.join(tmp,'docs-out/follow-up-paper',paper),'utf8');ok(html.includes('&lt;script&gt;')&&!html.includes('<script>'),'HTML escaping');
 console.log(`PASS: ${checks} checks; every read, mutation, import, export, draft and renderer; ${process.env.TEST_DATABASE_URL?'PostgreSQL':'PGlite'}`);
}finally{
 if(db)await db.close();
 if(process.env.TEST_DATABASE_URL){delete process.env.PGOPTIONS;const cleanup=await getDb();try{await cleanup.exec(`drop schema if exists ${schema} cascade`);}finally{await cleanup.close();}}
 fs.rmSync(tmp,{recursive:true,force:true});
}
