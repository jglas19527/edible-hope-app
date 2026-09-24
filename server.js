// Plain static file server. All app data lives in the browser (see
// public/db.js) so this server has nothing to do with sign-in data — it's
// just a convenient way to serve the files locally with `npm start`.
// The app is a fully installable, offline-capable PWA once loaded: any
// static host (or even opening public/index.html's server-free build)
// works equally well.
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Volunteer clock-in app running at http://localhost:${PORT}`);
});
