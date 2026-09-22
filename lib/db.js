const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function loadDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    return { volunteers: [], sessions: [] };
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  if (!raw.trim()) return { volunteers: [], sessions: [] };
  return JSON.parse(raw);
}

let db = loadDb();

function save() {
  const tmpFile = DB_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// Local (server) date, not UTC, so the "day" always matches the wall clock
// the volunteers and staff are looking at.
function todayStr(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

function createVolunteer({ firstName, lastName, email, address }) {
  const volunteer = {
    id: crypto.randomUUID(),
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

// A volunteer is "signed in" if they have a session with no signOutTime yet,
// regardless of which day it started (covers a forgotten sign-out).
function getOpenSession(volunteerId) {
  return (
    db.sessions.find((s) => s.volunteerId === volunteerId && !s.signOutTime) || null
  );
}

function getSessionsForVolunteer(volunteerId) {
  return db.sessions
    .filter((s) => s.volunteerId === volunteerId)
    .sort((a, b) => new Date(b.signInTime) - new Date(a.signInTime));
}

function signIn(volunteerId) {
  const existing = getOpenSession(volunteerId);
  if (existing) return existing;
  const now = new Date();
  const session = {
    id: crypto.randomUUID(),
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
  if (!session) return null;
  session.signOutTime = new Date().toISOString();
  save();
  return session;
}

function listHistory() {
  return [...db.sessions]
    .sort((a, b) => new Date(b.signInTime) - new Date(a.signInTime))
    .map((s) => {
      const volunteer = getVolunteer(s.volunteerId);
      const signIn = new Date(s.signInTime);
      const signOut = s.signOutTime ? new Date(s.signOutTime) : null;
      const durationMs = signOut ? signOut - signIn : null;
      return {
        ...s,
        firstName: volunteer ? volunteer.firstName : '(deleted)',
        lastName: volunteer ? volunteer.lastName : '(deleted)',
        durationMinutes: durationMs !== null ? Math.round(durationMs / 60000) : null,
      };
    });
}

module.exports = {
  todayStr,
  listVolunteers,
  getVolunteer,
  createVolunteer,
  getOpenSession,
  getSessionsForVolunteer,
  signIn,
  signOut,
  listHistory,
};
