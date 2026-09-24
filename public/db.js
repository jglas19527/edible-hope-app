// Client-side data store. Everything lives in this browser's localStorage,
// so the app works with zero network connection once it has loaded once.
(function (global) {
  const STORAGE_KEY = 'volunteer-app-db-v1';

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // Local (device) date, not UTC, so the "day" always matches the wall
  // clock the volunteers and staff are looking at.
  function todayStr(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { volunteers: [], sessions: [], meals: [] };
      const parsed = JSON.parse(raw);
      return {
        volunteers: parsed.volunteers || [],
        sessions: parsed.sessions || [],
        meals: parsed.meals || [],
      };
    } catch (e) {
      console.error('Could not read saved volunteer data; starting fresh.', e);
      return { volunteers: [], sessions: [], meals: [] };
    }
  }

  let db = load();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function listVolunteers() {
    return [...db.volunteers].sort((a, b) => {
      const an = `${a.lastName} ${a.firstName}`.toLowerCase();
      const bn = `${b.lastName} ${b.firstName}`.toLowerCase();
      return an.localeCompare(bn);
    });
  }

  function getVolunteer(id) {
    return db.volunteers.find((v) => v.id === id) || null;
  }

  function isValidName(str) {
    return typeof str === 'string' && str.trim().length > 0;
  }

  function isValidEmail(str) {
    if (!str) return true; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
  }

  function createVolunteer({ firstName, lastName, email, address }) {
    if (!isValidName(firstName) || !isValidName(lastName)) {
      throw new Error('First and last name are required.');
    }
    if (!isValidEmail(email)) {
      throw new Error('That email address does not look right.');
    }
    const volunteer = {
      id: uuid(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: (email || '').trim(),
      address: (address || '').trim(),
      createdAt: new Date().toISOString(),
    };
    db.volunteers.push(volunteer);
    save();
    return volunteer;
  }

  // A volunteer is "signed in" if they have a session with no signOutTime
  // yet, regardless of which day it started (covers a forgotten sign-out).
  function getOpenSession(volunteerId) {
    return db.sessions.find((s) => s.volunteerId === volunteerId && !s.signOutTime) || null;
  }

  function signIn(volunteerId) {
    const existing = getOpenSession(volunteerId);
    if (existing) return existing;
    const now = new Date();
    const session = {
      id: uuid(),
      volunteerId,
      date: todayStr(now),
      signInTime: now.toISOString(),
      signOutTime: null,
    };
    db.sessions.push(session);
    save();
    return session;
  }

  function signOut(volunteerId) {
    const session = getOpenSession(volunteerId);
    if (!session) throw new Error('This volunteer is not currently clocked in.');
    session.signOutTime = new Date().toISOString();
    save();
    return session;
  }

  function listHistory() {
    return [...db.sessions]
      .sort((a, b) => new Date(b.signInTime) - new Date(a.signInTime))
      .map((s) => {
        const volunteer = getVolunteer(s.volunteerId);
        const signInTime = new Date(s.signInTime);
        const signOutTime = s.signOutTime ? new Date(s.signOutTime) : null;
        const durationMs = signOutTime ? signOutTime - signInTime : null;
        return {
          ...s,
          firstName: volunteer ? volunteer.firstName : '(deleted)',
          lastName: volunteer ? volunteer.lastName : '(deleted)',
          durationMinutes: durationMs !== null ? Math.round(durationMs / 60000) : null,
        };
      });
  }

  // --- Meals served ---

  function listMeals() {
    return [...db.meals].sort((a, b) => b.date.localeCompare(a.date));
  }

  function getMealsForDate(date) {
    return db.meals.find((m) => m.date === date) || null;
  }

  // One entry per date; calling this again for the same date overwrites
  // the count rather than adding a second entry.
  function setMealsForDate(date, count) {
    if (!date) throw new Error('Date is required.');
    const n = Number(count);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('Meals served must be a positive number.');
    }
    let entry = getMealsForDate(date);
    if (entry) {
      entry.count = Math.round(n);
      entry.updatedAt = new Date().toISOString();
    } else {
      entry = { id: uuid(), date, count: Math.round(n), updatedAt: new Date().toISOString() };
      db.meals.push(entry);
    }
    save();
    return entry;
  }

  function deleteMeals(date) {
    db.meals = db.meals.filter((m) => m.date !== date);
    save();
  }

  // --- Dashboard stats ---

  function getVolunteerStats() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    let totalMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    const perVolunteerMinutes = {};

    db.sessions.forEach((s) => {
      if (!s.signOutTime) return; // only completed sessions count toward hours
      const inTime = new Date(s.signInTime);
      const outTime = new Date(s.signOutTime);
      const minutes = (outTime - inTime) / 60000;
      if (minutes <= 0) return;
      totalMinutes += minutes;
      if (inTime >= weekAgo) weekMinutes += minutes;
      if (inTime >= monthAgo) monthMinutes += minutes;
      perVolunteerMinutes[s.volunteerId] = (perVolunteerMinutes[s.volunteerId] || 0) + minutes;
    });

    const topVolunteers = Object.entries(perVolunteerMinutes)
      .map(([id, minutes]) => {
        const v = getVolunteer(id);
        return {
          id,
          name: v ? `${v.firstName} ${v.lastName}` : '(deleted volunteer)',
          hours: minutes / 60,
        };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    return {
      totalVolunteers: db.volunteers.length,
      currentlyClockedIn: db.sessions.filter((s) => !s.signOutTime).length,
      totalVisits: db.sessions.length,
      totalHours: totalMinutes / 60,
      weekHours: weekMinutes / 60,
      monthHours: monthMinutes / 60,
      topVolunteers,
    };
  }

  function getMealStats() {
    const now = new Date();
    const weekAgoDate = new Date(now);
    weekAgoDate.setDate(weekAgoDate.getDate() - 6); // last 7 days including today
    const monthAgoDate = new Date(now);
    monthAgoDate.setDate(monthAgoDate.getDate() - 29); // last 30 days including today
    const weekAgo = todayStr(weekAgoDate);
    const monthAgo = todayStr(monthAgoDate);

    let totalMeals = 0;
    let weekMeals = 0;
    let monthMeals = 0;
    db.meals.forEach((m) => {
      totalMeals += m.count;
      if (m.date >= weekAgo) weekMeals += m.count;
      if (m.date >= monthAgo) monthMeals += m.count;
    });

    return { totalMeals, weekMeals, monthMeals, entries: listMeals() };
  }

  function exportCsv() {
    const rows = listHistory();
    const header = 'First Name,Last Name,Date,Clock In,Clock Out,Duration (minutes)';
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = rows.map((r) => {
      const signIn = new Date(r.signInTime).toLocaleTimeString();
      const signOut = r.signOutTime ? new Date(r.signOutTime).toLocaleTimeString() : '';
      const duration = r.durationMinutes !== null ? r.durationMinutes : '';
      return [r.firstName, r.lastName, r.date, signIn, signOut, duration].map(esc).join(',');
    });
    return [header, ...lines].join('\n');
  }

  global.VolunteerDB = {
    todayStr,
    listVolunteers,
    getVolunteer,
    createVolunteer,
    getOpenSession,
    signIn,
    signOut,
    listHistory,
    exportCsv,
    listMeals,
    getMealsForDate,
    setMealsForDate,
    deleteMeals,
    getVolunteerStats,
    getMealStats,
  };
})(window);
