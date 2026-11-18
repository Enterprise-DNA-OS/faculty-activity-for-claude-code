import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';import {migrate} from './migrate.mjs';import {seed} from './seed.mjs';import {checkDomain} from './check-domain.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'faculty-test-'));process.env.DATABASE_URL='';process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=tmp;
try{
 const db=await getDb();try{await migrate(db);assert.equal((await migrate(db)).ran.length,0);await seed(db);await seed(db);assert.equal((await db.query('SELECT count(*)::integer n FROM faculty'))[0].n,3);await checkDomain(db,tmp);}finally{await db.close();}
 const run=(file,args=[])=>spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',file),...args],{env:process.env,encoding:'utf8'});
 for(const f of ['view.mjs','docs.mjs']){const res=run(f);assert.equal(res.status,0,res.stderr);}
 const result=run('faculty.mjs',['faculty','--json']);assert.equal(result.status,0,result.stderr);assert.ok(JSON.parse(result.stdout).length>=3);
 const ambiguous=run('faculty.mjs',['history','Aroha']);assert.equal(ambiguous.status,1);assert.match(ambiguous.stderr,/F001.*F003/);
 const human=run('faculty.mjs',['returns-due']);assert.equal(human.status,0);assert.match(human.stdout,/faculty/);
 const htmls=[];const walk=d=>{for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else if(p.endsWith('.html'))htmls.push(fs.readFileSync(p,'utf8'));}};walk(path.join(tmp,'views'));walk(path.join(tmp,'docs-out'));
 assert.ok(htmls.length>=12);assert.ok(htmls.some(x=>x.includes('&lt;script&gt;bad&lt;/script&gt;')));assert.ok(htmls.every(x=>!x.includes('<script>bad</script>')));assert.ok(htmls.every(x=>x.includes('Harbour Institute (fictional)')));
 console.log('PASS CLI exits, JSON, three dashboards, three document types, branding and HTML escaping');console.log('PASS npm test');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
