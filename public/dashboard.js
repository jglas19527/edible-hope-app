(function () {
  function fmtHours(hours) {
    return hours.toFixed(1);
  }

  function statTile(value, label) {
    const div = document.createElement('div');
    div.className = 'stat-tile';
    div.innerHTML = `<div class="stat-value">${value}</div><div class="stat-label">${label}</div>`;
    return div;
  }

  function renderVolunteerStats() {
    const stats = VolunteerDB.getVolunteerStats();
    const grid = document.getElementById('volunteer-stats');
    grid.innerHTML = '';
    grid.appendChild(statTile(stats.totalVolunteers, 'Total Volunteers'));
    grid.appendChild(statTile(stats.currentlyClockedIn, 'Currently Clocked In'));
    grid.appendChild(statTile(stats.totalVisits, 'Total Visits'));
    grid.appendChild(statTile(fmtHours(stats.totalHours), 'Total Hours (all time)'));
    grid.appendChild(statTile(fmtHours(stats.weekHours), 'Hours (last 7 days)'));
    grid.appendChild(statTile(fmtHours(stats.monthHours), 'Hours (last 30 days)'));

    const list = document.getElementById('top-volunteers');
    list.innerHTML = '';
    if (stats.topVolunteers.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No completed visits yet.';
      list.appendChild(li);
    }
    stats.topVolunteers.forEach((v) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = v.name;
      const hours = document.createElement('span');
      hours.className = 'tv-hours';
      hours.textContent = `${fmtHours(v.hours)} hrs`;
      li.append(name, hours);
      list.appendChild(li);
    });
  }

  function renderMealStats() {
    const stats = VolunteerDB.getMealStats();
    const grid = document.getElementById('meal-stats');
    grid.innerHTML = '';
    grid.appendChild(statTile(stats.totalMeals, 'Total Meals Served'));
    grid.appendChild(statTile(stats.weekMeals, 'Meals (last 7 days)'));
    grid.appendChild(statTile(stats.monthMeals, 'Meals (last 30 days)'));
  }

  function renderMealsTable() {
    const entries = VolunteerDB.listMeals();
    const body = document.getElementById('meals-body');
    body.innerHTML = '';
    entries.forEach((m) => {
      const tr = document.createElement('tr');
      const dateCell = document.createElement('td');
      dateCell.textContent = m.date;
      const countCell = document.createElement('td');
      countCell.textContent = m.count;
      const actionsCell = document.createElement('td');
      actionsCell.className = 'meals-row-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-small-edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        document.getElementById('meals-date').value = m.date;
        document.getElementById('meals-count').value = m.count;
        document.getElementById('meals-count').focus();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-small-danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Delete the meals entry for ${m.date}?`)) {
          VolunteerDB.deleteMeals(m.date);
          renderAll();
        }
      });

      actionsCell.append(editBtn, deleteBtn);
      tr.append(dateCell, countCell, actionsCell);
      body.appendChild(tr);
    });
  }

  function renderAll() {
    renderVolunteerStats();
    renderMealStats();
    renderMealsTable();
  }

  document.getElementById('meals-date').value = VolunteerDB.todayStr();

  document.getElementById('meals-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('meals-error');
    errorEl.classList.add('hidden');

    const date = document.getElementById('meals-date').value;
    const count = document.getElementById('meals-count').value;

    try {
      VolunteerDB.setMealsForDate(date, count);
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong.';
      errorEl.classList.remove('hidden');
      return;
    }

    document.getElementById('meals-count').value = '';
    renderAll();
  });

  renderAll();
})();
