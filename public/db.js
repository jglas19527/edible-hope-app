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
      if (!raw) return { volunteers: [], sessions: [] };
      const parsed = JSON.parse(raw);
      return {
        volunteers: parsed.volunteers || [],
        sessions: parsed.sessions || [],
      };
    } catch (e) {
      console.error('Could not read saved volunteer data; starting fresh.', e);
      return { volunteers: [], sessions: [] };
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
  };
})(window);
