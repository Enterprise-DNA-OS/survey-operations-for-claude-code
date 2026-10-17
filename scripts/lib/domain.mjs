import fs from 'node:fs';
import path from 'node:path';
import {REPO_ROOT} from './db.mjs';
import {table} from './format.mjs';
export const tables=['surveys','questions','responses','answers','actions','notes','audit_events'];
export const reads={
 surveys:'select code,name,owner,purpose,retention_days from surveys order by code',
 questions:'select s.code survey,q.code,q.name,q.kind from questions q join surveys s on s.id=q.survey_id order by s.code,q.code',
 responses:'select r.id,r.source_id,s.code survey,r.respondent,r.segment,r.received_on,r.review_due from responses r join surveys s on s.id=r.survey_id order by r.received_on desc,r.source_id',
 scorecards:'select * from scorecards order by survey,question,segment',
 detractors:'select * from detractor_queue order by received_on,source_id',
 'follow-ups':'select * from action_queue order by due_on,source_id',
 attention:"select 'Overdue action' issue,source_id,owner,due_on due from action_queue where days_overdue>0 union all select 'Retention review',source_id,respondent,review_due from privacy_queue where retention_review_due order by due,source_id",
 compliance:'select * from privacy_queue order by review_due,source_id',
 coverage:`select s.code survey,count(distinct r.id)::integer responses,count(a.id)::integer answers,
 (select count(*)::integer from questions q where q.survey_id=s.id) questions_per_response
 from surveys s left join responses r on r.survey_id=s.id left join answers a on a.response_id=r.id group by s.id order by s.code`,
 comments:"select r.source_id,r.segment,q.name question,a.answer_text from answers a join questions q on q.id=a.question_id join responses r on r.id=a.response_id where q.kind='text' order by r.received_on,r.source_id",
 workload:'select owner,count(*)::integer open_actions,count(*) filter(where days_overdue>0)::integer overdue,min(due_on) next_due from action_queue group by owner order by owner',
 history:'select actor,event,record_id,detail,created_at from audit_events order by created_at,id'
};
export const questions=[
 ['Which survey segments have the lowest recommendation scores?','select * from scorecards where kind=\'nps\' order by nps,survey,segment'],
 ['Which low recommendation scores have no follow-up action?','select source_id,survey,respondent,lowest_nps from detractor_queue where open_actions=0 order by source_id'],
 ['Which owners have overdue follow-ups?',reads.workload],
 ['Which overdue actions belong to low-scoring responses?',`select a.source_id,a.owner,a.title,a.days_overdue,d.lowest_nps from action_queue a join actions x on x.id=a.id join detractor_queue d on d.id=x.response_id where a.days_overdue>0 order by source_id`],
 ['Which response records need a retention review?','select source_id,survey,review_due from privacy_queue where retention_review_due order by review_due'],
 ['Which responses have not had an accuracy check?','select source_id,survey,respondent from privacy_queue where accuracy_check_missing order by source_id'],
 ['Which questions have missing answers?',`select s.code survey,q.code question,count(r.id)::integer missing from questions q join surveys s on s.id=q.survey_id join responses r on r.survey_id=q.survey_id left join answers a on a.response_id=r.id and a.question_id=q.id where a.id is null group by s.code,q.code order by survey,question`],
 ['Which segments have the lowest satisfaction percentage?',"select * from scorecards where kind='csat' order by csat_percent,survey,segment"],
 ['Which resolved follow-ups have evidence?',"select r.source_id,a.title,a.owner,a.closed_on,a.outcome,a.evidence from actions a join responses r on r.id=a.response_id where a.status='closed' order by a.closed_on"],
 ['Which comments accompany low recommendation scores?',"select r.source_id,r.segment,a.answer_text from answers a join questions q on q.id=a.question_id join responses r on r.id=a.response_id join detractor_queue d on d.id=r.id where q.kind='text' order by r.source_id"]
];
export function text(value,label){if(typeof value!=='string'||!value.trim())throw Error(label+' is required');return value.trim();}
export function integer(v,label,min,max){if(!/^\d+$/.test(String(v)))throw Error(label+' must be an integer');const n=Number(v);if(n<min||n>max)throw Error(label+' out of range');return n;}
export function date(v,label){text(v,label);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(label+' must be a valid YYYY-MM-DD');return v;}
export const today=()=>new Date().toISOString().slice(0,10);
export function pastDate(v,label){date(v,label);if(v>today())throw Error(label+' cannot be in the future');return v;}
export function keys(obj,allowed){for(const k of Object.keys(obj))if(!allowed.includes(k))throw Error('Unknown field '+k);}
export function human(v){if(Array.isArray(v)){if(!v.length)return '(none)';return table(v,Object.keys(v[0]).map(key=>({key,label:key,format:x=>x==null?'':typeof x==='object'?JSON.stringify(x):x})));}if(v&&typeof v==='object')return Object.entries(v).map(([k,x])=>k+'\n'+(typeof x==='object'?human(x):x)).join('\n\n');return String(v);}
export async function resolve(db,kind,term){
 const fields={surveys:['code','name'],questions:['code','name'],responses:['source_id','respondent'],actions:['title']}[kind];
 if(!fields)throw Error('Unsupported record type');text(term,'Record');
 const all=await db.query(`select * from ${kind} order by id`),needle=term.toLowerCase();
 let found=all.filter(r=>r.id===term||fields.some(k=>String(r[k]).toLowerCase()===needle));
 if(!found.length)found=all.filter(r=>r.id.startsWith(needle)||fields.some(k=>String(r[k]).toLowerCase().includes(needle)));
 if(found.length!==1)throw Error((found.length?'Ambiguous record. Choose an id:':'No matching record. Available records:')+'\n'+human((found.length?found:all).map(r=>({id:r.id,name:r[fields[0]],description:r[fields.at(-1)]}))));
 return found[0];
}
export async function audit(db,actor,event,id,detail){await db.query('insert into audit_events(actor,event,record_id,detail) values($1,$2,$3,$4)',[text(actor,'actor'),event,id,JSON.stringify(detail)]);}
export async function insert(db,kind,obj){const cols=Object.keys(obj);return (await db.query(`insert into ${kind}(${cols.join(',')}) values(${cols.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(obj)))[0];}
export async function add(db,kind,d,actor){
 let row;
 if(kind==='survey'){
  keys(d,['code','name','owner','purpose','retention_days']);row=await insert(db,'surveys',{code:text(d.code,'code'),name:text(d.name,'name'),owner:text(d.owner,'owner'),purpose:text(d.purpose,'purpose'),retention_days:integer(d.retention_days,'retention_days',1,3650)});
 }else if(kind==='question'){
  keys(d,['survey','code','name','kind']);const s=await resolve(db,'surveys',d.survey);if(!['nps','csat','text'].includes(d.kind))throw Error('kind must be nps, csat or text');
  row=await insert(db,'questions',{survey_id:s.id,code:text(d.code,'code'),name:text(d.name,'name'),kind:d.kind});
 }else if(kind==='response'){
  keys(d,['survey','source_id','respondent','segment','received_on','review_due']);const s=await resolve(db,'surveys',d.survey);
  const received=pastDate(d.received_on,'received_on'),due=date(d.review_due,'review_due');if(due<received)throw Error('review_due precedes receipt');
  row=await insert(db,'responses',{survey_id:s.id,source_id:text(d.source_id,'source_id'),respondent:text(d.respondent,'respondent'),segment:text(d.segment,'segment'),received_on:received,review_due:due});
 }else if(kind==='answer'){
  keys(d,['response','question','score','answer_text']);const r=await resolve(db,'responses',d.response);
  const q=(await db.query('select * from questions where survey_id=$1 and code=$2',[r.survey_id,text(d.question,'question')]))[0];if(!q)throw Error('Question not in response survey');
  if(q.kind==='text'&&d.score!=null)throw Error('Text answers have no numeric score');
  row=await insert(db,'answers',{survey_id:r.survey_id,response_id:r.id,question_id:q.id,score:q.kind==='text'?null:integer(d.score,'score',q.kind==='nps'?0:1,q.kind==='nps'?10:5),answer_text:q.kind==='text'?text(d.answer_text,'answer_text'):''});
 }else if(kind==='action'){
  keys(d,['response','title','owner','due_on']);const r=await resolve(db,'responses',d.response);
  row=await insert(db,'actions',{response_id:r.id,title:text(d.title,'title'),owner:text(d.owner,'owner'),due_on:date(d.due_on,'due_on')});
 }else throw Error('add requires survey, question, response, answer or action');
 await audit(db,actor,'add '+kind,row.id,d);return row;
}
export async function response(db,term){const r=await resolve(db,'responses',term);return {response:[r],answers:await db.query('select q.code,q.name,q.kind,a.score,a.answer_text from answers a join questions q on q.id=a.question_id where a.response_id=$1 order by q.code',[r.id]),actions:await db.query('select * from actions where response_id=$1 order by due_on',[r.id]),notes:await db.query('select actor,body,created_at from notes where response_id=$1 order by created_at',[r.id])};}
export const mutations=['add','log','verify-response','review-retention','close-action'];
export async function run(db,cmd,term,f={}){
 if(reads[cmd]){if(term)throw Error('This read takes no record argument');return db.query(reads[cmd]);}
 if(cmd==='response')return response(db,term);
 if(cmd==='insights'){const out={};for(const [q,sql]of questions)out[q]=await db.query(sql);return out;}
 if(cmd==='add')return add(db,term,JSON.parse(fs.readFileSync(text(f.file,'file'),'utf8')),text(f.actor,'actor'));
 if(mutations.includes(cmd)){
  const actor=text(f.actor,'actor'),kind=cmd==='close-action'?'actions':'responses';const r=await resolve(db,kind,term);let result;
  if(cmd==='log')result=await insert(db,'notes',{response_id:r.id,actor,body:text(f.note,'note')});
  if(cmd==='verify-response'){const checked=pastDate(f.checked,'checked');if(checked<r.received_on)throw Error('Check predates response');result=(await db.query('update responses set verified_on=$1,verification_reference=$2 where id=$3 returning *',[checked,text(f.reference,'reference'),r.id]))[0];}
  if(cmd==='review-retention'){const due=date(f.due,'due');if(due<=today())throw Error('Next review must be in the future');result=(await db.query('update responses set review_due=$1 where id=$2 returning *',[due,r.id]))[0];text(f.reason,'reason');}
  if(cmd==='close-action'){
   if(r.status!=='open')throw Error('Action already closed');const checked=pastDate(f.closed,'closed');
   const rr=(await db.query('select * from responses where id=$1',[r.response_id]))[0];
   if(!rr.verified_on||rr.review_due<today())throw Error('Verify response accuracy and review retention before closing');
   if(checked<rr.received_on)throw Error('Closure predates response');
   result=(await db.query("update actions set status='closed',closed_on=$1,outcome=$2,evidence=$3 where id=$4 returning *",[checked,text(f.outcome,'outcome'),text(f.evidence,'evidence'),r.id]))[0];
  }
  await audit(db,actor,cmd,r.id,f);return result;
 }
 if(cmd==='export'){const out={version:1,exported_at:new Date().toISOString()};for(const t of tables)out[t]=await db.query(`select * from ${t} order by id`);if(f.out){fs.writeFileSync(f.out,JSON.stringify(out,null,2)+'\n',{flag:'wx'});return {file:f.out,counts:Object.fromEntries(tables.map(t=>[t,out[t].length]))};}return out;}
 if(['weekly-review','draft-follow-up'].includes(cmd)){
  let body;
  if(cmd==='weekly-review'){body='# Weekly survey review\n\nDraft for internal review.\n';for(const c of ['scorecards','follow-ups','compliance'])body+='\n## '+c+'\n\n'+human(await db.query(reads[c]))+'\n';}
  else{const detail=await response(db,term),r=detail.response[0];if(!r.verified_on||r.review_due<today())throw Error('Verify response accuracy and review retention before drafting');body='# Follow-up working note\n\nDraft only. Confirm recipient and wording before use. No message has been sent.\n\n'+human(detail);}
  const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,cmd+'-'+Date.now()+'.md');fs.writeFileSync(file,body,{flag:'wx'});return {file,body};
 }
 throw Error('Unknown command '+cmd);
}
