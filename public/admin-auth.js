// Lightweight PIN gate for staff-only admin pages. This is a deterrent for
// casual visitors, not real security: the PIN's hash ships in this file, so
// anyone determined enough to read the source and brute-force a short PIN
// can get past it. It exists only to keep volunteer PII from being visible
// to anyone who happens across the site URL.
//
// To change the PIN: compute a new hash with
//   node -e "console.log(require('crypto').createHash('sha256').update('NEWPIN').digest('hex'))"
// and paste the result below.
(function () {
  const PIN_HASH = '13c90d1ccd3d462de40b40754e17eb4e5658e9fd8ac91aa66994634807f8020c';
  const SESSION_KEY = 'admin-unlocked';

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function reveal() {
    const content = document.getElementById('admin-content');
    if (content) content.classList.remove('hidden');
  }

  function showGate() {
    const overlay = document.createElement('div');
    overlay.className = 'admin-gate';
    overlay.innerHTML = `
      <div class="admin-gate-box">
        <h2>Staff Access</h2>
        <p>Enter the admin PIN to continue.</p>
        <input type="password" inputmode="numeric" autocomplete="off" id="admin-pin-input" class="field-input" placeholder="PIN" />
        <p id="admin-pin-error" class="error-text hidden">Incorrect PIN.</p>
        <button id="admin-pin-submit" class="btn btn-primary btn-huge">Unlock</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = document.getElementById('admin-pin-input');
    const error = document.getElementById('admin-pin-error');
    const submit = document.getElementById('admin-pin-submit');

    async function attempt() {
      const hash = await sha256Hex(input.value.trim());
      if (hash === PIN_HASH) {
        sessionStorage.setItem(SESSION_KEY, '1');
        overlay.remove();
        reveal();
      } else {
        error.classList.remove('hidden');
        input.value = '';
        input.focus();
      }
    }

    submit.addEventListener('click', attempt);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attempt();
    });
    input.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      reveal();
    } else {
      showGate();
    }
  });
})();
