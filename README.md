# edible-hope-app

A simple, kiosk-style app for volunteers to sign in and sign out. Designed
to be easy for anyone to use, including volunteers who aren't comfortable
with technology — large buttons, big text, and as few steps as possible.

## Features

- **Huge, touch-friendly buttons** — nothing tiny to tap.
- **Returning volunteers** find their name in a searchable list and tap once
  to sign in or sign out.
- **New volunteers** tap "I'm a New Volunteer," enter their first name, last
  name, email (optional), and address (optional) once, and are signed in
  immediately — no separate registration step.
- **Accurate time & date** — sign-in/out times and durations are calculated
  from the server clock in local time, and a volunteer who forgets to sign
  out one day is still correctly shown as "signed in" the next time they
  show up (rather than silently starting a second overlapping session).
- **History & reports page** (`admin.html`) lists every sign-in/out with the
  computed duration and lets staff download a CSV for record-keeping.

## Running it

```bash
npm install
npm start
```

Then open `http://localhost:3000` (or the tablet/kiosk's address) in a
browser. Data is stored locally in `data/db.json`.

## Project structure

- `server.js` — Express server and API routes.
- `lib/db.js` — simple JSON-file data store (volunteers + sign-in/out
  sessions).
- `public/` — the front-end: `index.html`/`app.js` (the sign-in kiosk) and
  `admin.html` (history & CSV export).
