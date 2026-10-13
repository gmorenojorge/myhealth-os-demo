/* MyHealth OS LAB 0.11.2 — optional remembered Worker token.
 * Add-on only. Does not change nutrition, voice, stable app, or the Worker.
 * WARNING: If explicitly saved, the bearer token is stored in localStorage as plaintext.
 */
(() => {
  'use strict';
  const KEY = 'myhealth_os_lab_companion_access_0112';
  const TOKEN_ID = 'hc-chat-token';
  const CONTAINER_ID = 'hc-access-actions-0112';
  const isValid = value => typeof value === 'string' && value.length >= 16 && value.length <= 300;

  function savedToken() {
    try { const v = localStorage.getItem(KEY); return isValid(v) ? v : ''; }
    catch { return ''; }
  }
  function writeToken(value) {
    try { localStorage.setItem(KEY, value); return true; }
    catch { return false; }
  }
  function removeToken() {
    try { localStorage.removeItem(KEY); return true; }
    catch { return false; }
  }
  function feedback(message, isError = false) {
    const node = document.getElementById('hc-access-feedback-0112');
    if (node) { node.textContent = message; node.style.color = isError ? '#ad4b3f' : '#647184'; }
  }
  function synchronizeInput(input, value) {
    input.value = value;
    // The existing Companion stores its active token in a private closure;
    // this event updates it without changing or exposing that closure.
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function refreshActions() {
    const note = document.getElementById('hc-access-feedback-0112');
    if (note && !note.dataset.feedbackSet) {
      note.textContent = savedToken()
        ? 'Acceso guardado en este navegador. Se rellenará automáticamente al abrir Companion.'
        : 'Acceso temporal: tendrás que introducir el token al volver a abrir Safari.';
    }
  }
  function attach() {
    const input = document.getElementById(TOKEN_ID);
    if (!input) return;
    const parent = input.closest('.hc-connection');
    if (!parent) return;

    if (!input.dataset.accessInitialized0112) {
      input.dataset.accessInitialized0112 = 'true';
      const remembered = savedToken();
      if (remembered && !input.value) synchronizeInput(input, remembered);
    }
    if (parent.querySelector('#' + CONTAINER_ID)) return;

    const actions = document.createElement('div');
    actions.id = CONTAINER_ID;
    actions.innerHTML = `
      <div class="hc-access-buttons-0112">
        <button type="button" id="hc-access-remember-0112">Recordar acceso en este dispositivo</button>
        <button type="button" id="hc-access-forget-0112">Olvidar acceso</button>
      </div>
      <p id="hc-access-feedback-0112" role="status"></p>
      <p class="hc-access-warning-0112">Opcional. Si lo guardas, el token quedará almacenado sin cifrado adicional en Safari y accesible para scripts de este origen. Úsalo solo en un dispositivo privado y de confianza. No se guarda en GitHub. La autorización para enviar datos sigue siendo independiente.</p>`;
    input.insertAdjacentElement('afterend', actions);
    refreshActions();
    actions.querySelector('#hc-access-remember-0112').addEventListener('click', () => {
      const value = input.value.trim();
      if (!isValid(value)) {
        feedback('Introduce primero tu token completo (mínimo 16 caracteres).', true);
        return;
      }
      if (!writeToken(value)) {
        feedback('Safari no ha permitido guardar el acceso.', true);
        return;
      }
      synchronizeInput(input, value);
      const note = document.getElementById('hc-access-feedback-0112');
      if (note) note.dataset.feedbackSet = 'true';
      feedback('Acceso guardado en este navegador. Se rellenará automáticamente.');
    });
    actions.querySelector('#hc-access-forget-0112').addEventListener('click', () => {
      if (!removeToken()) {
        feedback('Safari no ha permitido borrar el acceso.', true);
        return;
      }
      synchronizeInput(input, '');
      const note = document.getElementById('hc-access-feedback-0112');
      if (note) note.dataset.feedbackSet = 'true';
      feedback('Acceso olvidado en este navegador y eliminado de esta sesión.');
    });
  }
  const styles = document.createElement('style');
  styles.textContent = `
    .hc-access-buttons-0112 { display:flex; flex-wrap:wrap; gap:7px; margin-top:11px }
    .hc-access-buttons-0112 button { font:inherit; font-size:11px; font-weight:750; border-radius:11px; min-height:42px; padding:10px 12px; cursor:pointer }
    #hc-access-remember-0112 { color:#fff; background:#293d56; border:1px solid #293d56 }
    #hc-access-forget-0112 { color:#9a534a; background:#fff; border:1px solid #e9cec9 }
    #hc-access-feedback-0112 { font-size:11px; color:#647184; line-height:1.5; margin:9px 0 4px }
    .hc-access-warning-0112 { font-size:10px; line-height:1.6; color:#828a95; margin:9px 0 4px }
  `;
  document.head.appendChild(styles);

  const host = document.getElementById('otherContent');
  if (host) {
    // Root-level changes only: our own controls do not retrigger the observer.
    new MutationObserver(attach).observe(host, { childList: true });
  }
  attach();
})();
