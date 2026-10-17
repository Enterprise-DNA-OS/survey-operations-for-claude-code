import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseCsv} from './csv.mjs';
import {add,audit,text,keys,integer,pastDate} from './domain.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export async function importSalesforce(db,file,mapFile,actor){
 text(actor,'actor');const m=JSON.parse(fs.readFileSync(text(mapFile,'map'),'utf8'));
 keys(m,['survey','columns','questions']);keys(m.columns,['response_id','received_on','respondent','segment']);
 if(!Array.isArray(m.questions)||!m.questions.length)throw Error('Mapping requires questions');
 for(const q of m.questions){keys(q,['code','name','kind','column']);text(q.column,'question column');}
 if(new Set(m.questions.map(q=>q.code)).size!==m.questions.length||new Set(m.questions.map(q=>q.column)).size!==m.questions.length)throw Error('Duplicate question code or column');
 text(m.columns.response_id,'response_id column');text(m.columns.received_on,'received_on column');
 const rows=parseCsv(fs.readFileSync(text(file,'file'),'utf8'));if(!rows.length)throw Error('No response rows');
 const required=[...Object.values(m.columns),...m.questions.map(q=>q.column)];
 for(const h of required)if(!Object.hasOwn(rows[0],h))throw Error('Missing mapped column '+h);
 let s=(await db.query('select * from surveys where code=$1',[text(m.survey.code,'survey code')]))[0];
 if(!s)s=await add(db,'survey',m.survey,actor);
 else for(const [k,v]of Object.entries(m.survey))if(s[k]!==v)throw Error('Survey definition changed: '+k);
 for(const q of m.questions){const existing=(await db.query('select * from questions where survey_id=$1 and code=$2',[s.id,q.code]))[0];
  if(!existing)await add(db,'question',{survey:s.id,code:q.code,name:q.name,kind:q.kind},actor);
  else if(existing.name!==q.name||existing.kind!==q.kind)throw Error('Question definition changed: '+q.code);
 }
 let imported=0,unchanged=0;const seen=new Set();
 for(const row of rows){
  const source=text(row[m.columns.response_id],'response id');if(seen.has(source))throw Error('Duplicate response id in file '+source);seen.add(source);
  const sourceHash=hash({row,mapping:m});
  const existing=(await db.query('select * from responses where survey_id=$1 and source_id=$2',[s.id,source]))[0];
  if(existing){if(existing.source_hash!==sourceHash)throw Error('Changed source row or mapping '+source+'; reconcile explicitly');unchanged++;continue;}
  const received=pastDate(row[m.columns.received_on],'received_on'),d=new Date(received);d.setUTCDate(d.getUTCDate()+integer(s.retention_days,'retention_days',1,3650));
  const r=await add(db,'response',{survey:s.id,source_id:source,respondent:m.columns.respondent?text(row[m.columns.respondent],'respondent'):'Anonymous',segment:m.columns.segment?text(row[m.columns.segment],'segment'):'Unassigned',received_on:received,review_due:d.toISOString().slice(0,10)},actor);
  await db.query('update responses set source_row=$1,source_hash=$2 where id=$3',[JSON.stringify(row),sourceHash,r.id]);
  for(const q of m.questions){const value=row[q.column];if(value.trim()==='')continue;await add(db,'answer',{response:r.id,question:q.code,...(q.kind==='text'?{answer_text:value}:{score:value})},actor);}
  imported++;
 }
 await audit(db,actor,'import salesforce',s.id,{imported,unchanged,rows:rows.length});return {survey:s.code,imported,unchanged,rows:rows.length};
}
