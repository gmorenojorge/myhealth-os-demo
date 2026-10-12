/* MyHealth OS NUT-01 v0.5 — device login for 30 days + integrated nutrition diary.
   No API credentials embedded. Images only transmitted after an explicit confirmation.
   Data stays outside GitHub and photos are not saved in localStorage.
 */
(() => {
'use strict';
const ORIGIN = 'https://gmorenojorge.github.io';
const KEY = 'myhealth_os_nutrition_confirmed_v04';
const URL_KEY='myhealth_os_nutrition_worker_url';
const LEGACY_TOKEN_KEY='myhealth_os_nutrition_session_token';
const DEVICE_DB='myhealth_os_device_v05';
const DEVICE_STORE='sessions';
const state={image:null,ingredients:[],calculated:null,dish:'',notes:'',hidden:[],busy:false,cameraStream:null,device:null};
const $ = id => document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rounded=(n,d=1)=>Number(n).toLocaleString('es-ES',{maximumFractionDigits:d});
const conf=x=>({alta:'Alta',media:'Media',baja:'Baja',no_evaluable:'No evaluable'}[x]||'No evaluable');
const history=()=>{try{const h=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(h)?h:[]}catch{return []}};
const css=document.createElement('style');
css.textContent=`
.n04-modal[hidden]{display:none!important}.n04-modal{position:fixed;inset:0;z-index:12000;background:rgba(26,40,30,.66);display:flex;align-items:center;justify-content:center;padding:12px}
.n04-dialog{width:min(660px,100%);max-height:94dvh;overflow-y:auto;background:#fff;color:#273a2b;border-radius:20px;padding:20px;font-size:13px;box-shadow:0 24px 90px #0003}
.n04-dialog h2{font-size:20px;margin:0 0 5px}.n04-dialog h3{font-size:14px;margin:18px 0 10px}.n04-dialog p{font-size:12px;line-height:1.5;color:#66766a}
.n04-line{display:flex;gap:9px;flex-wrap:wrap;align-items:center}.n04-line>*{flex:0 0 auto}.n04-btn{border:1px solid #ccdace;background:#f1f5ef;border-radius:10px;padding:10px 12px;color:#285d40;font-weight:700;cursor:pointer}.n04-btn-primary{background:#295e42;color:#fff;border-color:#295e42}.n04-btn:disabled{opacity:.47;cursor:not-allowed}
.n04-input{background:#fff!important;color:#24382b!important;border:1px solid #d3ddd3!important;border-radius:10px;padding:10px!important;font-size:13px!important;min-width:0;max-width:100%;width:100%}
.n04-caption{font-size:11px;color:#788879}.n04-notice{background:#f7f6ec;border:1px solid #e9e3cf;border-radius:11px;padding:10px 12px;font-size:12px;line-height:1.55;color:#6b6348}.n04-ok{background:#edf6eb;border:1px solid #ccdfc8;border-radius:10px;padding:10px}
.n04-photo{display:block;margin:10px auto;max-height:210px;max-width:100%;border-radius:13px}.n04-photo[hidden]{display:none!important}
.n04-row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,.62fr);gap:8px;border-bottom:1px solid #e5eae4;padding:12px 0}.n04-row>div{min-width:0}.n04-field-label{display:block;font-size:10px;font-weight:750;color:#77907f;margin-bottom:4px}.n04-match{font-size:10px;color:#67806b;margin-top:4px}.n04-options{display:flex;flex-direction:column;gap:4px;margin-top:6px}.n04-selected{display:flex;flex-direction:column;gap:5px;margin-top:8px;padding:9px 11px;border-radius:11px;border:1px solid #d4e3d3;background:#f3f8f1}.n04-selected b{font-size:11px;color:#286144}.n04-selected span{font-size:11px;color:#415746;line-height:1.35}.n04-selected button,.n04-change{align-self:flex-start;border:0;background:transparent;color:#285d40;text-decoration:underline;padding:3px 0;font-size:11px;font-weight:700;cursor:pointer}.n04-pending{font-size:11px;color:#98654e;margin-top:8px}.n04-optional{max-height:180px;overflow:auto;border:1px solid #e7eee5;padding:6px;border-radius:10px}.n04-option{background:#f8faf6;border:1px solid #e1e8dd;text-align:left;border-radius:8px;padding:7px 9px;font-size:11px;color:#385c44}
.n04-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.n04-summary>div{padding:12px;border-radius:12px;background:#f4f7f1}.n04-summary strong{display:block;font-size:19px}.n04-summary small{font-size:11px;color:#819587}.n04-minor{font-size:11px;line-height:1.5;color:#71806e}
.n04-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.n04-status{font-size:12px;line-height:1.6;min-height:16px;margin-top:10px;color:#476a51}.n04-busy{opacity:.8;pointer-events:none}.n05-linked{border:1px solid #bbd7bf;background:#f0f7ef;border-radius:11px;padding:10px;font-size:12px;line-height:1.5}.n05-linked[hidden]{display:none}.n05-subtle{border:0!important;background:transparent!important;padding:5px!important;font-size:11px!important;text-decoration:underline;color:#476d57!important}
@media(max-width:430px){.n04-dialog{padding:14px}.n04-grid{grid-template-columns:1fr}.n04-row{grid-template-columns:minmax(0,1fr) 86px}}
`;
document.head.appendChild(css);
const dialog=document.createElement('div');dialog.className='n04-modal';dialog.hidden=true;
dialog.innerHTML=`<section class="n04-dialog" role="dialog" aria-modal="true" aria-label="Reconocimiento de comidas con IA">
<div class="n04-line" style="justify-content:space-between"><h2>Analizar mi comida</h2><button type="button" class="n04-btn" id="n04-close" aria-label="Cerrar">✕</button></div>
<p>MyHealth OS · Reconocimiento real con Gemma 4 y composición nutricional USDA. No es una medición clínica.</p>
<details id="n04-config"><summary style="cursor:pointer;font-weight:750;padding:7px 0">🔐 Vincular este iPhone</summary>
<div class="n04-grid"><label><span class="n04-field-label">URL de tu Cloudflare Worker (HTTPS)</span><input id="n04-url" class="n04-input" placeholder="https://myhealth-os-food-ai.…workers.dev" inputmode="url" autocomplete="off"></label><label><span class="n04-field-label">Contraseña de vinculación (solo una vez)</span><input id="n04-token" class="n04-input" type="password" placeholder="Clave de 32+ caracteres" autocomplete="off"></label></div>
<div class="n04-line" style="margin-top:8px"><button class="n04-btn" id="n04-connect" type="button">Recordar este iPhone durante 30 días</button><span class="n04-caption">No guardamos la contraseña. El iPhone conserva una clave criptográfica no exportable; la autorización caduca a los 30 días.</span></div>
</details><div id="n05-linked" class="n05-linked" hidden></div>
<h3>1 · Fotografía</h3>
<div class="n04-line"><button class="n04-btn n04-btn-primary" id="n04-camera" type="button">📷 Hacer foto</button><button class="n04-btn" id="n04-gallery" type="button">🖼 Elegir foto</button></div>
<input type="file" id="n04-capture" accept="image/*" capture="environment" hidden><input type="file" id="n04-file" accept="image/*" hidden>
<img id="n04-preview" class="n04-photo" alt="Previsualización local del plato" hidden>
<div class="n04-notice" style="margin-top:9px">La foto se envía a Cloudflare Workers AI <strong>solo cuando pulses Analizar</strong>. No se sube a GitHub ni se guarda en el diario. Comienza con fotos de prueba, sin datos personales identificables.</div>
<label class="n04-line" style="font-size:12px;margin:12px 0"><input id="n04-consent" type="checkbox"> Acepto enviar esta imagen a Cloudflare para su análisis.</label>
<button class="n04-btn n04-btn-primary" id="n04-analyze" type="button">✨ Analizar foto con IA real</button>
<section id="n04-review" hidden><h3>2 · Revisar propuesta de la IA</h3><div id="n04-dish" style="font-weight:800;font-size:16px"></div><p id="n04-notes"></p><div id="n04-rows"></div>
<button id="n04-add" class="n04-btn" type="button">+ Añadir ingrediente</button><p class="n04-minor">Revisa las sugerencias USDA y los gramos. Solo tendrás que cambiar la referencia cuando la propuesta no encaje. La fiabilidad visual no equivale a una probabilidad calibrada.</p>
<button class="n04-btn n04-btn-primary" id="n04-calculate" type="button">Calcular nutrientes con USDA</button>
<div id="n04-nutrients" hidden><h3>3 · Valores nutricionales estimados</h3><div id="n04-summary" class="n04-summary"></div><div id="n04-micros" class="n04-minor" style="margin-top:10px"></div>
<p class="n04-notice">Solo se suman al diario los macronutrientes con cobertura completa. «Sin datos» nunca significa cero. Puede faltar aceite, salsa o ingredientes no visibles.</p>
<button class="n04-btn n04-btn-primary" id="n04-save" type="button">✓ Confirmar y sumar al diario</button></div></section>
<div id="n04-status" class="n04-status" role="status" aria-live="polite"></div></section>`;
document.body.appendChild(dialog);
const say=(msg,err=false)=>{const el=$('n04-status');el.textContent=msg;el.style.color=err?'#a44c46':'#476a51';};
function endpoint(){const u=($('n04-url').value||localStorage.getItem(URL_KEY)||'').trim();let x;try{x=new URL(u)}catch{throw Error('Configura primero la URL de tu Cloudflare Worker.')};if(x.protocol!=='https:'||x.username||x.password||x.search||x.hash||!/^([a-z0-9-]+\.)+workers\.dev$/i.test(x.hostname))throw Error('La URL debe ser HTTPS y terminar en workers.dev, sin parámetros.');return x.origin;}

const enc=new TextEncoder();
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function shaB64(value){return b64url(await crypto.subtle.digest('SHA-256',enc.encode(value)));}
function deviceDb(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window))return reject(Error('Este navegador no admite almacenar el dispositivo.'));const open=indexedDB.open(DEVICE_DB,1);open.onupgradeneeded=()=>open.result.createObjectStore(DEVICE_STORE);open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});}
async function deviceLoad(){const db=await deviceDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DEVICE_STORE,'readonly');const req=tx.objectStore(DEVICE_STORE).get('primary');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();});}
async function deviceSet(device){const db=await deviceDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DEVICE_STORE,'readwrite');tx.objectStore(DEVICE_STORE).put(device,'primary');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});}
async function deviceDelete(){const db=await deviceDb();return new Promise((resolve,reject)=>{const tx=db.transaction(DEVICE_STORE,'readwrite');tx.objectStore(DEVICE_STORE).delete('primary');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});}
function devicePresent(device){return device&&device.key&&device.credential&&device.url&&device.expiresAt>Date.now()+1000;}
function updateDeviceUi(){const d=state.device;const info=$('n05-linked');if(devicePresent(d)){
  info.hidden=false;info.innerHTML=`<b>✓ iPhone vinculado hasta ${new Date(d.expiresAt).toLocaleDateString('es-ES')}</b><div>No tendrás que introducir la contraseña para analizar otra comida en este navegador.</div><button type="button" class="n04-btn n05-subtle" id="n05-forget">Olvidar este dispositivo</button>`;
  $('n04-config').open=false;
 }else{info.hidden=true;info.innerHTML='';}
}
async function loadDevice(){try{const d=await deviceLoad();if(devicePresent(d)){state.device=d;localStorage.setItem(URL_KEY,d.url);}else{state.device=null;if(d)await deviceDelete();}updateDeviceUi();}catch(e){state.device=null;say('No se pudo recuperar el acceso guardado: '+e.message,true);}}
async function enroll(){
 const url=endpoint();const password=$('n04-token').value.trim();if(password.length<24)throw Error('Introduce la contraseña de vinculación de al menos 24 caracteres.');
 if(!crypto?.subtle)throw Error('Este navegador no admite claves criptográficas seguras.');
 say('Vinculando este iPhone de forma segura…');
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
 const pub=await crypto.subtle.exportKey('jwk',keys.publicKey);
 let response;try{response=await fetch(url+'/device/enroll',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+password},body:JSON.stringify({publicKey:{kty:pub.kty,crv:pub.crv,x:pub.x,y:pub.y}}),cache:'no-store',signal:AbortSignal.timeout(17000)})}catch{throw Error('No se ha podido conectar con Cloudflare para vincular el iPhone.')}
 let data;try{data=await response.json()}catch{throw Error('Cloudflare no respondió correctamente.')}
 if(!response.ok)throw Error(data?.error||'Error al vincular este dispositivo.');
 if(typeof data?.credential!=='string'||!(data.expiresAt>Date.now()))throw Error('Cloudflare no devolvió una autorización válida.');
 const device={key:keys.privateKey,credential:data.credential,expiresAt:data.expiresAt,url};
 await deviceSet(device);state.device=device;localStorage.setItem(URL_KEY,url);
 sessionStorage.removeItem(LEGACY_TOKEN_KEY);$('n04-token').value='';updateDeviceUi();say('iPhone vinculado correctamente para 30 días.');
}
async function post(path,data){
 const d=state.device;
 if(!devicePresent(d))throw Error('Pulsa «Vincular este iPhone» e introduce la contraseña una sola vez.');
 const endpointUrl=endpoint();if(d.url!==endpointUrl)throw Error('La dirección del Worker ha cambiado. Vincula este iPhone de nuevo.');
 const text=JSON.stringify(data);const stamp=String(Date.now());const nonce=new Uint8Array(16);crypto.getRandomValues(nonce);const nonceText=b64url(nonce);
 const signData=['POST',path,stamp,nonceText,await shaB64(text)].join('\n');
 const signature=b64url(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},d.key,enc.encode(signData)));
 let response;try{response=await fetch(endpointUrl+path,{method:'POST',headers:{'content-type':'application/json','x-device-credential':d.credential,'x-device-time':stamp,'x-device-nonce':nonceText,'x-device-proof':signature},body:text,cache:'no-store',signal:AbortSignal.timeout(path==='/analyze'?65000:22000)})}catch{throw Error('No se pudo conectar con Cloudflare. Comprueba conexión y dirección.')}
 let body;try{body=await response.json()}catch{throw Error('El Worker devolvió una respuesta no válida.')}
 if(response.status===401){state.device=null;updateDeviceUi();throw Error('El acceso del iPhone ha caducado o se ha revocado. Vincúlalo de nuevo.');}
 if(!response.ok)throw Error(body?.error||'Error HTTP '+response.status);return body;
}
async function compressImage(file){if(!file.type.startsWith('image/'))throw Error('Selecciona una imagen válida.');if(file.size>12*1024*1024)throw Error('Foto demasiado grande (máximo 12 MB).');let bitmap;try{bitmap=await createImageBitmap(file)}catch{throw Error('No se pudo interpretar la imagen. Prueba con una foto JPEG.')};const side=Math.min(1,960/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*side));canvas.height=Math.max(1,Math.round(bitmap.height*side));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();const value=canvas.toDataURL('image/jpeg',0.78);if(value.length>1_450_000)throw Error('La imagen procesada es demasiado grande. Reduce su tamaño.');return value;}
async function photoSelected(e){const file=e.target.files?.[0];if(!file)return;try{state.image=await compressImage(file);$('n04-preview').src=state.image;$('n04-preview').hidden=false;state.ingredients=[];state.calculated=null;$('n04-review').hidden=true;$('n04-nutrients').hidden=true;say('Foto preparada. Activa el consentimiento y pulsa Analizar.');}catch(err){say(err.message,true)}}
function start(){dialog.hidden=false;document.body.style.overflow='hidden';$('n04-url').value=localStorage.getItem(URL_KEY)||'';$('n04-token').value='';loadDevice();$('n04-consent').checked=false;$('n04-preview').hidden=true;state.image=null;state.ingredients=[];state.calculated=null;$('n04-review').hidden=true;$('n04-nutrients').hidden=true;say('');}
function close(){dialog.hidden=true;document.body.style.overflow='';state.image=null;$('n04-preview').removeAttribute('src');}
function inject(){const main=$('main-content');if(!main||!main.textContent.includes('Registro mediante fotografía'))return;const section=[...main.querySelectorAll('section')].find(x=>x.textContent.includes('Estimación multimodal')||x.textContent.includes('Nutrición por fotografía · NUT-01')||x.querySelector('#n04-open'));if(!section)return;if(section.querySelector('#n04-open'))return;const latest=history()[0];section.innerHTML=`<div class="nut-v02-entry"><div><h3 class="panel-title">Nutrición IA por fotografía · NUT-01</h3><p class="page-desc">Reconoce alimentos con Gemma 4. Corrige cada ingrediente y su cantidad y calcula macro y micronutrientes con USDA. Solo funciona después de conectar tu Worker privado.</p><p class="page-desc n04-latest">${latest?`Última comida confirmada: ${escape(latest.dish)} · ${escape(latest.date)} (estimación nutricional)`: 'No hay comidas analizadas confirmadas todavía.'}</p></div><button id="n04-open" class="primary-btn" type="button">📷 Analizar comida con IA</button></div>`;}
const parent=$('main-content');if(parent){new MutationObserver(inject).observe(parent,{childList:true,subtree:false});inject();}
/** Matching is a suggestion, not proof that two foods are chemically identical.
 * Prefer minimally processed common ingredients; never auto-pick a pastry just
 * because the brand/name contains "apple".
 */
const n43norm = s => String(s||'').toLocaleLowerCase('en').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const n43Families=[
 ['apple',/\b(manzana|manzanas|apples?|pomme)s?\b/,/\bapples?\b/],
 ['orange',/\b(naranja|naranjas|oranges?)\b/,/\boranges?\b/],
 ['plum',/\b(ciruela|ciruelas|plums?)\b/,/\bplums?\b/],
 ['banana',/\b(platano|platanos|banana|bananas)\b/,/\bbananas?\b/],
 ['pear',/\b(pera|peras|pears?)\b/,/\bpears?\b/],
 ['tomato',/\b(tomate|tomates|tomatoes?|tomato)\b/,/\btomatoes?\b/],
 ['potato',/\b(patata|patatas|potato|potatoes)\b/,/\b(potato|potatoes)\b/],
 ['rice',/\b(arroz|rice)\b/,/\brice\b/],
 ['chicken',/\b(pollo|chicken)\b/,/\bchicken\b/],
 ['broccoli',/\b(brocoli|broccoli)\b/,/\bbroccoli\b/],
 ['egg',/\b(huevo|huevos|eggs?)\b/,/\beggs?\b/],
 ['salmon',/\b(salmon)\b/,/\bsalmon\b/],
 ['oil',/\b(aceite|oil)\b/,/\b(olive oil|oil olive|oil)\b/],
 ['bread',/\b(pan|bread)\b/,/\bbread\b/],
 ['yogurt',/\b(yogur|yoghurt|yogurt)\b/,/\byogh?urt\b/],
 ['strawberry',/\b(fresa|fresas|strawberr(y|ies))\b/,/\bstrawberr(y|ies)\b/],
 ['grape',/\b(uva|uvas|grapes?)\b/,/\bgrapes?\b/],
 ['peach',/\b(melocoton|melocotones|peaches?|peach)\b/,/\bpeaches?\b/]
];
const n43Translate={manzana:'apple',manzanas:'apples',naranja:'orange',naranjas:'oranges',ciruela:'plum',ciruelas:'plums',platano:'banana',platanos:'bananas',pera:'pear',peras:'pears',tomate:'tomato',tomates:'tomatoes',patata:'potato',patatas:'potatoes',arroz:'rice',pollo:'chicken',brocoli:'broccoli',huevo:'egg',huevos:'eggs',salmon:'salmon',aceite:'olive oil',pan:'bread',yogur:'yogurt',fresa:'strawberry',fresas:'strawberries',uva:'grape',uvas:'grapes',melocoton:'peach'};
function n43English(s){const plain=n43norm(s);return plain.split(' ').map(word=>n43Translate[word]||word).join(' ');}
function n43Score(option,row){
 const desc=n43norm(option.name);const target=n43norm(row.search||row.name);const inSpanish=n43norm(row.name);
 const family=n43Families.find(([,re])=>re.test(target)||re.test(inSpanish));
 // Discourage products / other fruits / mixed dishes rather than blindly choosing the first USDA result.
 const exclude=/(juice|jam|jelly|strudel|croissant|pie|cake|cookies?|babyfood|baby food|cider|butter|sauce|syrup|pudding|candied|canned|dried|prunes?|stewed|smoothie|rose apple|rose apples|roseapples|crab apple|crabapples|fruit salad|fritter|flavored|fried|sweetened|preserves)/;
 let score=0;
 if(family){
   if(!family[2].test(desc))return -200;
   const m=desc.match(family[2]);
   score+=40;
   if(m?.index===0)score+=32;
 }else{
   // For unfamiliar foods we do not silently attach an unrelated USDA item.
   const words=target.split(' ').filter(w=>w.length>=4&&!['fresh','with','raw','cooked','food'].includes(w));
   if(!words.length || !words.some(w=>desc.includes(w)))return -200;
   score+=24;
   if(desc.startsWith(words[0]))score+=24;
 }
 if(exclude.test(desc))score-=130;
 if(option.dataType==='Foundation')score+=20;
 else if(option.dataType==='SR Legacy')score+=14;
 else if(option.dataType==='Survey (FNDDS)')score+=5;
 else if(option.dataType==='Branded')score-=60;
 const desired=n43norm(row.preparation);
 const raw=/\b(raw|fresh|uncooked)\b/.test(desc);
 const wantsRaw=/\b(crudo|cruda|raw|fresco|fresca|natural)\b/.test(desired);
 const wantsCooked=/\b(cocido|cocida|hervido|hervida|cooked|boiled|grilled|plancha|asado)\b/.test(desired);
 if(wantsRaw)score+=raw?25:-12;
 else if(wantsCooked)score+=/\b(cooked|boiled|roasted|grilled)\b/.test(desc)?22:-9;
 if(family?.[0]==='apple' && /with skin/.test(desc))score+=6;
 if(family?.[0]==='plum' && /with skin/.test(desc))score+=3;
 // A proposed fresh orange should not silently become juice or orange marmalade.
 return score;
}
function n43Rank(row,options){return [...options].sort((a,b)=>n43Score(b,row)-n43Score(a,row));}
function n43SafeAuto(row){const best=row.options?.[0];const score=best?n43Score(best,row):-200;
 return best&&score>=82&&!/Branded/.test(best.dataType||'')?best:null;
}
function rowOptions(row){
 const ranked=row.options||[];
 const current=row.fdcId?`<div class="n04-selected"><b>✓ Referencia USDA sugerida · revisa si coincide</b><span>${escape(row.selectedName||'Referencia seleccionada')} (${escape(row.selectedType||'USDA')})</span><button type="button" data-toggle-options="${row.id}">${row.showOptions?'Ocultar alternativas':'Cambiar referencia'}</button></div>`:'';
 const pending=!row.fdcId?`<div class="n04-pending">${ranked.length?'Selecciona una referencia USDA antes de calcular.':'Buscando correspondencia en USDA…'}</div>`:'';
 if(!row.showOptions && row.fdcId)return current;
 const visible=row.showAll?ranked:ranked.slice(0,4);
 const choices=visible.map(o=>`<button class="n04-option" data-match="${row.id}" data-fdc="${o.fdcId}" type="button">${escape(o.name)} <span style="color:#8a9c8c">(${escape(o.dataType)})</span></button>`).join('');
 const more=ranked.length>4&&!row.showAll?`<button type="button" class="n04-change" data-more="${row.id}">Ver ${ranked.length-4} alternativas más</button>`:'';
 const nothing=!ranked.length?'<span class="n04-caption">Escribe otro nombre para buscar; USDA está en inglés.</span>':'';
 return current+pending+`<div class="n04-options n04-optional" id="n04-list-${row.id}">${choices}${more}${nothing}</div>`;
}
function n43CanCalculate(){return state.ingredients.length>0&&state.ingredients.every(r=>Number.isSafeInteger(Number(r.fdcId))&&Number(r.fdcId)>0&&Number.isFinite(+r.grams)&&r.grams>=1&&r.grams<=2000);}
function n43UpdateCalcButton(){const b=$('n04-calculate');if(b)b.disabled=!n43CanCalculate();}
function n43UpdateRow(row){const holder=$('n04-options-'+row.id);if(holder)holder.innerHTML=rowOptions(row);const info=$('n04-info-'+row.id);if(info)info.textContent=`Identificación: ${conf(row.identityConfidence)} · Cantidad: ${conf(row.portionConfidence)}${row.fdcId?' · USDA seleccionado':' · USDA pendiente'}`;n43UpdateCalcButton();}
function renderRows(){
 $('n04-rows').innerHTML=state.ingredients.map(r=>`<article class="n04-row"><div><label class="n04-field-label" for="n04-name-${r.id}">Alimento</label><input class="n04-input" id="n04-name-${r.id}" data-edit="${r.id}" value="${escape(r.name)}" maxlength="100" autocomplete="off" placeholder="Escribe un alimento"><div class="n04-match" id="n04-info-${r.id}">Identificación: ${conf(r.identityConfidence)} · Cantidad: ${conf(r.portionConfidence)} · ${r.fdcId?'USDA seleccionado':'USDA pendiente'}</div><div id="n04-options-${r.id}">${rowOptions(r)}</div></div><div><label class="n04-field-label">Gramos</label><input type="number" class="n04-input" data-grams="${r.id}" min="1" max="2000" step="1" value="${r.grams}"><label class="n04-field-label" style="margin-top:7px">Preparación</label><input class="n04-input" data-preparation="${r.id}" maxlength="45" value="${escape(r.preparation||'')}"><button class="n04-btn" style="margin-top:6px;padding:5px 8px;font-size:11px" data-remove="${r.id}" type="button">Eliminar alimento</button></div></article>`).join('');
 n43UpdateCalcButton();
}
let counter=1;
function newRow(src){return {id:String(counter++),name:src.name||'',preparation:src.preparation||'',grams:src.grams||100,identityConfidence:src.identityConfidence||'no_evaluable',portionConfidence:src.portionConfidence||'no_evaluable',search:src.englishSearch||n43English(src.name||''),fdcId:null,selectedName:null,selectedType:null,options:[],showOptions:false,showAll:false};}
async function searchRow(row,query){if(!query||query.length<2)return;try{
 const data=await post('/foods',{query});if(!state.ingredients.includes(row)||row.search!==query)return;
 row.options=n43Rank(row,data.options||[]);
 const candidate=n43SafeAuto(row);
 if(candidate && !row.fdcId){row.fdcId=Number(candidate.fdcId);row.selectedName=candidate.name;row.selectedType=candidate.dataType;row.showOptions=false;}
 if(!candidate && !row.fdcId)row.showOptions=true;
 n43UpdateRow(row);
 if(!row.options.length)say(`USDA no devolvió coincidencias para «${query}». Prueba una búsqueda diferente.`,true);
}catch(e){say(e.message,true);}}
async function analyzePhoto(){if(!state.image)throw Error('Primero toma o selecciona una foto.');if(!$('n04-consent').checked)throw Error('Necesitamos tu confirmación para enviar la foto a Cloudflare.');say('Analizando fotografía con Gemma 4…');const result=await post('/analyze',{image:state.image});state.dish=result.dish;state.notes=result.notes;state.hidden=result.hiddenIngredients||[];state.ingredients=(result.ingredients||[]).map(newRow);state.calculated=null;$('n04-dish').textContent=result.dish;$('n04-notes').textContent=[result.notes,state.hidden.length?'Posibles ingredientes no visibles: '+state.hidden.join(', '):''].filter(Boolean).join(' · ');$('n04-review').hidden=false;$('n04-nutrients').hidden=true;renderRows();say('Buscando una referencia USDA adecuada para cada alimento…');await Promise.all(state.ingredients.map(async row=>{try{await searchRow(row,row.search)}catch{}}));if(n43CanCalculate())say('Referencias USDA sugeridas. Revisa las cantidades y pulsa Calcular nutrientes.');else say('Revisa los alimentos pendientes: necesitan una referencia USDA antes de calcular.',true);}
function renderNutrients(){const v=state.calculated?.nutrients||{};const main=[['kcal','Energía'],['protein','Proteínas'],['carbs','Hidratos'],['fat','Grasas']];$('n04-summary').innerHTML=main.map(([k,label])=>`<div><strong>${v[k]?.value===null||v[k]?.value===undefined?'—':rounded(v[k].value)} ${escape(v[k]?.unit||'')}</strong><small>${label}${v[k]&&!v[k].complete?' · datos parciales':''}</small></div>`).join('');$('n04-micros').innerHTML=Object.entries(v).filter(([k])=>!main.some(([m])=>k===m)).map(([k,t])=>`<div style="padding:5px 0;border-bottom:1px solid #e5eae4">${escape(t.label)}: <strong>${t.value==null?'Sin datos':(t.complete?'':'≥ ')+rounded(t.value,2)+' '+escape(t.unit)}</strong>${t.complete?'':' · incompleto ('+t.covered+'/'+t.of+')'}</div>`).join('');$('n04-nutrients').hidden=false;}
async function calculate(){say('Consultando composición de alimentos en USDA…');const entries=state.ingredients.map(r=>({name:r.name,fdcId:r.fdcId,grams:r.grams}));const value=await post('/nutrition',{ingredients:entries});state.calculated=value;renderNutrients();say('Valores calculados desde USDA. Revisa las cantidades antes de confirmar.');}
function save(){
 if(!state.calculated)throw Error('Calcula primero los nutrientes desde USDA.');
 const n=state.calculated.nutrients||{};const required=['kcal','protein','carbs','fat'];
 const complete=required.every(k=>n[k]&&n[k].complete&&Number.isFinite(n[k].value)&&n[k].value>=0);
 if(!complete)throw Error('No se puede sumar al resumen porque USDA no aporta todos los macronutrientes. Cambia la referencia del alimento que tenga datos incompletos. Nunca se interpretarán como cero.');
 const button=document.querySelector('#main-content [data-action="add-meal"]');
 if(!button)throw Error('Abre la pestaña Nutrición para guardar la comida en el diario.');
 const old=JSON.parse(localStorage.getItem('myhealth_os_demo_v1')||'null');
 const before=old?.meals?.length??0;
 button.click();
 const form=$('meal-form');if(!form)throw Error('No se ha podido abrir el diario nutricional.');
 const values={name:String(state.dish||'Comida analizada').slice(0,90),date:new Date().toLocaleDateString('en-CA'),category:'Comida',calories:Math.round(n.kcal.value),protein:Math.round(n.protein.value*10)/10,carbs:Math.round(n.carbs.value*10)/10,fat:Math.round(n.fat.value*10)/10};
 // Use local date rather than UTC to avoid midnight shift in Spain.
 const now=new Date();values.date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 for(const [key,value] of Object.entries(values)){const el=form.elements.namedItem(key);if(el)el.value=String(value);}
 form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 const updated=JSON.parse(localStorage.getItem('myhealth_os_demo_v1')||'null');
 if(!updated||updated.meals.length!==before+1)throw Error('No se pudo guardar la comida en el resumen diario.');
 const mainRecord=updated.meals.at(-1);
 const item={id:'nut-'+Date.now(),mainMealId:mainRecord.id,date:values.date,dish:state.dish,ingredients:state.calculated.items,nutrients:state.calculated.nutrients,source:'USDA FoodData Central',aiModel:'Gemma 4',estimated:true,confirmedAt:new Date().toISOString()};
 try{localStorage.setItem(KEY,JSON.stringify([item,...history()].slice(0,90)))}catch{ /* The diary itself is already persisted; do not duplicate. */ }
 close();say('Comida confirmada e incorporada al resumen diario.');
}
async function withBusy(fn){if(state.busy)return;state.busy=true;dialog.classList.add('n04-busy');try{await fn()}catch(e){say(e.message||'No se pudo completar la operación.',true)}finally{state.busy=false;dialog.classList.remove('n04-busy')}}
document.addEventListener('click',e=>{if(e.target.closest('#n04-open'))start();});
dialog.addEventListener('click',e=>{
 const t=e.target;
 if(t===dialog||t.closest('#n04-close')){close();return;}
 if(t.closest('#n04-camera')){$('n04-capture').click();return;}
 if(t.closest('#n04-gallery')){$('n04-file').click();return;}
 if(t.closest('#n04-connect')){withBusy(enroll);return;}
 if(t.closest('#n05-forget')){withBusy(async()=>{await deviceDelete();state.device=null;updateDeviceUi();$('n04-config').open=true;say('Este dispositivo ha olvidado su acceso.');});return;}
 if(t.closest('#n04-analyze')){withBusy(analyzePhoto);return;}
 if(t.closest('#n04-add')){state.ingredients.push(newRow({name:'',grams:100}));state.calculated=null;$('n04-nutrients').hidden=true;renderRows();return;}
 if(t.closest('#n04-calculate')){withBusy(calculate);return;}
 if(t.closest('#n04-save')){withBusy(save);return;}
 const rm=t.closest('[data-remove]');if(rm){state.ingredients=state.ingredients.filter(r=>r.id!==rm.dataset.remove);state.calculated=null;$('n04-nutrients').hidden=true;renderRows();return;}
 const toggle=t.closest('[data-toggle-options]');if(toggle){const row=state.ingredients.find(r=>r.id===toggle.dataset.toggleOptions);if(row){row.showOptions=!row.showOptions;row.showAll=false;n43UpdateRow(row);}return;}
 const more=t.closest('[data-more]');if(more){const row=state.ingredients.find(r=>r.id===more.dataset.more);if(row){row.showAll=true;n43UpdateRow(row);}return;}
 const match=t.closest('[data-match]');if(match){const row=state.ingredients.find(r=>r.id===match.dataset.match),opt=row?.options.find(o=>String(o.fdcId)===match.dataset.fdc);if(row&&opt){row.fdcId=Number(opt.fdcId);row.selectedName=opt.name;row.selectedType=opt.dataType;row.showOptions=false;row.showAll=false;state.calculated=null;$('n04-nutrients').hidden=true;n43UpdateRow(row);say('Referencia USDA seleccionada para '+row.name+'.');}return;}
});
let debounce;
dialog.addEventListener('input',e=>{const t=e.target;
 if(t.dataset.edit){const row=state.ingredients.find(r=>r.id===t.dataset.edit);if(!row)return;row.name=t.value;row.search=n43English(t.value);row.fdcId=null;row.selectedName=null;row.selectedType=null;row.options=[];row.showOptions=true;row.showAll=false;state.calculated=null;$('n04-nutrients').hidden=true;n43UpdateRow(row);clearTimeout(debounce);const query=row.search;debounce=setTimeout(()=>{if(query.length>2)searchRow(row,query)},520);}
 if(t.dataset.grams){const row=state.ingredients.find(r=>r.id===t.dataset.grams);if(row){row.grams=Number(t.value);state.calculated=null;$('n04-nutrients').hidden=true;n43UpdateCalcButton();}}
 if(t.dataset.preparation){const row=state.ingredients.find(r=>r.id===t.dataset.preparation);if(row)row.preparation=t.value;}
});
$('n04-file').addEventListener('change',photoSelected);
$('n04-capture').addEventListener('change',photoSelected);
})();
