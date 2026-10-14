'use strict';
/* My Training Cloud Sync: local-first, explicit manual merge. Publishable key is public. */
const CLOUD_URL='https://bgtfydixbddwsykxibjc.supabase.co';
const CLOUD_KEY='sb_publishable_G5dBUGgL1-m1eHIXZJxC_g_NEVbvVB2';
const CLOUD_SESSION='my-training-cloud-session-v1';
let cloudSession=null;
try{cloudSession=JSON.parse(sessionStorage.getItem(CLOUD_SESSION)||'null')}catch{}
const cloudHeaders=token=>({'apikey':CLOUD_KEY,'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})});
async function cloudRequest(path,{method='GET',body,token}={}){
 let response;try{response=await fetch(CLOUD_URL+path,{method,headers:cloudHeaders(token),...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',mode:'cors'});}catch(err){throw Error('Connessione a Supabase non riuscita ('+(navigator.onLine?'rete o blocco Safari':'dispositivo offline')+'). Apri l’app in Safari e riprova. Dettaglio: '+err.message)}
 let result=null;try{result=await response.json()}catch{}
 if(!response.ok)throw Error(result?.msg||result?.error_description||result?.message||('HTTP '+response.status));
 return result;
}
function cloudStoreSession(v){cloudSession=v;try{if(v)sessionStorage.setItem(CLOUD_SESSION,JSON.stringify(v));else sessionStorage.removeItem(CLOUD_SESSION)}catch{}}
async function cloudAccessToken(){
 if(!cloudSession)throw Error('Accedi prima al cloud');
 if(Date.now()<(cloudSession.expires_at||0)-60000)return cloudSession.access_token;
 if(!cloudSession.refresh_token)throw Error('Sessione scaduta: accedi di nuovo');
 const v=await cloudRequest('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:cloudSession.refresh_token}});
 cloudStoreSession({...v,expires_at:Date.now()+v.expires_in*1000,user:v.user||cloudSession.user});
 return cloudSession.access_token;
}
async function cloudLogin(email,password){
 const v=await cloudRequest('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
 cloudStoreSession({...v,expires_at:Date.now()+v.expires_in*1000});return v;
}
async function cloudSignup(email,password){
 return cloudRequest('/auth/v1/signup',{method:'POST',body:{email,password}});
}
function cloudLogout(){cloudStoreSession(null)}
async function cloudSyncNow(){
 const token=await cloudAccessToken(),userId=cloudSession.user?.id;
 if(!userId)throw Error('Account non identificato');
 // On iOS standalone PWAs automatic downloads can interrupt network activity.
 // Backups remain available via Impostazioni > Esporta backup JSON.
 const remote=await cloudRequest('/rest/v1/training_items?select=item_id,kind,payload&limit=10000',{token});
 if(!Array.isArray(remote))throw Error('Risposta cloud non valida');
 if(remote.length>=10000)throw Error('Limite cloud raggiunto: contatta supporto');
 const currentIds=new Set(data.workouts.map(x=>String(x.id)));
 const remoteWorkouts=remote.filter(x=>x.kind==='workout').map(x=>x.payload).filter(x=>x&&typeof x.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number(x.minutes)>0);
 const additions=remoteWorkouts.filter(x=>!currentIds.has(x.id));
 const merged=[...data.workouts,...additions];
 const ids=new Set(remote.filter(x=>x.kind==='workout').map(x=>x.item_id));
 const uploads=data.workouts.filter(x=>!ids.has(String(x.id))).map(x=>({user_id:userId,item_id:String(x.id),kind:'workout',payload:x}));
 // Insert only missing records; never overwrite an existing cloud record.
 if(uploads.length){
  for(let i=0;i<uploads.length;i+=100){
   await cloudRequest('/rest/v1/training_items?on_conflict=user_id,kind,item_id',{method:'POST',token,body:uploads.slice(i,i+100),headers:null});
  }
 }
 if(additions.length){
  const old=data;data={...data,workouts:merged};
  if(!save()){data=old;throw Error('Memoria locale piena: dati cloud non applicati')}
 }
 return {downloaded:additions.length,uploaded:uploads.length,cloudTotal:remoteWorkouts.length};
}

// My Training 2.0 beta: read-only diagnostic. No writes or local changes.
async function cloudPreviewV2(){
 const token=await cloudAccessToken();
 const rows=[],pageSize=500;
 for(let offset=0;offset<10000;offset+=pageSize){
  const page=await cloudRequest('/rest/v1/training_items?select=item_id,kind,payload,revision,deleted_at&order=item_id.asc&limit='+pageSize+'&offset='+offset,{token});
  if(!Array.isArray(page))throw Error('Risposta cloud non valida');
  rows.push(...page);
  if(page.length<pageSize)break;
  if(offset+pageSize>=10000)throw Error('Troppi record: anteprima interrotta, nessuna modifica eseguita');
 }
 const remote=rows.filter(x=>x.kind==='workout'&&!x.deleted_at);
 const deleted=rows.filter(x=>x.kind==='workout'&&x.deleted_at);
 const invalid=remote.filter(x=>!x.payload||String(x.item_id)!==String(x.payload.id));
 if(invalid.length)throw Error('Cloud contiene record non coerenti: anteprima interrotta');
 if(typeof planSyncV2!=='function')throw Error('Motore anteprima non caricato');
 const result=planSyncV2(data.workouts,remote.map(x=>x.payload));
 return {download:result.downloads.length,upload:result.uploads.length,conflicts:result.conflicts.length,deleted:deleted.length,cloud:remote.length,conflictIds:result.conflicts.map(x=>x.id)};
}

function cloudPanel(){
 const signed=!!cloudSession?.access_token;
 return '<div class="card"><h3>☁ Cloud Sync · PC e iPhone</h3><p class="muted">Sincronizzazione manuale sicura degli allenamenti. I dati restano anche offline; esporta un backup JSON dalle Impostazioni prima della prima sincronizzazione. Per usare il cloud devi prima applicare lo script SQL in Supabase.</p>'+
 (signed?'<p class="note">Connesso: '+escapeHTML(cloudSession.user?.email||'account')+'</p><button class="primary" id="cloudSync">↻ Sincronizza ora</button><button class="secondary" id="cloudPreviewV2" style="width:100%;margin-top:10px">🔍 Anteprima Sync 2.0 (sola lettura)</button><button class="secondary" id="cloudLogout" style="width:100%;margin-top:10px">Esci dal cloud</button>':
 '<label>Email<input id="cloudEmail" type="email" autocomplete="email" placeholder="email"></label><label>Password<input id="cloudPassword" type="password" autocomplete="current-password" placeholder="Password"></label><button class="primary" id="cloudLogin">Accedi</button><button class="secondary" id="cloudSignup" style="width:100%;margin-top:10px">Crea account</button>')+
 '<p class="note" id="cloudStatus">La sincronizzazione non elimina attività. Modifiche a una stessa attività su dispositivi diversi richiedono una verifica manuale.</p></div>';
}
function cloudBind(){
 const status=$('#cloudStatus'),show=s=>{if(status)status.textContent=s};
 if($('#cloudLogin'))$('#cloudLogin').onclick=async()=>{const email=$('#cloudEmail').value.trim(),password=$('#cloudPassword').value;try{await cloudLogin(email,password);settings()}catch(e){show('Accesso non riuscito: '+e.message)}};
 if($('#cloudSignup'))$('#cloudSignup').onclick=async()=>{const email=$('#cloudEmail').value.trim(),password=$('#cloudPassword').value;try{await cloudSignup(email,password);show('Account creato. Se richiesto, verifica la email e poi accedi.')}catch(e){show('Registrazione non riuscita: '+e.message)}};
 if($('#cloudLogout'))$('#cloudLogout').onclick=()=>{cloudLogout();settings()};
 if($('#cloudPreviewV2'))$('#cloudPreviewV2').onclick=async()=>{const btn=$('#cloudPreviewV2');btn.disabled=true;show('Analisi in sola lettura…');try{const p=await cloudPreviewV2();show('Anteprima 2.0: '+p.upload+' da caricare, '+p.download+' da scaricare, '+p.conflicts+' conflitti, '+p.deleted+' eliminati sul cloud. Nessun dato modificato.'+(p.conflictIds.length?' ID in conflitto: '+p.conflictIds.slice(0,5).join(', '):''))}catch(e){show('Anteprima non riuscita: '+e.message)}finally{btn.disabled=false}};
 if($('#cloudSync'))$('#cloudSync').onclick=async()=>{const btn=$('#cloudSync');btn.disabled=true;show('Sincronizzazione in corso…');try{const r=await cloudSyncNow();show('Completata: '+r.downloaded+' scaricati, '+r.uploaded+' caricati.');}catch(e){show('Sincronizzazione non completata: '+e.message)}finally{btn.disabled=false}};
}
