const express = require('express');
const path = require('path');
const db = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function isValidName(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

function isValidEmail(str) {
  if (!str) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

// List volunteers with their current signed-in status.
app.get('/api/volunteers', (req, res) => {
  const volunteers = db.listVolunteers().map((v) => {
    const openSession = db.getOpenSession(v.id);
    return {
      id: v.id,
      firstName: v.firstName,
      lastName: v.lastName,
      signedIn: !!openSession,
    };
  });
  res.json(volunteers);
});

// Full detail for one volunteer, including current status.
app.get('/api/volunteers/:id', (req, res) => {
  const volunteer = db.getVolunteer(req.params.id);
  if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });
  const openSession = db.getOpenSession(volunteer.id);
  res.json({ ...volunteer, signedIn: !!openSession, openSession });
});

// Create a brand-new volunteer.
app.post('/api/volunteers', (req, res) => {
  const { firstName, lastName, email, address } = req.body || {};
  if (!isValidName(firstName) || !isValidName(lastName)) {
    return res.status(400).json({ error: 'First and last name are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'That email address does not look right.' });
  }
  const volunteer = db.createVolunteer({ firstName, lastName, email, address });
  res.status(201).json(volunteer);
});

app.post('/api/volunteers/:id/signin', (req, res) => {
  const volunteer = db.getVolunteer(req.params.id);
  if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });
  const session = db.signIn(volunteer.id);
  res.json({ volunteer, session });
});

app.post('/api/volunteers/:id/signout', (req, res) => {
  const volunteer = db.getVolunteer(req.params.id);
  if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });
  const session = db.signOut(volunteer.id);
  if (!session) {
    return res.status(400).json({ error: 'This volunteer is not currently signed in.' });
  }
  res.json({ volunteer, session });
});

// Admin/history views.
app.get('/api/history', (req, res) => {
  res.json(db.listHistory());
});

app.get('/api/history/export.csv', (req, res) => {
  const rows = db.listHistory();
  const header = 'First Name,Last Name,Date,Sign In,Sign Out,Duration (minutes)';
  const lines = rows.map((r) => {
    const signIn = new Date(r.signInTime).toLocaleTimeString();
    const signOut = r.signOutTime ? new Date(r.signOutTime).toLocaleTimeString() : '';
    const duration = r.durationMinutes !== null ? r.durationMinutes : '';
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    return [r.firstName, r.lastName, r.date, signIn, signOut, duration].map(esc).join(',');
  });
  const csv = [header, ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="volunteer-history.csv"');
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`Volunteer sign-in app running at http://localhost:${PORT}`);
});
