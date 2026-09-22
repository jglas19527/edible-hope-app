(function () {
  const views = {
    home: document.getElementById('view-home'),
    confirm: document.getElementById('view-confirm'),
    new: document.getElementById('view-new'),
    success: document.getElementById('view-success'),
  };

  let volunteers = [];
  let selectedId = null;
  let returnTimer = null;

  function showView(name) {
    Object.values(views).forEach((v) => v.classList.add('hidden'));
    views[name].classList.remove('hidden');
    if (returnTimer) {
      clearTimeout(returnTimer);
      returnTimer = null;
    }
  }

  function updateClock() {
    const el = document.getElementById('clock');
    const now = new Date();
    el.textContent = now.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  updateClock();
  setInterval(updateClock, 15000);

  async function fetchVolunteers() {
    const res = await fetch('/api/volunteers');
    volunteers = await res.json();
    renderList();
  }

  function renderList() {
    const query = document.getElementById('search').value.trim().toLowerCase();
    const listEl = document.getElementById('volunteer-list');
    const noResults = document.getElementById('no-results');
    listEl.innerHTML = '';

    const filtered = query
      ? volunteers.filter((v) =>
          `${v.firstName} ${v.lastName}`.toLowerCase().includes(query)
        )
      : volunteers;

    noResults.classList.toggle('hidden', filtered.length > 0);

    filtered.forEach((v) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'volunteer-btn';
      btn.innerHTML = `<span>${escapeHtml(v.firstName)} ${escapeHtml(v.lastName)}</span>`;
      if (v.signedIn) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'Signed In';
        btn.appendChild(badge);
      }
      btn.addEventListener('click', () => openConfirm(v.id));
      listEl.appendChild(btn);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function openConfirm(id) {
    selectedId = id;
    const res = await fetch(`/api/volunteers/${id}`);
    if (!res.ok) {
      await fetchVolunteers();
      return;
    }
    const volunteer = await res.json();

    document.getElementById('confirm-name').textContent =
      `${volunteer.firstName} ${volunteer.lastName}`;

    const actionBtn = document.getElementById('confirm-action');
    const statusText = document.getElementById('confirm-status');

    if (volunteer.signedIn) {
      const signInTime = new Date(volunteer.openSession.signInTime);
      statusText.textContent = `Signed in at ${signInTime.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })} on ${signInTime.toLocaleDateString()}`;
      actionBtn.textContent = 'SIGN OUT';
      actionBtn.className = 'btn btn-huge btn-action signed-in';
      actionBtn.onclick = () => doSignOut(volunteer.id);
    } else {
      statusText.textContent = 'Ready to volunteer today?';
      actionBtn.textContent = 'SIGN IN';
      actionBtn.className = 'btn btn-huge btn-action signed-out';
      actionBtn.onclick = () => doSignIn(volunteer.id);
    }

    showView('confirm');
  }

  async function doSignIn(id) {
    const res = await fetch(`/api/volunteers/${id}/signin`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return showError(data.error);
    showSuccess(
      `You're signed in, ${data.volunteer.firstName}!`,
      `Signed in at ${new Date(data.session.signInTime).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}. Thank you for volunteering!`
    );
  }

  async function doSignOut(id) {
    const res = await fetch(`/api/volunteers/${id}/signout`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return showError(data.error);

    const inTime = new Date(data.session.signInTime);
    const outTime = new Date(data.session.signOutTime);
    const minutes = Math.round((outTime - inTime) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const duration = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

    showSuccess(
      `See you next time, ${data.volunteer.firstName}!`,
      `You volunteered for ${duration} today. Thank you!`
    );
  }

  function showError(message) {
    alert(message || 'Something went wrong. Please try again.');
  }

  function showSuccess(message, detail) {
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-detail').textContent = detail;
    showView('success');
    fetchVolunteers();
    returnTimer = setTimeout(goHome, 6000);
  }

  function goHome() {
    document.getElementById('search').value = '';
    selectedId = null;
    showView('home');
    fetchVolunteers();
  }

  document.getElementById('btn-new-volunteer').addEventListener('click', () => {
    document.getElementById('new-form').reset();
    document.getElementById('new-error').classList.add('hidden');
    showView('new');
  });

  document.getElementById('confirm-back').addEventListener('click', goHome);
  document.getElementById('new-back').addEventListener('click', goHome);
  document.getElementById('success-done').addEventListener('click', goHome);

  document.getElementById('search').addEventListener('input', renderList);

  document.getElementById('new-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('new-error');
    errorEl.classList.add('hidden');

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();

    if (!firstName || !lastName) {
      errorEl.textContent = 'Please enter your first and last name.';
      errorEl.classList.remove('hidden');
      return;
    }

    const res = await fetch('/api/volunteers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, address }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Something went wrong.';
      errorEl.classList.remove('hidden');
      return;
    }

    const signinRes = await fetch(`/api/volunteers/${data.id}/signin`, { method: 'POST' });
    const signinData = await signinRes.json();

    showSuccess(
      `Welcome, ${data.firstName}!`,
      `You're all signed in as of ${new Date(
        signinData.session.signInTime
      ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Thanks for volunteering!`
    );
  });

  fetchVolunteers();
})();
