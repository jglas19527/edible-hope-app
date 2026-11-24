# Native iPad wrapper (zero internet, ever)

This turns the same `public/` app into a real iPad app with **no network
dependency at all** — not even once. Everything (HTML/CSS/JS/icons) is
bundled directly inside the app; there's no server involved at any point
after it's installed.

This only matters if the iPad genuinely never gets internet access. If it
can have WiFi for even 10 seconds to install the app once, the regular
website (`https://edible-hope-app.vercel.app`, installed via "Add to Home
Screen" in Safari) is far simpler — no Mac, no Xcode, no re-signing. Use
this instead only if that's not an option.

## What you need

- A Mac with [Xcode](https://apps.apple.com/us/app/xcode/id497799835)
  installed (free from the Mac App Store — the Mac needs internet to
  download it, the iPad never does).
- An Apple ID, signed into Xcode (Xcode → Settings → Accounts).
- A USB-C/Lightning cable to connect the iPad to the Mac.
- **With a free Apple ID**, the installed app stops opening after 7 days
  and has to be reinstalled from the Mac (reconnect, open the project,
  hit Run again — a couple of minutes). Your saved data is **not** lost
  when you do this (see "Why a custom storage bridge" below). A paid
  [Apple Developer Program](https://developer.apple.com/programs/)
  membership ($99/year) extends that to a full year instead of 7 days.

## Set up the Xcode project (one time)

1. On the Mac, clone this repo (or pull the latest, if you already have it):
   ```bash
   git clone https://github.com/jglas19527/edible-hope-app
   ```
2. Open Xcode → **File → New → Project** → iOS → **App**. Use:
   - Product Name: `EdibleHopeKiosk`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Uncheck "Include Tests"
   - Save it *inside* the `ios/` folder of the cloned repo (so everything
     lives together), e.g. `edible-hope-app/ios/EdibleHopeKiosk/`.
3. In the new project's file list (left sidebar), **delete** the
   auto-generated `ContentView.swift` and `EdibleHopeKioskApp.swift` (move
   to trash), then drag in the two files from this repo's
   `ios/Sources/` folder (`ContentView.swift`,
   `EdibleHopeKioskApp.swift`) to replace them. Make sure "Copy items if
   needed" is checked and the app target is checked.
4. Drag this repo's **`public/` folder** into the Xcode project navigator.
   When the dialog appears:
   - Choose **"Create folder references"** (the folder will show as a
     **blue** folder icon) — **not** "Create groups" (yellow folder). This
     matters: only a folder reference preserves the file structure the
     app's relative links (`style.css`, `icons/icon-192.png`, etc.) depend
     on.
   - Check "Copy items if needed" and the app target.
5. Add the app icon: open `Assets.xcassets` → `AppIcon` in Xcode, and drag
   this repo's `ios/AppIcon-1024.png` onto the single 1024×1024 slot.
6. Connect the iPad via USB. On the iPad, tap "Trust This Computer" if
   asked. In Xcode's toolbar, pick the iPad as the run destination (device
   dropdown next to the Stop/Run buttons).
7. Select the project in the navigator → the `EdibleHopeKiosk` target →
   **Signing & Capabilities** tab → check **"Automatically manage
   signing"** → pick your Apple ID under **Team**.
8. Click the **Run (▶)** button. Xcode builds the app and installs it
   directly on the iPad.
9. On the iPad: **Settings → General → VPN & Device Management** → find
   your Apple ID under "Developer App" → tap **Trust**.
10. Launch the app from the iPad's home screen (it'll have the Edible Hope
    mug icon). Turn on Airplane Mode and confirm it works — there is no
    network code path at all in this build, so this is the real test.

## Every 7 days (free Apple ID only)

Reconnect the iPad to the Mac, open the Xcode project, select the iPad as
the destination, and click Run again. This takes under a minute and does
**not** erase the volunteer data already saved on the iPad.

## Why a custom storage bridge (not just localStorage)

A normal web app persists data in the browser's `localStorage`. Inside this
bundled, offline app, that's not reliable: WKWebView treats bundled
`file://` content's storage as tied to the app's install path, which
changes every time Xcode rebuilds and reinstalls the app — so plain
`localStorage` could silently reset every 7 days.

To avoid that, `public/db.js` additionally talks to a small native bridge
(`ios/Sources/ContentView.swift`'s `NativeBridge`) when running inside this
wrapper: every save is also written to a JSON file in the app's
**Documents** directory, which Xcode does not touch on rebuild/reinstall,
and that file is read back in on launch. This is on top of (not instead
of) the regular web version's `localStorage`, so the same `public/`
folder works unchanged on the Vercel site too.

Still download a CSV backup from the History page periodically — it's
cheap insurance against ever deleting the app outright (which *does* erase
its Documents folder).

## Updating the app later

If the web app's code changes (a new feature, a bug fix), this native copy
does **not** auto-update the way the website does. Pull the latest
`public/` folder into the Mac's clone, re-add it in Xcode (same "folder
reference" step), and Run again to push the update to the iPad.
