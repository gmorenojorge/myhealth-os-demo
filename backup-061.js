/* MyHealth OS 0.6.1 · Exportación cifrada y voluntaria de comidas USDA confirmadas.
 * No modifica registros, claves de acceso ni datos de la aplicación original.
 * Solo ejecuta las operaciones de exportación después de pulsar el botón correspondiente.
 */
(()=>{'use strict';
const FOOD_KEY='myhealth_os_nutrition_confirmed_v04';
const LEGACY_KEY='myhealth_os_demo_v1';
const MIME='application/json';
let preparedFile=null;
const el=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function parseKey(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
function u8b64(a){let str='';for(const b of a)str+=String.fromCharCode(b);return btoa(str)}
function b64u8(s){const v=atob(s);return Uint8Array.from(v,c=>c.charCodeAt(0))}
function confirmed(){
 const raw=parseKey(FOOD_KEY),legacy=parseKey(LEGACY_KEY);
 const items=Array.isArray(raw)?raw:[];
 const meals=Array.isArray(legacy?.meals)?legacy.meals:[];
 const seen=new Set();const records=[];
 for(const a of items){
  if(!a||typeof a!=='object'||!/^\d{4}-\d{2}-\d{2}$/.test(a.date||'')||!a.confirmedAt)continue;
  const id=String(a.id||a.mainMealId||a.confirmedAt);
  if(seen.has(id))continue;
  seen.add(id);
  const record={};
  for(const k of ['id','mainMealId','date','dish','ingredients','nutrients','source','aiModel','estimated','confirmedAt'])if(Object.prototype.hasOwnProperty.call(a,k))record[k]=a[k];
  const m=meals.find(x=>x&&x.id===a.mainMealId);
  const linkedMeal=m?Object.fromEntries(['id','name','date','category','calories','protein','carbs','fat'].filter(k=>Object.prototype.hasOwnProperty.call(m,k)).map(k=>[k,m[k]])):null;
  records.push({record,linkedMeal});
 }
 return records;
}
const css=document.createElement('style');css.textContent=`
#mh061-exportBtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid #bccee3;background:#edf4ff;color:#1f4776;font-weight:750;border-radius:12px;padding:12px 15px;margin-top:13px;max-width:100%;font-size:14px}
#mh061-overlay[hidden]{display:none!important}#mh061-overlay{position:fixed;inset:0;z-index:40000;background:rgba(14,24,36,.72);padding:calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));display:flex;justify-content:center;align-items:center}
#mh061-panel{color:#202e3d;background:#fff;width:min(530px,100%);max-height:92dvh;overflow:auto;border-radius:22px;padding:22px;box-shadow:0 12px 60px #0004;font:inherit}
#mh061-panel h2{font-size:23px;margin:0 38px 14px 0}#mh061-panel p{font-size:13px;line-height:1.55;color:#617080}#mh061-panel label{font-size:13px;color:#34475a;font-weight:700;display:block;margin:14px 0 6px}#mh061-panel input{box-sizing:border-box;width:100%;font:inherit;font-size:16px;padding:12px;border:1px solid #bbc7d2;border-radius:10px;background:#fff;color:#142737}
#mh061-panel button{font:inherit;min-height:44px;border-radius:12px;border:0;padding:11px 16px}#mh061-panel .mh061-main{background:#214b81;color:#fff;font-weight:750;width:100%;margin-top:12px}#mh061-panel .mh061-light{background:#ecf1f8;color:#1e456d;font-weight:750;width:100%;margin-top:10px}#mh061-close{float:right;background:#f1f2f4;color:#273343}#mh061-panel button:disabled{opacity:.4}
#mh061-msg{border-radius:12px;background:#edf5ff;color:#24476b!important;padding:12px;white-space:pre-line}#mh061-panel .mh061-safety{background:#fff0eb;color:#754e42!important;border-radius:12px;padding:12px}#mh061-ready[hidden]{display:none!important}
`;document.head.append(css);
const wrap=document.createElement('div');wrap.id='mh061-overlay';wrap.hidden=true;wrap.innerHTML=`
<section id="mh061-panel" role="dialog" aria-modal="true" aria-label="Exportar copia de comidas confirmadas">
<button id="mh061-close" type="button" aria-label="Cerrar">×</button>
<h2>🔐 Guardar mis comidas USDA</h2>
<p>Esta función crea una <b>copia cifrada</b> de las comidas que hayas confirmado tras analizarlas con Gemma 4 y USDA. <b>No borra ni modifica nada.</b></p>
<p id="mh061-count" role="status"></p>
<label for="mh061-password">Elige una contraseña para proteger la copia (mínimo 12 caracteres)</label><input autocomplete="new-password" type="password" id="mh061-password" minlength="12" maxlength="128" placeholder="Una contraseña que puedas recordar">
<label for="mh061-repeat">Repite la contraseña</label><input autocomplete="new-password" type="password" id="mh061-repeat" minlength="12" maxlength="128" placeholder="Repite la misma contraseña">
<button type="button" class="mh061-main" id="mh061-prepare">1. Preparar copia cifrada</button>
<p id="mh061-msg">Guarda la contraseña fuera de ChatGPT: sin ella no podrás abrir el respaldo.</p>
<div id="mh061-ready" hidden>
<button type="button" class="mh061-main" id="mh061-share">2. Guardar en Archivos del iPhone</button>
<button type="button" class="mh061-light" id="mh061-download">Descargar archivo (.json)</button>
<p>Comprueba que el archivo aparece en <b>Archivos</b> antes de continuar. No lo subas a GitHub ni lo envíes a este chat.</p>
</div>
<p class="mh061-safety"><b>Alcance:</b> se incluyen las comidas confirmadas mediante IA y USDA, con sus referencias nutricionales. No se exportan los datos ficticios de la demo, las contraseñas, el acceso al Worker ni las fotos originales. Las comidas manuales que no tengan confirmación USDA no se incluyen para evitar confundirlas con ejemplos.</p>
</section>`;
document.body.append(wrap);
function show(){preparedFile=null;el('mh061-ready').hidden=true;el('mh061-password').value='';el('mh061-repeat').value='';const list=confirmed();el('mh061-count').textContent=`En esta aplicación hay ${list.length} comida${list.length===1?'':'s'} confirmada${list.length===1?'':'s'} mediante USDA.`;el('mh061-prepare').disabled=!list.length;el('mh061-msg').textContent=list.length?'Puedes crear una copia cifrada. No necesitas reconectar Gemma 4.':'No hay registros confirmados USDA en este almacenamiento. Abre el icono donde aparece «Última comida confirmada». ';wrap.hidden=false}
function close(){wrap.hidden=true;preparedFile=null;el('mh061-password').value='';el('mh061-repeat').value=''}
el('mh061-close').onclick=close;wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
async function seal(payload,password){
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const keyMaterial=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:260000,hash:'SHA-256'},keyMaterial,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const clear=new TextEncoder().encode(JSON.stringify(payload));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,clear);
 // Self-check: decrypted bytes must exactly match the original before offering the file.
 const check=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ciphertext);
 if(new TextDecoder().decode(check)!==new TextDecoder().decode(clear))throw Error('La comprobación del respaldo ha fallado.');
 return {kind:'myhealth-os-usda-backup',version:1,createdAt:new Date().toISOString(),count:payload.records.length,encryption:{algorithm:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:260000,salt:u8b64(salt),iv:u8b64(iv)},payload:u8b64(new Uint8Array(ciphertext))};
}
el('mh061-prepare').onclick=async()=>{
 const p=el('mh061-password').value,q=el('mh061-repeat').value;
 if(p.length<12){el('mh061-msg').textContent='La contraseña debe tener al menos 12 caracteres.';return}
 if(p!==q){el('mh061-msg').textContent='Las contraseñas no coinciden.';return}
 const list=confirmed();if(!list.length){el('mh061-msg').textContent='No hay comidas confirmadas que exportar.';return}
 const button=el('mh061-prepare');button.disabled=true;el('mh061-msg').textContent='Cifrando y comprobando la copia…';
 try{const env=await seal({schema:'myhealth-os-usda-061',version:1,exportedAt:new Date().toISOString(),records:list},p);
 const filename=`MyHealthOS-comidas-cifradas-${new Date().toISOString().slice(0,10)}.json`;
 preparedFile=new File([JSON.stringify(env)],filename,{type:MIME});el('mh061-msg').textContent=`Copia verificada: ${list.length} comida${list.length===1?'':'s'}. Ahora guárdala en Archivos.`;
 el('mh061-ready').hidden=false;el('mh061-password').value='';el('mh061-repeat').value='';
 }catch(e){preparedFile=null;el('mh061-msg').textContent='No ha sido posible cifrar la copia en este dispositivo. No se ha modificado ningún registro.';console.error(e)}
 finally{button.disabled=false}
};
function download(){if(!preparedFile)return;const url=URL.createObjectURL(preparedFile);const a=document.createElement('a');a.href=url;a.download=preparedFile.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
el('mh061-download').onclick=download;
el('mh061-share').onclick=()=>{if(!preparedFile)return;
 if(typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[preparedFile]})){
 navigator.share({files:[preparedFile],title:'Copia cifrada MyHealth OS'}).then(()=>{el('mh061-msg').textContent='El iPhone ha mostrado las opciones de compartir. Comprueba que guardaste el archivo en Archivos.'}).catch(e=>{if(e?.name!=='AbortError')el('mh061-msg').textContent='No se pudo compartir: utiliza «Descargar archivo».'});
 }else{download();el('mh061-msg').textContent='Se ha iniciado la descarga. Busca el archivo en Archivos → Descargas.'}
};
function inject(){const target=document.querySelector('#n04-open');if(!target)return;const section=target.closest('section');if(!section||section.querySelector('#mh061-exportBtn'))return;
 const button=document.createElement('button');button.id='mh061-exportBtn';button.type='button';button.textContent='🔐 Guardar copia de mis comidas USDA';button.onclick=show;section.appendChild(button);
}
const main=el('main-content');if(main){new MutationObserver(()=>inject()).observe(main,{childList:true,subtree:true});inject();}
})();
