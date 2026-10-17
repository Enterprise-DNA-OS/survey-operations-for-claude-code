import {spawnSync} from 'node:child_process';
import {REPO_ROOT} from './lib/db.mjs';
const env={...process.env,DATABASE_URL:'',DATA_DIR:'.data/demo'};
for(const [script,...args]of [['migrate.mjs'],['seed.mjs'],['surveys.mjs','scorecards'],['surveys.mjs','follow-ups'],['surveys.mjs','compliance'],['view.mjs'],['docs.mjs']]){
 const r=spawnSync(process.execPath,['scripts/'+script,...args],{cwd:REPO_ROOT,env,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
