/* MyHealth OS NUT-01 v0.4 — optional real image analysis.
   No API credentials embedded. Images only transmitted after an explicit confirmation.
   Data stays outside GitHub and photos are not saved in localStorage.
 */
(() => {
'use strict';
const ORIGIN = 'https://gmorenojorge.github.io';
const KEY = 'myhealth_os_nutrition_confirmed_v04';
const URL_KEY='myhealth_os_nutrition_worker_url';
const TOKEN_KEY='myhealth_os_nutrition_session_token';
const state={image:null,ingredients:[],calculated:null,dish:'',notes:'',hidden:[],busy:false,cameraStream:null};
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
.n04-row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,.62fr);gap:8px;border-bottom:1px solid #e5eae4;padding:12px 0}.n04-row>div{min-width:0}.n04-field-label{display:block;font-size:10px;font-weight:750;color:#77907f;margin-bottom:4px}.n04-match{font-size:10px;color:#67806b;margin-top:4px}.n04-options{display:flex;flex-direction:column;gap:4px;margin-top:6px}.n04-option{background:#f8faf6;border:1px solid #e1e8dd;text-align:left;border-radius:8px;padding:7px 9px;font-size:11px;color:#385c44}
.n04-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.n04-summary>div{padding:12px;border-radius:12px;background:#f4f7f1}.n04-summary strong{display:block;font-size:19px}.n04-summary small{font-size:11px;color:#819587}.n04-minor{font-size:11px;line-height:1.5;color:#71806e}
.n04-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.n04-status{font-size:12px;line-height:1.6;min-height:16px;margin-top:10px;color:#476a51}.n04-busy{opacity:.8;pointer-events:none}
@media(max-width:430px){.n04-dialog{padding:14px}.n04-grid{grid-template-columns:1fr}.n04-row{grid-template-columns:minmax(0,1fr) 86px}}
`;
document.head.appendChild(css);
const dialog=document.createElement('div');dialog.className='n04-modal';dialog.hidden=true;
dialog.innerHTML=`<section class="n04-dialog" role="dialog" aria-modal="true" aria-label="Reconocimiento de comidas con IA">
<div class="n04-line" style="justify-content:space-between"><h2>Analizar mi comida</h2><button type="button" class="n04-btn" id="n04-close" aria-label="Cerrar">✕</button></div>
<p>MyHealth OS · Reconocimiento real con Gemma 4 y composición nutricional USDA. No es una medición clínica.</p>
<details id="n04-config"><summary style="cursor:pointer;font-weight:750;padding:7px 0">⚙ Conectar el servicio de IA</summary>
<div class="n04-grid"><label><span class="n04-field-label">URL de tu Cloudflare Worker (HTTPS)</span><input id="n04-url" class="n04-input" placeholder="https://myhealth-os-food-ai.…workers.dev" inputmode="url" autocomplete="off"></label><label><span class="n04-field-label">Clave de acceso personal del Worker</span><input id="n04-token" class="n04-input" type="password" placeholder="Clave de 32+ caracteres" autocomplete="off"></label></div>
<div class="n04-line" style="margin-top:8px"><button class="n04-btn" id="n04-connect" type="button">Guardar conexión para esta sesión</button><span class="n04-caption">La clave no está en GitHub. URL guardada localmente; clave solo en la sesión.</span></div>
</details>
<h3>1 · Fotografía</h3>
<div class="n04-line"><button class="n04-btn n04-btn-primary" id="n04-camera" type="button">📷 Hacer foto</button><button class="n04-btn" id="n04-gallery" type="button">🖼 Elegir foto</button></div>
<input type="file" id="n04-capture" accept="image/*" capture="environment" hidden><input type="file" id="n04-file" accept="image/*" hidden>
<img id="n04-preview" class="n04-photo" alt="Previsualización local del plato" hidden>
<div class="n04-notice" style="margin-top:9px">La foto se envía a Cloudflare Workers AI <strong>solo cuando pulses Analizar</strong>. No se sube a GitHub ni se guarda en el diario. Comienza con fotos de prueba, sin datos personales identificables.</div>
<label class="n04-line" style="font-size:12px;margin:12px 0"><input id="n04-consent" type="checkbox"> Acepto enviar esta imagen a Cloudflare para su análisis.</label>
<button class="n04-btn n04-btn-primary" id="n04-analyze" type="button">✨ Analizar foto con IA real</button>
<section id="n04-review" hidden><h3>2 · Revisar propuesta de la IA</h3><div id="n04-dish" style="font-weight:800;font-size:16px"></div><p id="n04-notes"></p><div id="n04-rows"></div>
<button id="n04-add" class="n04-btn" type="button">+ Añadir ingrediente</button><p class="n04-minor">Edita el alimento, el peso y la preparación. Elige una coincidencia USDA de la lista; si no coincide, busca otra. La fiabilidad visual no es una probabilidad calibrada.</p>
<button class="n04-btn n04-btn-primary" id="n04-calculate" type="button">Calcular nutrientes con USDA</button>
<div id="n04-nutrients" hidden><h3>3 · Valores nutricionales estimados</h3><div id="n04-summary" class="n04-summary"></div><div id="n04-micros" class="n04-minor" style="margin-top:10px"></div>
<p class="n04-notice">Los nutrientes solo se calculan para alimentos identificados en USDA. «Sin datos» nunca significa cero. Puede faltar aceite, salsa o ingredientes no visibles.</p>
<button class="n04-btn n04-btn-primary" id="n04-save" type="button">✓ Confirmar y guardar</button></div></section>
<div id="n04-status" class="n04-status" role="status" aria-live="polite"></div></section>`;
document.body.appendChild(dialog);
const say=(msg,err=false)=>{const el=$('n04-status');el.textContent=msg;el.style.color=err?'#a44c46':'#476a51';};
function endpoint(){const u=($('n04-url').value||localStorage.getItem(URL_KEY)||'').trim();let x;try{x=new URL(u)}catch{throw Error('Configura primero la URL de tu Cloudflare Worker.')};if(x.protocol!=='https:'||x.username||x.password||x.search||x.hash||!/^([a-z0-9-]+\.)+workers\.dev$/i.test(x.hostname))throw Error('La URL debe ser HTTPS y terminar en workers.dev, sin parámetros.');return x.origin;}
function token(){const t=sessionStorage.getItem(TOKEN_KEY)||$('n04-token').value.trim();if(t.length<24)throw Error('Introduce la clave de acceso personal del Worker.');return t;}
async function post(path,data){const url=endpoint();const t=token();let response;try{response=await fetch(url+path,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+t},body:JSON.stringify(data),cache:'no-store',signal:AbortSignal.timeout(path==='/analyze'?65000:22000)})}catch{throw Error('No se pudo conectar con Cloudflare. Comprueba URL, conexión o políticas CORS.')};let body;try{body=await response.json()}catch{throw Error('El Worker devolvió una respuesta no válida.')};if(!response.ok)throw Error(body?.error||'Error HTTP '+response.status);return body;}
async function compressImage(file){if(!file.type.startsWith('image/'))throw Error('Selecciona una imagen válida.');if(file.size>12*1024*1024)throw Error('Foto demasiado grande (máximo 12 MB).');let bitmap;try{bitmap=await createImageBitmap(file)}catch{throw Error('No se pudo interpretar la imagen. Prueba con una foto JPEG.')};const side=Math.min(1,960/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*side));canvas.height=Math.max(1,Math.round(bitmap.height*side));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();const value=canvas.toDataURL('image/jpeg',0.78);if(value.length>1_450_000)throw Error('La imagen procesada es demasiado grande. Reduce su tamaño.');return value;}
async function photoSelected(e){const file=e.target.files?.[0];if(!file)return;try{state.image=await compressImage(file);$('n04-preview').src=state.image;$('n04-preview').hidden=false;state.ingredients=[];state.calculated=null;$('n04-review').hidden=true;$('n04-nutrients').hidden=true;say('Foto preparada. Activa el consentimiento y pulsa Analizar.');}catch(err){say(err.message,true)}}
function start(){dialog.hidden=false;document.body.style.overflow='hidden';$('n04-url').value=localStorage.getItem(URL_KEY)||'';$('n04-token').value=sessionStorage.getItem(TOKEN_KEY)||'';$('n04-consent').checked=false;$('n04-preview').hidden=true;state.image=null;state.ingredients=[];state.calculated=null;$('n04-review').hidden=true;$('n04-nutrients').hidden=true;say('');}
function close(){dialog.hidden=true;document.body.style.overflow='';state.image=null;$('n04-preview').removeAttribute('src');}
function inject(){const main=$('main-content');if(!main||!main.textContent.includes('Registro mediante fotografía'))return;const section=[...main.querySelectorAll('section')].find(x=>x.textContent.includes('Estimación multimodal')||x.textContent.includes('Nutrición por fotografía · NUT-01')||x.querySelector('#n04-open'));if(!section)return;if(section.querySelector('#n04-open'))return;const latest=history()[0];section.innerHTML=`<div class="nut-v02-entry"><div><h3 class="panel-title">Nutrición IA por fotografía · NUT-01</h3><p class="page-desc">Reconoce alimentos con Gemma 4. Corrige cada ingrediente y su cantidad y calcula macro y micronutrientes con USDA. Solo funciona después de conectar tu Worker privado.</p><p class="page-desc n04-latest">${latest?`Última comida confirmada: ${escape(latest.dish)} · ${escape(latest.date)} (estimación nutricional)`: 'No hay comidas analizadas confirmadas todavía.'}</p></div><button id="n04-open" class="primary-btn" type="button">📷 Analizar comida con IA</button></div>`;}
const parent=$('main-content');if(parent){new MutationObserver(inject).observe(parent,{childList:true,subtree:false});inject();}
function rowOptions(row){return (row.options||[]).map(o=>`<button class="n04-option" data-match="${row.id}" data-fdc="${o.fdcId}" type="button">${escape(o.name)} <span style="color:#8a9c8c">(${escape(o.dataType)})</span></button>`).join('');}
function renderRows(){
 $('n04-rows').innerHTML=state.ingredients.map(r=>`<article class="n04-row"><div><label class="n04-field-label" for="n04-name-${r.id}">Alimento</label><input class="n04-input" id="n04-name-${r.id}" data-edit="${r.id}" value="${escape(r.name)}" maxlength="100" autocomplete="off" placeholder="Escribe un alimento"><div class="n04-match">Identificación: ${conf(r.identityConfidence)} · Cantidad: ${conf(r.portionConfidence)} · ${r.fdcId?'USDA #'+r.fdcId:'Sin coincidencia USDA'}</div><div class="n04-options" id="n04-options-${r.id}">${rowOptions(r)}</div></div><div><label class="n04-field-label">Gramos</label><input type="number" class="n04-input" data-grams="${r.id}" min="1" max="2000" step="1" value="${r.grams}"><label class="n04-field-label" style="margin-top:7px">Preparación</label><input class="n04-input" data-preparation="${r.id}" maxlength="45" value="${escape(r.preparation||'')}"><button class="n04-btn" style="margin-top:6px;padding:5px 8px;font-size:11px" data-remove="${r.id}" type="button">Eliminar</button></div></article>`).join('');
 $('n04-calculate').disabled=!state.ingredients.length||state.ingredients.some(r=>!r.fdcId||!Number.isFinite(+r.grams)||r.grams<1||r.grams>2000);
}
let counter=1;
function newRow(src){return {id:String(counter++),name:src.name||'',preparation:src.preparation||'',grams:src.grams||100,identityConfidence:src.identityConfidence||'no_evaluable',portionConfidence:src.portionConfidence||'no_evaluable',search:src.englishSearch||src.name||'',fdcId:null,options:[]};}
async function searchRow(row,query){if(!query||query.length<2)return;const id=row.id;try{const data=await post('/foods',{query});if(!state.ingredients.includes(row)||row.search!==query)return;row.options=data.options||[];const holder=$('n04-options-'+id);if(holder)holder.innerHTML=rowOptions(row);if(!row.options.length)say(`USDA no devolvió coincidencias para «${query}». Prueba en inglés.`,true);}catch(e){say(e.message,true)}}
async function analyzePhoto(){if(!state.image)throw Error('Primero toma o selecciona una foto.');if(!$('n04-consent').checked)throw Error('Necesitamos tu confirmación para enviar la foto a Cloudflare.');say('Analizando fotografía con Gemma 4…');const result=await post('/analyze',{image:state.image});state.dish=result.dish;state.notes=result.notes;state.hidden=result.hiddenIngredients||[];state.ingredients=(result.ingredients||[]).map(newRow);state.calculated=null;$('n04-dish').textContent=result.dish;$('n04-notes').textContent=[result.notes,state.hidden.length?'Posibles ingredientes no visibles: '+state.hidden.join(', '):''].filter(Boolean).join(' · ');$('n04-review').hidden=false;$('n04-nutrients').hidden=true;renderRows();say('La IA ha propuesto ingredientes. Busca y selecciona las coincidencias USDA antes de calcular.');await Promise.all(state.ingredients.map(async row=>{try{await searchRow(row,row.search)}catch{}}));}
function renderNutrients(){const v=state.calculated?.nutrients||{};const main=[['kcal','Energía'],['protein','Proteínas'],['carbs','Hidratos'],['fat','Grasas']];$('n04-summary').innerHTML=main.map(([k,label])=>`<div><strong>${v[k]?.value===null||v[k]?.value===undefined?'—':rounded(v[k].value)} ${escape(v[k]?.unit||'')}</strong><small>${label}${v[k]&&!v[k].complete?' · datos parciales':''}</small></div>`).join('');$('n04-micros').innerHTML=Object.entries(v).filter(([k])=>!main.some(([m])=>k===m)).map(([k,t])=>`<div style="padding:5px 0;border-bottom:1px solid #e5eae4">${escape(t.label)}: <strong>${t.value==null?'Sin datos':(t.complete?'':'≥ ')+rounded(t.value,2)+' '+escape(t.unit)}</strong>${t.complete?'':' · incompleto ('+t.covered+'/'+t.of+')'}</div>`).join('');$('n04-nutrients').hidden=false;}
async function calculate(){say('Consultando composición de alimentos en USDA…');const entries=state.ingredients.map(r=>({name:r.name,fdcId:r.fdcId,grams:r.grams}));const value=await post('/nutrition',{ingredients:entries});state.calculated=value;renderNutrients();say('Valores calculados desde USDA. Revisa las cantidades antes de confirmar.');}
function save(){if(!state.calculated)throw Error('Calcula primero los nutrientes desde USDA.');const item={id:'nut-'+Date.now(),date:new Date().toISOString().slice(0,10),dish:state.dish,ingredients:state.calculated.items,nutrients:state.calculated.nutrients,source:'USDA FoodData Central',aiModel:'Gemma 4',estimated:true,confirmedAt:new Date().toISOString()};try{localStorage.setItem(KEY,JSON.stringify([item,...history()].slice(0,90)))}catch{throw Error('No se pudieron guardar los datos en este navegador.')};close();const main=$('main-content');const notice=main?.querySelector('.n04-latest');if(notice)notice.textContent='Última comida confirmada: '+item.dish+' · '+item.date+' (estimación nutricional)';}
async function withBusy(fn){if(state.busy)return;state.busy=true;dialog.classList.add('n04-busy');try{await fn()}catch(e){say(e.message||'No se pudo completar la operación.',true)}finally{state.busy=false;dialog.classList.remove('n04-busy')}}
document.addEventListener('click',e=>{if(e.target.closest('#n04-open'))start();});
dialog.addEventListener('click',e=>{
 const t=e.target;
 if(t===dialog||t.closest('#n04-close')){close();return;}
 if(t.closest('#n04-camera')){$('n04-capture').click();return;}
 if(t.closest('#n04-gallery')){$('n04-file').click();return;}
 if(t.closest('#n04-connect')){try{const url=endpoint(),tkn=$('n04-token').value.trim();if(tkn.length<24)throw Error('La clave debe tener 24 caracteres como mínimo.');localStorage.setItem(URL_KEY,url);sessionStorage.setItem(TOKEN_KEY,tkn);$('n04-config').open=false;say('Conexión guardada para esta sesión.');}catch(err){say(err.message,true)}return;}
 if(t.closest('#n04-analyze')){withBusy(analyzePhoto);return;}
 if(t.closest('#n04-add')){state.ingredients.push(newRow({name:'',grams:100}));state.calculated=null;$('n04-nutrients').hidden=true;renderRows();return;}
 if(t.closest('#n04-calculate')){withBusy(calculate);return;}
 if(t.closest('#n04-save')){withBusy(save);return;}
 const rm=t.closest('[data-remove]');if(rm){state.ingredients=state.ingredients.filter(r=>r.id!==rm.dataset.remove);state.calculated=null;$('n04-nutrients').hidden=true;renderRows();return;}
 const match=t.closest('[data-match]');if(match){const row=state.ingredients.find(r=>r.id===match.dataset.match),opt=row?.options.find(o=>String(o.fdcId)===match.dataset.fdc);if(row&&opt){row.fdcId=opt.fdcId;row.name=opt.name;row.search=opt.name;row.options=[];state.calculated=null;$('n04-nutrients').hidden=true;renderRows();say('Alimento seleccionado: '+row.name+'.');}return;}
});
let debounce;
dialog.addEventListener('input',e=>{const t=e.target;
 if(t.dataset.edit){const row=state.ingredients.find(r=>r.id===t.dataset.edit);if(!row)return;row.name=t.value;row.search=t.value;row.fdcId=null;row.options=[];state.calculated=null;$('n04-nutrients').hidden=true;$('n04-calculate').disabled=true;clearTimeout(debounce);debounce=setTimeout(()=>{if(row.search.length>2)searchRow(row,row.search)},520);}
 if(t.dataset.grams){const row=state.ingredients.find(r=>r.id===t.dataset.grams);if(row){row.grams=Number(t.value);state.calculated=null;$('n04-nutrients').hidden=true;$('n04-calculate').disabled=state.ingredients.some(r=>!r.fdcId||!(r.grams>=1&&r.grams<=2000));}}
 if(t.dataset.preparation){const row=state.ingredients.find(r=>r.id===t.dataset.preparation);if(row)row.preparation=t.value;}
});
$('n04-file').addEventListener('change',photoSelected);
$('n04-capture').addEventListener('change',photoSelected);
})();
