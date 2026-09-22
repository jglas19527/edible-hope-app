(function () {
  function load() {
    const rows = VolunteerDB.listHistory();
    const body = document.getElementById('history-body');
    body.innerHTML = '';
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      const signIn = new Date(r.signInTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const signOut = r.signOutTime
        ? new Date(r.signOutTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : '';
      let duration = '';
      if (r.durationMinutes !== null) {
        const h = Math.floor(r.durationMinutes / 60);
        const m = r.durationMinutes % 60;
        duration = h > 0 ? `${h} hr ${m} min` : `${m} min`;
      }
      const nameCell = document.createElement('td');
      nameCell.textContent = `${r.firstName} ${r.lastName}`;
      const dateCell = document.createElement('td');
      dateCell.textContent = r.date;
      const signInCell = document.createElement('td');
      signInCell.textContent = signIn;
      const signOutCell = document.createElement('td');
      signOutCell.textContent = signOut || 'Still signed in';
      if (!r.signOutTime) signOutCell.classList.add('open-row');
      const durationCell = document.createElement('td');
      durationCell.textContent = duration;

      tr.append(nameCell, dateCell, signInCell, signOutCell, durationCell);
      body.appendChild(tr);
    });
  }

  document.getElementById('download-csv').addEventListener('click', () => {
    const csv = VolunteerDB.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'volunteer-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  load();
})();
