# edible-hope-app

A simple, kiosk-style app for volunteers to sign in and sign out. Designed
to be easy for anyone to use, including volunteers who aren't comfortable
with technology — large buttons, big text, and as few steps as possible.

It's an installable, offline-first web app (PWA): once it has been opened
one time, it keeps working with **no network connection at all**, and it
can be installed to a tablet's or computer's home screen like a native app.

## Features

- **Huge, touch-friendly buttons** — nothing tiny to tap.
- **Installable** — "Add to Home Screen" (or the install icon in the
  browser's address bar) puts a Volunteer Sign In icon on the device that
  opens full-screen, no browser address bar.
- **Works offline** — a service worker caches the whole app on first load,
  so it keeps working with no WiFi or internet, indefinitely.
- **Returning volunteers** find their name in a searchable list and tap once
  to sign in or sign out.
- **New volunteers** tap "I'm a New Volunteer," enter their first name, last
  name, email (optional), and address (optional) once, and are signed in
  immediately — no separate registration step.
- **Accurate time & date** — sign-in/out times and durations are calculated
  from the device's own clock in local time, and a volunteer who forgets to
  sign out one day is still correctly shown as "signed in" the next time
  they show up (rather than silently starting a second overlapping
  session).
- **History & reports page** (`admin.html`) lists every sign-in/out with the
  computed duration and lets staff download a CSV for record-keeping.

## How data storage works

All volunteer and sign-in/out data is stored **on the device**, in the
browser's local storage — there is no server-side database and nothing is
sent over the network. That's what makes the app fully usable with no
internet connection, but it also means:

- The data only lives on the one device/browser it was entered on. Use the
  "Download CSV" button on the History page regularly to back it up.
- Clearing that browser's site data/cache for this app will erase the
  volunteer log, so avoid "Clear browsing data" on the kiosk device.

## Running it

```bash
npm install
npm start
```

Then open `http://localhost:3000` in a browser on the kiosk device.

To install it as an app: open that URL, then use the browser's "Install
app" / "Add to Home Screen" option. After that first install, the app
opens and runs with no network connection required — you no longer need
`npm start` running for it to work, since the service worker has already
cached everything the app needs.

Note: installability and offline support (service workers) require the
page to be served from `localhost` or over HTTPS. Serving it from a plain
`http://<lan-ip>` address (not `localhost`) will work in a browser tab but
won't be installable or reliably cache for offline use — run the server on
the same device as the browser, or put it behind HTTPS if hosting
elsewhere.

## Project structure

- `server.js` — a plain static file server (`npm start`); it has no
  involvement in storing sign-in data.
- `public/db.js` — the client-side data store (volunteers + sign-in/out
  sessions), saved to the browser's local storage.
- `public/index.html` / `app.js` — the sign-in kiosk.
- `public/admin.html` / `admin.js` — history & CSV export.
- `public/manifest.webmanifest`, `public/sw.js` — what make the app
  installable and offline-capable.
