#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

export const specs={
 departments:[0,[],'Read departments'], faculty:[0,[],'Read academic staff and review dates'], cycles:[0,[],'Read reporting periods'],
 activities:[0,[],'Read the complete activity register'], teaching:[0,[],'Review teaching activities'], research:[0,[],'Review research outputs'], service:[0,[],'Review service contributions'],
 'annual-returns':[0,[],'Review annual return status'], 'returns-due':[0,[],'Find draft returns past their deadline'], 'evidence-gaps':[0,[],'Find missing or unverified evidence'],
 'department-review':[0,[],'Read completion by department'], compliance:[0,[],'Check privacy records and local deadlines'], attention:[0,[],'Review overdue returns and evidence gaps'],
 insights:[0,[],'Answer ten joined activity questions'], 'weekly-review':[0,[],'Combine return deadlines, evidence and compliance'],
 history:[1,[],'Read one academic and their activity, return and note history'], audit:[0,[],'Read the operator trail'], imports:[0,[],'Reconcile imported batches'],
 'add-department':[2,[],'Add CODE NAME'], 'add-faculty':[3,['role','purpose','review','review-evidence','notice','notice-evidence'],'Add CODE NAME DEPARTMENT'],
 'add-cycle':[2,['start','end','due'],'Add CODE NAME and reporting dates'], 'open-return':[2,[],'Open FACULTY CYCLE annual return'],
 'add-activity':[4,['kind','date','hours','reference','evidence'],'Add CODE FACULTY CYCLE TITLE'],
 'update-activity':[1,['title','date','hours','reference','evidence'],'Revise ACTIVITY and clear verification'],
 'verify-activity':[1,[],'Verify ACTIVITY against its recorded evidence'], 'withdraw-activity':[1,['reason'],'Withdraw ACTIVITY with a reason'],
 'submit-return':[2,['declaration'],'Submit FACULTY CYCLE with a frozen copy'], 'approve-return':[2,['reason'],'Approve FACULTY CYCLE after human review'],
 'reopen-return':[2,['reason'],'Reopen FACULTY CYCLE for correction'], 'review-privacy':[1,['purpose','review','review-evidence','notice','notice-evidence'],'Review FACULTY purpose, retention and notice'],
 log:[1,['note'],'Add an operational note for FACULTY'], import:[2,['mapping','batch','dry-run'],'Import interfolio DIRECTORY mapped CSV exports'],
 export:[0,[],'Export all records as structured JSON'], 'draft-reminders':[0,[],'Draft overdue-return reminders without sending']
};
const reads={
 departments:'SELECT code,name,id FROM departments ORDER BY code',
 faculty:'SELECT f.code,f.name,d.name department,f.role,f.active,f.review_on FROM faculty f JOIN departments d ON d.id=f.department_id ORDER BY f.code',
 cycles:'SELECT code,name,starts_on,ends_on,due_on FROM cycles ORDER BY starts_on',
 activities:'SELECT code,faculty,cycle,kind,title,occurred_on,hours,state FROM activity_register ORDER BY code',
 teaching:"SELECT code,faculty,cycle,title,occurred_on,hours,state FROM activity_register WHERE kind='teaching' AND state<>'withdrawn' ORDER BY code",
 research:"SELECT code,faculty,cycle,title,reference,evidence,state FROM activity_register WHERE kind='research' AND state<>'withdrawn' ORDER BY code",
 service:"SELECT code,faculty,cycle,title,occurred_on,hours,state FROM activity_register WHERE kind='service' AND state<>'withdrawn' ORDER BY code",
 'annual-returns':'SELECT faculty_code,faculty,cycle,state,activities,unverified,missing_evidence,due_on FROM return_register ORDER BY faculty_code,cycle',
 'returns-due':"SELECT faculty_code,faculty,cycle,due_on,overdue_days,unverified FROM return_register WHERE state='draft' AND due_on<current_date ORDER BY due_on,faculty_code",
 'evidence-gaps':"SELECT code,faculty,kind,title,CASE WHEN evidence='' THEN 'Missing evidence' ELSE 'Needs verification' END issue FROM activity_register WHERE state='draft' ORDER BY code",
 'department-review':'SELECT * FROM department_summary ORDER BY department,cycle',
 compliance:'SELECT record_code,rule,issue,source FROM compliance_findings ORDER BY rule,record_code',
 audit:'SELECT action,actor,record_type,record_id,reason,created_at FROM audit ORDER BY created_at,id',
 imports:'SELECT batch_key,content_hash,counts,actor,created_at FROM import_batches ORDER BY created_at,id'
};
export const questions=[
 ['late_evidence','Which overdue returns also have missing activity evidence?',"SELECT faculty,cycle,overdue_days,missing_evidence FROM return_register WHERE state='draft' AND overdue_days>0 AND missing_evidence>0 ORDER BY faculty"],
 ['shared_reference','Which research references appear under more than one academic?',"SELECT reference,count(DISTINCT faculty_id)::integer academics,string_agg(DISTINCT title,'; ' ORDER BY title) titles FROM activities WHERE kind='research' AND state<>'withdrawn' AND reference<>'' GROUP BY reference HAVING count(DISTINCT faculty_id)>1 ORDER BY reference"],
 ['unverified_teaching','Which departments have teaching records still awaiting verification?',"SELECT department,count(*)::integer pending FROM activity_register WHERE kind='teaching' AND state='draft' GROUP BY department ORDER BY department"],
 ['no_research','Which returns contain teaching but no recorded research?',"SELECT r.faculty,r.cycle FROM return_register r WHERE EXISTS(SELECT 1 FROM activity_register a WHERE a.faculty_code=r.faculty_code AND a.cycle=r.cycle AND a.kind='teaching' AND a.state<>'withdrawn') AND NOT EXISTS(SELECT 1 FROM activity_register a WHERE a.faculty_code=r.faculty_code AND a.cycle=r.cycle AND a.kind='research' AND a.state<>'withdrawn') ORDER BY r.faculty"],
 ['empty_returns','Who has an open return with no recorded activities?',"SELECT faculty,cycle,due_on,no_activity_reason FROM return_register WHERE state='draft' AND activities=0 ORDER BY faculty"],
 ['privacy_due','Which academics with overdue returns also need a retention review?',"SELECT r.faculty,r.cycle,f.review_on FROM return_register r JOIN faculty f ON f.code=r.faculty_code WHERE r.state='draft' AND r.overdue_days>0 AND (f.review_on IS NULL OR f.review_on<current_date OR f.review_evidence='') ORDER BY r.faculty"],
 ['ready_to_submit','Which draft returns have verified activities and no privacy findings?',"SELECT r.faculty,r.cycle,r.activities FROM return_register r JOIN faculty f ON f.code=r.faculty_code WHERE r.state='draft' AND r.activities>0 AND r.unverified=0 AND NOT EXISTS(SELECT 1 FROM compliance_findings c WHERE c.record_id=f.id) ORDER BY r.faculty"],
 ['service_hours','How much recorded service time sits in each department and cycle?',"SELECT department,cycle,sum(hours) recorded_hours,count(*)::integer contributions FROM activity_register WHERE kind='service' AND state<>'withdrawn' GROUP BY department,cycle ORDER BY department,cycle"],
 ['review_queue','Which submitted returns are waiting for coordinator approval?',"SELECT faculty,cycle,activities,submitted_at FROM return_register WHERE state='submitted' ORDER BY submitted_at,faculty"],
 ['completion','Which departments have the most unfinished annual returns?',"SELECT department,cycle,draft,awaiting_review,approved,missing_evidence FROM department_summary ORDER BY draft DESC,awaiting_review DESC,department"]
];
const entities={departments:['code','name'],faculty:['code','name'],cycles:['code','name'],activities:['code','title']};
function need(v,n){if(typeof v!=='string'||!v.trim())throw Error(`${n} is required`);return v.trim();}
function date(v,n){need(v,n);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`${n} must be a real YYYY-MM-DD date`);return v;}
function hours(v='0'){if(!/^\d+(\.\d{1,2})?$/.test(String(v))||Number(v)>9999999999)throw Error('hours must be a nonnegative number with at most two decimals');return v;}
function parse(argv){let positional=[],o={};for(const arg of argv){if(arg.startsWith('--')){let [k,...v]=arg.slice(2).split('=');if(k in o)throw Error(`Duplicate option --${k}`);o[k]=v.length?v.join('='):true;}else positional.push(arg);}const c=positional.shift();return {c,p:positional,o};}
async function resolve(db,t,s){need(s,t);let [code,name]=entities[t];let exact=await db.query(`SELECT * FROM ${t} WHERE lower(${code})=lower($1) OR id::text=$1`,[s]);if(exact.length===1)return exact[0];let rows=await db.query(`SELECT * FROM ${t} WHERE starts_with(lower(id::text),lower($1)) OR strpos(lower(${name}),lower($1))>0 ORDER BY ${code}`,[s]);if(rows.length!==1)throw Error(rows.length?`Ambiguous ${t}: ${rows.map(r=>r[code]+' '+r[name]).join('; ')}`:`Not found in ${t}: ${s}`);return rows[0];}
async function audit(db,action,actor,t,before,after,reason=''){await db.query('INSERT INTO audit(action,actor,record_type,record_id,reason,before_record,after_record) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)',[action,actor,t,after?.id||before?.id||null,reason,before?JSON.stringify(before):null,after?JSON.stringify(after):null]);}
async function insert(db,t,data,actor,action='add'){const keys=Object.keys(data);const rows=await db.query(`INSERT INTO ${t}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,Object.values(data));await audit(db,action,actor,t,null,rows[0]);return rows[0];}
async function update(db,t,before,data,actor,action,reason=''){const keys=Object.keys(data);const row=(await db.query(`UPDATE ${t} SET ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')} WHERE id=$${keys.length+1} RETURNING *`,[...Object.values(data),before.id]))[0];await audit(db,action,actor,t,before,row,reason);return row;}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{await db.exec('LOCK TABLE departments,faculty,cycles,annual_returns,activities,notes,import_batches,audit IN SHARE ROW EXCLUSIVE MODE');const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function getReturn(db,f,c,create=false,actor){let r=(await db.query('SELECT * FROM annual_returns WHERE faculty_id=$1 AND cycle_id=$2',[f.id,c.id]))[0];if(!r&&create)r=await insert(db,'annual_returns',{faculty_id:f.id,cycle_id:c.id},actor,'open-return');if(!r)throw Error('Annual return not open');return r;}
async function editable(db,a){let r=(await db.query('SELECT state FROM annual_returns WHERE faculty_id=$1 AND cycle_id=$2',[a.faculty_id,a.cycle_id]))[0];if(r?.state!=='draft')throw Error('Reopen the annual return before changing activities');}
async function addFaculty(db,p,o,actor){const d=await resolve(db,'departments',p[2]);return insert(db,'faculty',{code:need(p[0],'code'),name:need(p[1],'name'),department_id:d.id,role:o.role||'Academic',purpose:o.purpose||'',review_on:o.review?date(o.review,'review'):null,review_evidence:o['review-evidence']||'',notification_basis:o.notice||'',notification_evidence:o['notice-evidence']||''},actor);}
async function addActivity(db,p,o,actor){const f=await resolve(db,'faculty',p[1]),c=await resolve(db,'cycles',p[2]);if(!f.active)throw Error('Academic is inactive');let r=await getReturn(db,f,c,true,actor);if(r.state!=='draft')throw Error('Reopen the annual return before changing activities');if(!['teaching','research','service'].includes(o.kind))throw Error('kind must be teaching, research or service');const on=date(o.date,'date');if(on<c.starts_on||on>c.ends_on)throw Error('Activity date outside reporting cycle');return insert(db,'activities',{code:need(p[0],'code'),faculty_id:f.id,cycle_id:c.id,title:need(p[3],'title'),kind:o.kind,occurred_on:on,hours:hours(o.hours),reference:o.reference||'',evidence:o.evidence||''},actor);}
function privateFile(folder,stem,data){const root=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,folder);fs.mkdirSync(root,{recursive:true,mode:0o700});const file=path.join(root,`${stem}-${randomUUID()}.json`);fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});return file;}

async function importFiles(db,dir,o,actor){
 need(o.batch,'--batch');const map=o.mapping?JSON.parse(fs.readFileSync(path.resolve(o.mapping),'utf8')):{};
 if(Object.keys(map).some(k=>!['departments','faculty','cycles','activities'].includes(k)))throw Error('Unknown mapping section');
 const validFields={departments:['code','name'],faculty:['code','name','department','role','purpose','review_on','review_evidence','notification_basis','notification_evidence'],cycles:['code','name','starts_on','ends_on','due_on'],activities:['code','faculty','cycle','kind','title','occurred_on','hours','reference','evidence']};
 for(const [section,mapping] of Object.entries(map)){if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')throw Error('Mapping section must be an object: '+section);for(const key of Object.keys(mapping))if(!validFields[section].includes(key))throw Error('Unknown mapping field: '+section+'.'+key);}
 const files=[];for(const t of ['departments','faculty','cycles','activities']){const file=path.join(path.resolve(dir),`${t}.csv`);if(fs.existsSync(file))files.push([t,fs.readFileSync(file,'utf8')]);}
 if(!files.length)throw Error('No departments.csv, faculty.csv, cycles.csv or activities.csv files found');
 const hash=createHash('sha256').update(JSON.stringify({files,map})).digest('hex');
 const prev=(await db.query('SELECT * FROM import_batches WHERE batch_key=$1 OR content_hash=$2',[o.batch,hash]))[0];
 if(prev){if(prev.batch_key===o.batch&&prev.content_hash!==hash)throw Error('Batch key has different content');return [{batch:prev.batch_key,replayed:true,counts:prev.counts}];}
 const counts={};
 for(const [t,text] of files){const rows=parseCsv(text);if(!rows.length)throw Error(`${t}.csv has no data rows`);const mappings=map[t]||{};
  for(const source of Object.values(mappings))if(typeof source!=='string'||!Object.hasOwn(rows[0],source))throw Error(`${t}.csv mapped header missing: ${source}`);
  counts[t]=0;
  for(const [i,row] of rows.entries()){
   const get=k=>row[mappings[k]||k]??'';
   try{
    if(t==='departments')await insert(db,t,{code:need(get('code'),'code'),name:need(get('name'),'name')},actor,'import');
    if(t==='faculty')await addFaculty(db,[get('code'),get('name'),get('department')],{role:get('role'),purpose:get('purpose'),review:get('review_on'),'review-evidence':get('review_evidence'),notice:get('notification_basis'),'notice-evidence':get('notification_evidence')},actor);
    if(t==='cycles')await insert(db,t,{code:need(get('code'),'code'),name:need(get('name'),'name'),starts_on:date(get('starts_on'),'starts_on'),ends_on:date(get('ends_on'),'ends_on'),due_on:date(get('due_on'),'due_on')},actor,'import');
    if(t==='activities')await addActivity(db,[get('code'),get('faculty'),get('cycle'),get('title')],{kind:get('kind'),date:get('occurred_on'),hours:get('hours')||'0',reference:get('reference'),evidence:get('evidence')},actor);
    counts[t]++;
   }catch(e){throw Error(`${t}.csv row ${i+2}: ${e.message}`);}
  }
 }
 await insert(db,'import_batches',{batch_key:o.batch,content_hash:hash,counts:JSON.stringify(counts),actor},actor,'import-batch');
 return [{batch:o.batch,dry_run:!!o['dry-run'],counts}];
}

export async function execute(db,argv){
 const {c,p,o}=parse(argv);
 if(c==='--help'||c==='help'||!c)return Object.entries(specs).map(([command,[,options,job]])=>({command,job,options:options.join(', ')}));
 if(!specs[c])throw Error(`Unknown command ${c}`);
 const [n,allowed]=specs[c];if(p.length!==n)throw Error(`${c}: expected ${n} positional arguments; ${specs[c][2]}`);
 for(const [k,v] of Object.entries(o)){if(!['json','actor',...allowed].includes(k))throw Error(`Unknown option --${k}`);if(!['json','dry-run'].includes(k)&&typeof v!=='string')throw Error(`--${k} needs a value`);if(['json','dry-run'].includes(k)&&v!==true)throw Error(`--${k} is a flag`);}
 if(reads[c])return db.query(reads[c]);
 if(c==='insights'){const out={};for(const [key,,sql] of questions)out[key]=await db.query(sql);return out;}
 if(c==='attention'||c==='weekly-review')return {returns_due:await db.query(reads['returns-due']),evidence_gaps:await db.query(reads['evidence-gaps']),compliance:await db.query(reads.compliance)};
 if(c==='history'){const f=await resolve(db,'faculty',p[0]);return {faculty:[f],activities:await db.query('SELECT * FROM activity_register WHERE faculty_code=$1 ORDER BY code',[f.code]),returns:await db.query('SELECT * FROM annual_returns WHERE faculty_id=$1 ORDER BY created_at',[f.id]),notes:await db.query('SELECT body,actor,created_at FROM notes WHERE faculty_id=$1 ORDER BY created_at',[f.id]),audit:await db.query("SELECT * FROM audit WHERE record_id=$1 OR record_id IN(SELECT id FROM activities WHERE faculty_id=$1 UNION SELECT id FROM annual_returns WHERE faculty_id=$1) ORDER BY created_at,id",[f.id])};}
 if(c==='export'){
  const data={};await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{for(const t of ['departments','faculty','cycles','annual_returns','activities','notes','import_batches','audit','schema_migrations'])data[t]=await db.query(`SELECT * FROM ${t}`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  return [{file:privateFile('exports','faculty-export',{format:'faculty-activity/v1',exported_at:new Date().toISOString(),data}),counts:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length]))}];
 }
 if(c==='draft-reminders'){const rows=await db.query(reads['returns-due']);return [{file:privateFile('drafts','return-reminders',{status:'DRAFT - not sent',reminders:rows.map(r=>({faculty:r.faculty,cycle:r.cycle,message:`Please review your ${r.cycle} activity return. The recorded deadline was ${r.due_on}; ${r.unverified} activities still need verification.`}))}),count:rows.length}];}
 const actor=need(o.actor,'--actor');
 return transaction(db,async()=>{
  if(c==='add-department')return [await insert(db,'departments',{code:need(p[0],'code'),name:need(p[1],'name')},actor)];
  if(c==='add-faculty')return [await addFaculty(db,p,o,actor)];
  if(c==='add-cycle')return [await insert(db,'cycles',{code:need(p[0],'code'),name:need(p[1],'name'),starts_on:date(o.start,'start'),ends_on:date(o.end,'end'),due_on:date(o.due,'due')},actor)];
  if(c==='open-return'){const f=await resolve(db,'faculty',p[0]),cy=await resolve(db,'cycles',p[1]);return [await getReturn(db,f,cy,true,actor)];}
  if(c==='add-activity')return [await addActivity(db,p,o,actor)];
  if(['update-activity','verify-activity','withdraw-activity'].includes(c)){
   const a=await resolve(db,'activities',p[0]);await editable(db,a);if(a.state==='withdrawn')throw Error('Activity is withdrawn; add a corrected record');
   let data={};
   if(c==='update-activity'){
    const fields={title:'title',date:'occurred_on',hours:'hours',reference:'reference',evidence:'evidence'};
    for(const [k,v] of Object.entries(fields))if(k in o)data[v]=k==='date'?date(o[k],k):k==='hours'?hours(o[k]):k==='title'?need(o[k],k):o[k];
    if(!Object.keys(data).length)throw Error('Supply at least one activity field to update');data={...data,state:'draft',verified_at:null,verified_by:null};
   }else if(c==='verify-activity'){need(a.evidence,'activity evidence');if(a.state==='verified')throw Error('Activity already verified');data={state:'verified',verified_by:actor,verified_at:new Date().toISOString()};}
   else{need(o.reason,'reason');data={state:'withdrawn',verified_at:null,verified_by:null};}
   return [await update(db,'activities',a,data,actor,c,o.reason||'')];
  }
  if(['submit-return','approve-return','reopen-return'].includes(c)){
   const f=await resolve(db,'faculty',p[0]),cy=await resolve(db,'cycles',p[1]),r=await getReturn(db,f,cy);let data;
   if(c==='submit-return'){
    if(r.state!=='draft')throw Error('Only a draft return can be submitted');
    const issues=await db.query('SELECT rule FROM compliance_findings WHERE record_id=$1',[f.id]);if(issues.length)throw Error('Resolve privacy review: '+issues.map(x=>x.rule).join(', '));
    const activities=await db.query("SELECT * FROM activities WHERE faculty_id=$1 AND cycle_id=$2 AND state<>'withdrawn' ORDER BY code",[f.id,cy.id]);
    if(activities.some(a=>a.state!=='verified'))throw Error('Verify all included activity evidence before submitting');
    if(!activities.length)need(o.declaration,'--declaration for a return with no activities');
    data={state:'submitted',submitted_at:new Date().toISOString(),no_activity_reason:o.declaration||'',snapshot:JSON.stringify({faculty:f,cycle:cy,activities,declaration:o.declaration||''})};
   }else if(c==='approve-return'){
    if(r.state!=='submitted')throw Error('Only a submitted return can be approved');need(o.reason,'review reason');data={state:'approved',approved_at:new Date().toISOString(),approved_by:actor};
   }else{
    if(r.state==='draft')throw Error('Return is already draft');need(o.reason,'reason');data={state:'draft',submitted_at:null,approved_at:null,approved_by:null,snapshot:null,no_activity_reason:''};
   }
   return [await update(db,'annual_returns',r,data,actor,c,o.reason||'')];
  }
  if(c==='review-privacy'){
   const f=await resolve(db,'faculty',p[0]);const review=date(o.review,'review');const today=(await db.query('SELECT current_date AS d'))[0].d;if(review<today)throw Error('review must be today or later');
   return [await update(db,'faculty',f,{purpose:need(o.purpose,'purpose'),review_on:review,review_evidence:need(o['review-evidence'],'review-evidence'),notification_basis:need(o.notice,'notice or exception basis'),notification_evidence:need(o['notice-evidence'],'notice-evidence')},actor,c)];
  }
  if(c==='log'){const f=await resolve(db,'faculty',p[0]);return [await insert(db,'notes',{faculty_id:f.id,body:need(o.note,'note'),actor},actor,'log')];}
  if(c==='import'){if(p[0]!=='interfolio')throw Error('Import source must be interfolio');return importFiles(db,p[1],o,actor);}
  throw Error('Unhandled command '+c);
 },!!o['dry-run']);
}
export function human(result){if(Array.isArray(result)){if(!result.length)return '  (none)';const keys=Object.keys(result[0]);const printable=result.map(r=>Object.fromEntries(keys.map(k=>[k,typeof r[k]==='object'&&r[k]!==null?JSON.stringify(r[k]):r[k]])));return table(printable,keys.map(k=>({key:k,label:k.replaceAll('_',' '),width:60})));}return Object.entries(result).map(([k,v])=>k.replaceAll('_',' ')+'\n'+human(v)).join('\n\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(args.includes('--help')){console.log(human(Object.entries(specs).map(([command,[,options,job]])=>({command,job,options:options.join(', ')}))));}
 else{let db;try{db=await getDb();const r=await execute(db,args);console.log(args.includes('--json')?JSON.stringify(r,null,2):human(r));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
}
