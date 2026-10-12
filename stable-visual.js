/* MyHealth OS stable visual: progressive presentation enhancement.
 * Does not read or write browser persistence, credentials or health records.
 * Does NOT intercept original navigation or form handlers.
 */
(()=>{'use strict';
  const main=document.getElementById('main-content');
  if(!main)return;
  function decorate(){
    const hero=main.querySelector('.hero-banner');
    if(!hero||main.querySelector('.mh-stable-quick'))return;
    const head=main.querySelector('.page-head');
    const title=head?.querySelector('.page-title');
    const desc=head?.querySelector('.page-desc');
    const overline=head?.querySelector('.eyebrow');
    if(title)title.textContent='Tu día, en perspectiva.';
    if(desc)desc.textContent='Descanso, movimiento y salud en un mismo lugar. Los indicadores actuales son de ejemplo.';
    if(overline)overline.textContent='MYHEALTH OS · TU PANORAMA';
    const heroTitle=hero.querySelector('h2');
    const heroDesc=hero.querySelector('p');
    const heroLabel=hero.querySelector('.hero-tag');
    if(heroTitle)heroTitle.textContent='Lo que importa, en un vistazo.';
    if(heroDesc)heroDesc.textContent='Una perspectiva de tu día para orientarte entre hábitos, actividad y alimentación. Los valores aún son simulados.';
    if(heroLabel)heroLabel.lastChild && heroLabel.lastChild.nodeType===Node.TEXT_NODE && (heroLabel.lastChild.textContent=' TU ESPACIO PERSONAL');
    const quick=document.createElement('div');quick.className='mh-stable-quick';quick.setAttribute('aria-label','Accesos rápidos');
    // data-page is the original app's documented delegated navigation path.
    quick.innerHTML=`<button type="button" class="mh-stable-action" data-page="nutrition"><span class="mh-stable-action-icon" aria-hidden="true">◉</span><span class="mh-stable-action-copy"><strong>Nutrición</strong><small>Comidas y foto IA</small></span><span class="mh-stable-action-arrow" aria-hidden="true">↗</span></button><button type="button" class="mh-stable-action" data-page="activity"><span class="mh-stable-action-icon" aria-hidden="true">↗</span><span class="mh-stable-action-copy"><strong>Actividad</strong><small>Entrenos y movimiento</small></span><span class="mh-stable-action-arrow" aria-hidden="true">↗</span></button><button type="button" class="mh-stable-action" data-page="labs"><span class="mh-stable-action-icon" aria-hidden="true">✦</span><span class="mh-stable-action-copy"><strong>Analíticas</strong><small>Histórico clínico demo</small></span><span class="mh-stable-action-arrow" aria-hidden="true">↗</span></button>`;
    hero.insertAdjacentElement('afterend',quick);
  }
  // Observer only adds visual content after the original application has rendered.
  new MutationObserver(decorate).observe(main,{childList:true});
  decorate();
})();
