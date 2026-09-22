(function () {
  const views = {
    home: document.getElementById('view-home'),
    confirm: document.getElementById('view-confirm'),
    new: document.getElementById('view-new'),
    success: document.getElementById('view-success'),
  };

  let volunteers = [];
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

  function refreshVolunteers() {
    volunteers = VolunteerDB.listVolunteers();
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
      if (VolunteerDB.getOpenSession(v.id)) {
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

  function openConfirm(id) {
    const volunteer = VolunteerDB.getVolunteer(id);
    if (!volunteer) {
      refreshVolunteers();
      return;
    }

    document.getElementById('confirm-name').textContent =
      `${volunteer.firstName} ${volunteer.lastName}`;

    const actionBtn = document.getElementById('confirm-action');
    const statusText = document.getElementById('confirm-status');
    const openSession = VolunteerDB.getOpenSession(volunteer.id);

    if (openSession) {
      const signInTime = new Date(openSession.signInTime);
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

  function doSignIn(id) {
    const volunteer = VolunteerDB.getVolunteer(id);
    const session = VolunteerDB.signIn(id);
    showSuccess(
      `You're signed in, ${volunteer.firstName}!`,
      `Signed in at ${new Date(session.signInTime).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}. Thank you for volunteering!`
    );
  }

  function doSignOut(id) {
    const volunteer = VolunteerDB.getVolunteer(id);
    let session;
    try {
      session = VolunteerDB.signOut(id);
    } catch (err) {
      return showError(err.message);
    }

    const inTime = new Date(session.signInTime);
    const outTime = new Date(session.signOutTime);
    const minutes = Math.round((outTime - inTime) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const duration = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

    showSuccess(
      `See you next time, ${volunteer.firstName}!`,
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
    refreshVolunteers();
    returnTimer = setTimeout(goHome, 6000);
  }

  function goHome() {
    document.getElementById('search').value = '';
    showView('home');
    refreshVolunteers();
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

  document.getElementById('new-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('new-error');
    errorEl.classList.add('hidden');

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();

    let volunteer;
    try {
      volunteer = VolunteerDB.createVolunteer({ firstName, lastName, email, address });
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong.';
      errorEl.classList.remove('hidden');
      return;
    }

    const session = VolunteerDB.signIn(volunteer.id);

    showSuccess(
      `Welcome, ${volunteer.firstName}!`,
      `You're all signed in as of ${new Date(session.signInTime).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}. Thanks for volunteering!`
    );
  });

  refreshVolunteers();
})();
