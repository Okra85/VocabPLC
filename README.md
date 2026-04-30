# Offline Great Courses

A dependency-free, offline-first PWA designed for the Boox Go 7. It teaches advanced vocabulary, philosophy, history, literature, leadership, and political thought through a 7-day weekly rhythm.

## Run Locally

This project does not require Node.

```powershell
cd C:\Users\armbr\boox-learning-pwa
python -m http.server 4173
```

Open:

```txt
http://localhost:4173
```

For Boox on the same Wi-Fi, find your computer's local IP address:

```powershell
ipconfig
```

Then open this on the Boox browser:

```txt
http://YOUR_LOCAL_IP:4173
```

## Install On Boox Go 7

1. Start the local server from this folder.
2. Open the app URL on the Boox browser.
3. Use the browser menu to add it to the home screen if available.
4. Visit once while online so the service worker caches the app shell and Weeks 1-8.
5. Turn Wi-Fi off and reopen the app to confirm offline launch.

## Add More Weeks Later

1. Add new files under `content/weeks/`, for example `week-009.json`.
2. Update `content/curriculum-index.json`:
   - increase `installedWeeks`
   - set the new week's `available` value to `true`
3. Add the new week path to `APP_SHELL` in `service-worker.js` if you want it pre-cached immediately.
4. Open the app on the Boox while online and tap `Progress -> Refresh Offline Cache`.

## Content Progression

Weeks 1-8 are installed. The 52-week index is included, with vocabulary difficulty progressing from Master's level to doctorate-level and specialist terms. Each vocabulary entry includes definition, etymology, example sentence, historical anchor, literary anchor, philosophical anchor, synonyms, antonyms, and difficulty.

## Storage

Progress, mastery, streaks, and scores are stored locally in IndexedDB. No account or API is required.

## Host Without Your Computer

The app is a static PWA, so it can be hosted on GitHub Pages, Cloudflare Pages, Netlify, or any static host.

### GitHub Pages Path

1. Create a new GitHub repository, for example `boox-learning-pwa`.
2. Upload this folder's contents to the repository root.
3. In GitHub, open `Settings -> Pages`.
4. Set `Build and deployment` to `Deploy from a branch`.
5. Choose the `main` branch and `/root`.
6. Open the published URL on the Boox, for example:

```txt
https://YOUR_USERNAME.github.io/boox-learning-pwa/index.html?v=14
```

### Updating The Hosted App

After files change:

1. Upload or push the changed files.
2. Bump the version query in `index.html`, for example from `v=14` to `v=15`.
3. Bump `CACHE_NAME` in `service-worker.js`.
4. Open the new version URL on the Boox once while online.

The app will then cache the new version for offline use.
