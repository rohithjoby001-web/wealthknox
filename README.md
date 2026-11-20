# WealthKnox

A personal finance tracker — income, expenses and savings targets, all kept
on your own device. Built with React + Vite, installable as a PWA (add to
your phone or desktop home screen, works offline after the first load).

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Build

```bash
npm run build
```

Outputs a static site to `dist/`. Preview it locally with `npm run preview`.

## Deploying

### Option A — Cloudflare Pages (recommended, matches this project's config)

1. Push this folder to a GitHub repository.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect
   to Git**, and pick the repo.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. Cloudflare gives you a `*.pages.dev` URL immediately; you can
   attach a custom domain afterwards under the project's **Custom domains**
   tab.

`vite.config.js` is already set with `base: '/'`, which is correct for a
Cloudflare Pages deployment served from a domain or sub-domain root.

### Option B — GitHub Pages

GitHub Pages serves project sites from a sub-path
(`https://you.github.io/repo-name/`), so you need one change first:

1. In `vite.config.js`, change `base: '/'` to `base: '/repo-name/'`
   (replace `repo-name` with your actual repo name).
2. Build (`npm run build`) and deploy the `dist/` folder — either with the
   `gh-pages` npm package, or GitHub's own "Deploy from a branch" /
   "GitHub Actions" Pages setup pointed at `dist`.

If you only use Cloudflare Pages, you can skip this and leave `base: '/'`
as-is.

## Installing to your home screen

Once it's deployed over HTTPS (both Cloudflare Pages and GitHub Pages serve
HTTPS by default), open the site in Chrome:

- **Android / desktop Chrome:** an "Install WealthKnox" banner appears
  automatically near the bottom of the screen after a moment, or use
  Settings → **Install app** inside WealthKnox itself, or Chrome's own
  address-bar install icon / ⋮ menu → **Install WealthKnox…**.
- **iOS Safari:** Share icon → **Add to Home Screen** (iOS doesn't support
  the automatic install prompt Chrome uses, so this is the standard path
  there regardless of app).

After installing, the app opens full-screen with its own icon, no browser
chrome, and keeps working offline — everything is stored in the browser's
local storage on that device, there's no server or account.

## Project structure

```
src/
  components/     shared UI pieces (header, nav, cards, charts)
  data/           category/icon/sample-data definitions
  icons/          inline SVG icon set
  pages/          the 4 tabs — Overview, Expenses, Income, Goals
  pwa/            install-prompt capture + banner
  sheets/         bottom-sheet overlays (add/edit forms, detail views)
  splash/         the branded start/splash screen
  state/          app state — React Context + useReducer + localStorage
  styles/         global.css — the whole design system
  utils/          date/money/calculation helpers
public/
  icons/          app icons, favicons, the home-screen icon set
```

## Notes

- All data lives in `localStorage` on the device — there's no backend, no
  account, and nothing is synced between devices.
- "Reset all data" in Settings clears everything and can't be undone.
