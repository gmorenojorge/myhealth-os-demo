/* MyHealth OS NUT-01 / v0.2 experimental integration.
   Exclusively synthetic fixture values. No vision model, no upload, no backend. */
(() => {
  'use strict';
  const KEY = 'myhealth_nutrition_addon_v02';
  const foods = {
    chicken:{label:'Pollo cocinado',kcal:165,p:31,c:0,f:3.6,fiber:0,vitC:null,b12:0.3,iron:1,calcium:15},
    rice:{label:'Arroz cocido',kcal:130,p:2.7,c:28,f:0.3,fiber:0.4,vitC:null,b12:null,iron:0.2,calcium:10},
    broccoli:{label:'Brócoli cocido',kcal:35,p:2.4,c:7.2,f:0.4,fiber:3.3,vitC:64,b12:null,iron:0.7,calcium:40},
    oil:{label:'Aceite de oliva',kcal:884,p:0,c:0,f:100,fiber:0,vitC:null,b12:null,iron:null,calcium:null},
    salmon:{label:'Salmón cocinado',kcal:206,p:22,c:0,f:12,fiber:0,vitC:null,b12:2.8,iron:0.4,calcium:9},
    potato:{label:'Patata cocida',kcal:87,p:1.9,c:20,f:0.1,fiber:1.8,vitC:9,b12:null,iron:0.3,calcium:5},
    tomato:{label:'Tomate',kcal:18,p:0.9,c:3.9,f:0.2,fiber:1.2,vitC:14,b12:null,iron:0.3,calcium:10},
    egg:{label:'Huevo cocido',kcal:155,p:12.6,c:1.1,f:10.6,fiber:0,vitC:null,b12:0.9,iron:1.2,calcium:50},
    bread:{label:'Pan integral',kcal:247,p:13,c:41,f:4.2,fiber:7,vitC:null,b12:null,iron:2.5,calcium:90},
    yogurt:{label:'Yogur natural',kcal:61,p:3.5,c:4.7,f:3.3,fiber:0,vitC:null,b12:0.8,iron:null,calcium:121},
    avocado:{label:'Aguacate',kcal:160,p:2,c:8.5,f:14.7,fiber:6.7,vitC:10,b12:null,iron:0.6,calcium:12}
  };
  const extraStyles = document.createElement('style');
  extraStyles.textContent = `
    .nut-v02-entry{display:flex;gap:13px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
    .nut-v02-overlay[hidden]{display:none!important}
    .nut-v02-overlay{position:fixed;inset:0;z-index:10000;background:rgba(18,34,24,.56);display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto}
    .nut-v02-dialog{width:min(630px,100%);max-height:92dvh;overflow:auto;background:#fff;color:#243b2e;border-radius:20px;padding:22px;box-shadow:0 20px 80px #0002;font:inherit}
    .nut-v02-dialog h2{font-size:20px;margin:0 0 6px}.nut-v02-dialog p{color:#6c8070;line-height:1.5;font-size:12px}
    .nut-v02-row{display:grid;grid-template-columns:minmax(100px,1fr) 90px 32px;gap:8px;align-items:center;margin:8px 0}
    .nut-v02-row select,.nut-v02-row input{max-width:100%;min-width:0;border:1px solid #dce6dc;border-radius:10px;padding:9px;background:white;color:#26372a;font:inherit}
    .nut-v02-dialog button{border:1px solid #dce6dc;border-radius:10px;padding:10px;font:inherit;background:#eef4ee;color:#2e674c;cursor:pointer}
    .nut-v02-dialog button.primary{background:#2e674c;color:white}.nut-v02-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
    .nut-v02-totals{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:14px 0}
    .nut-v02-total{background:#f1f5ef;border-radius:10px;padding:9px 5px;text-align:center}
    .nut-v02-total b{display:block;font-size:17px}.nut-v02-total span{font-size:10px;color:#67806f}
    .nut-v02-photo[hidden]{display:none!important}
    .nut-v02-photo{max-width:100%;max-height:150px;object-fit:contain;display:block;margin:8px auto;border-radius:12px}
    .nut-v02-note{background:#fcf5e9;border:1px solid #f0e2cd;border-radius:10px;padding:10px;color:#78644d;font-size:12px;line-height:1.5}
    .nut-v02-x{float:right}
    @media(max-width:460px){.nut-v02-dialog{padding:14px}.nut-v02-row{grid-template-columns:minmax(100px,1fr) 68px 29px}.nut-v02-totals{grid-template-columns:repeat(2,1fr)}}`;
  document.head.appendChild(extraStyles);
  const state={items:[],photo:null,photoURL:null};
  const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(v,d=0)=>Number(v).toLocaleString('es-ES',{maximumFractionDigits:d});
  const options=(selected)=>Object.entries(foods).map(([id,f])=>`<option value="${id}" ${selected===id?'selected':''}>${f.label}</option>`).join('');
  const readHistory=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return []}};
  function inject(){
    const main=document.querySelector('#main-content');
    if(!main||main.querySelector('#nut-v02-open')||!main.textContent.includes('Registro mediante fotografía'))return;
    const section=[...main.querySelectorAll('section')].find(x=>x.textContent.includes('Estimación multimodal'));
    if(!section)return;
    const history=readHistory();
    section.innerHTML=`<div class="nut-v02-entry"><div><h3 class="panel-title">Nutrición por fotografía · NUT-01</h3><p class="page-desc">Añade una foto local y confirma ingredientes y cantidades. Cálculo <strong>simulado</strong>, sin reconocimiento automático ni envío de imágenes.</p>${history.length?`<p class="page-desc">Último registro de demostración: ${escape(history[0].name)} · ${fmt(history[0].kcal)} kcal (cifras ficticias)</p>`:''}</div><button id="nut-v02-open" type="button" class="primary-btn">📷 Probar fotografía</button></div>`;
  }
  const overlay=document.createElement('div');overlay.className='nut-v02-overlay';overlay.hidden=true;overlay.innerHTML=`<div class="nut-v02-dialog" role="dialog" aria-modal="true" aria-label="Nutrición por fotografía"><button type="button" class="nut-v02-x" id="nut-v02-close" aria-label="Cerrar">✕</button><h2>Nutrición por fotografía</h2><p>La foto solo se previsualiza en tu dispositivo. El reconocimiento automático por IA todavía no existe en esta demo.</p><div class="nut-v02-note">Solo para probar con datos ficticios. Los valores por 100 g son ejemplos artificiales, NO equivalen a una tabla nutricional verificada.</div><div style="margin-top:12px"><label for="nut-v02-photo">Seleccionar imagen</label><input id="nut-v02-photo" type="file" accept="image/*" style="display:block;max-width:100%;margin-top:6px"/><img id="nut-v02-preview" class="nut-v02-photo" alt="Previsualización local" hidden></div><h3 style="margin:18px 0 8px">Ingredientes y cantidades</h3><div id="nut-v02-ingredients"></div><button id="nut-v02-add" type="button">+ Añadir ingrediente</button><h3 style="margin:16px 0 4px">Estimación simulada</h3><div id="nut-v02-totals" class="nut-v02-totals"></div><div id="nut-v02-micros" style="font-size:12px;color:#6c8070"></div><div class="nut-v02-actions"><button type="button" id="nut-v02-example">Usar plato ficticio</button><button type="button" class="primary" id="nut-v02-save">Guardar en diario de prueba</button></div><p id="nut-v02-message" role="status" style="min-height:18px"></p></div>`;
  document.body.appendChild(overlay);
  const get=id=>document.getElementById(id);
  const nutrientKeys=['kcal','p','c','f','fiber','vitC','b12','iron','calcium'];
  function calculate(){
    const totals=Object.fromEntries(nutrientKeys.map(k=>[k,{total:0,count:0,missing:0}]));
    for(const row of state.items){const food=foods[row.food],portion=row.grams/100;for(const key of nutrientKeys){if(food[key]===null){totals[key].missing++}else{totals[key].count++;totals[key].total+=food[key]*portion;}}}
    return totals;
  }
  function draw(){
    get('nut-v02-ingredients').innerHTML=state.items.map((r,i)=>`<div class="nut-v02-row"><select data-nut-select="${i}" aria-label="Alimento">${options(r.food)}</select><input data-nut-grams="${i}" type="number" aria-label="Cantidad en gramos" min="1" max="2000" step="1" value="${r.grams}"><button type="button" data-nut-remove="${i}" aria-label="Quitar ingrediente">×</button></div>`).join('')||'<p>Selecciona un plato de prueba o añade un ingrediente.</p>';
    const c=calculate();const summaries=[['kcal','Energía','kcal'],['p','Proteínas','g'],['c','Hidratos','g'],['f','Grasas','g']];
    get('nut-v02-totals').innerHTML=summaries.map(([k,name,u])=>`<div class="nut-v02-total"><b>${c[k].count?fmt(c[k].total,1):'—'}</b><span>${name} (${u})</span></div>`).join('');
    get('nut-v02-micros').textContent=[['fiber','Fibra','g'],['vitC','Vitamina C','mg'],['b12','B12','µg'],['iron','Hierro','mg'],['calcium','Calcio','mg']].map(([k,n,u])=>`${n}: ${c[k].count?(c[k].missing?'≥ ':'')+fmt(c[k].total,1)+' '+u:'sin dato'}`).join(' · ');
    get('nut-v02-save').disabled=!state.items.length;
  }
  function open(){overlay.hidden=false;state.items=[{food:'chicken',grams:150},{food:'rice',grams:160},{food:'broccoli',grams:90},{food:'oil',grams:10}];get('nut-v02-message').textContent='';draw();}
  function close(){overlay.hidden=true;get('nut-v02-photo').value='';get('nut-v02-preview').hidden=true;get('nut-v02-preview').removeAttribute('src');if(state.photoURL){URL.revokeObjectURL(state.photoURL);state.photoURL=null;}}
  document.addEventListener('click',e=>{if(e.target.closest('#nut-v02-open'))open();});
  overlay.addEventListener('click',e=>{
    if(e.target===overlay||e.target.closest('#nut-v02-close')){close();return;}
    if(e.target.closest('#nut-v02-add')){state.items.push({food:'tomato',grams:100});draw();}
    if(e.target.closest('#nut-v02-example')){state.items=[{food:'salmon',grams:150},{food:'potato',grams:175},{food:'broccoli',grams:100}];draw();}
    const remove=e.target.closest('[data-nut-remove]');if(remove){state.items.splice(Number(remove.dataset.nutRemove),1);draw();}
    if(e.target.closest('#nut-v02-save'))save();
  });
  overlay.addEventListener('input',e=>{const target=e.target;const n=Number(target.dataset.nutGrams);if(target.dataset.nutGrams!==undefined&&state.items[n]){const grams=Number(target.value);if(Number.isFinite(grams)&&grams>=1&&grams<=2000){state.items[n].grams=grams;drawTotalsOnly();}}});
  function drawTotalsOnly(){const c=calculate();get('nut-v02-totals').innerHTML=[['kcal','Energía','kcal'],['p','Proteínas','g'],['c','Hidratos','g'],['f','Grasas','g']].map(([k,name,u])=>`<div class="nut-v02-total"><b>${c[k].count?fmt(c[k].total,1):'—'}</b><span>${name} (${u})</span></div>`).join('');get('nut-v02-micros').textContent=[['fiber','Fibra','g'],['vitC','Vitamina C','mg'],['b12','B12','µg'],['iron','Hierro','mg'],['calcium','Calcio','mg']].map(([k,n,u])=>`${n}: ${c[k].count?(c[k].missing?'≥ ':'')+fmt(c[k].total,1)+' '+u:'sin dato'}`).join(' · ');}
  overlay.addEventListener('change',e=>{const t=e.target;if(t.dataset.nutSelect!==undefined){const n=Number(t.dataset.nutSelect);if(state.items[n]&&foods[t.value]){state.items[n].food=t.value;draw();}}});
  get('nut-v02-photo').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')||file.size>8*1024*1024){get('nut-v02-message').textContent='Selecciona una imagen de menos de 8 MB.';return;}if(state.photoURL)URL.revokeObjectURL(state.photoURL);const reader=new FileReader();reader.onload=()=>{const img=get('nut-v02-preview');img.src=String(reader.result);img.hidden=false;};reader.onerror=()=>{get('nut-v02-message').textContent='No se pudo abrir la imagen.';};reader.readAsDataURL(file);});
  function save(){
    if(!state.items.length)return;
    const c=calculate();const values={name:'Plato ficticio NUT-01',category:'Comida',protein:Math.round(c.p.total*10)/10,carbs:Math.round(c.c.total*10)/10,fat:Math.round(c.f.total*10)/10,calories:Math.round(c.kcal.total)};
    close();
    const add=document.querySelector('[data-action="add-meal"]');if(!add){get('nut-v02-message').textContent='Abre el módulo Nutrición e inténtalo otra vez.';return;}
    add.click();const form=document.getElementById('meal-form');if(!form)return;
    for(const [name,value] of Object.entries(values)){const el=form.querySelector(`[name="${name}"]`);if(el)el.value=value;}
    const history=readHistory();history.unshift({...values,date:form.querySelector('[name="date"]')?.value,synthetic:true,ingredients:state.items.map(x=>({...x})),micros:{fiber:c.fiber,vitC:c.vitC,b12:c.b12,iron:c.iron,calcium:c.calcium}});
    try{localStorage.setItem(KEY,JSON.stringify(history.slice(0,20)));}catch{}
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  }
  // DOM rendering in Alpha 0.1 replaces #main-content on each navigation.
  const main=document.querySelector('#main-content');if(main){new MutationObserver(inject).observe(main,{childList:true,subtree:false});inject();}
})();
