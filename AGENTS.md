# AGENTS.md — Bonjorno

Manifest V3 New Tab extension for Brave (Chromium), built with React 19, TypeScript, Vite 6 and Vitest. There is no backend. CI runs on Node 20 / ubuntu; local dev is on Windows.

## Commands
- Run / Dev (browser preview with `localStorage` fallback): `npm run dev`
- Test (all): `npm test`
- Test (single): `npx vitest run tests/url.test.ts`
- Lint / Typecheck: `npx tsc --noEmit` (also runs during `npm run build`)
- Build / Package: `npm run build` (`dist/`, regenerates `public/icons/`, typechecks, runs vite build); `npm run package` (`release/bonjorno-extension.zip`)

## Architecture
- `public/manifest.json` — MV3 manifest; `chrome_url_overrides.newtab` points to `index.html` → `src/main.tsx` → `src/App.tsx`.
- `src/components/` — UI only. Components read/write state through `src/hooks/useSettings.ts` and `src/hooks/useMusicLibrary.ts`, never through storage directly.
- `src/services/chromeApi.ts` — the only `chrome.*` boundary; falls back to `localStorage` when `isExtensionContext()` is false (`vite dev`).
- `src/services/settingsStorage.ts` — `sanitizeSettings` is the single validator for stored, imported and root-config data. Storage keys end in `_v1`.
- `src/services/localConfigSync.ts` — syncs settings with root `bonjorno.config.json` (`/__bonjorno/config` middleware in `vite.config.ts` in dev, or an IndexedDB File System Access handle in the built extension).
- `src/services/imageStore.ts` + `src/services/musicLibrary.ts` — custom backgrounds and local music index/handles/imports live in IndexedDB (`Music/` and `bonjorno.music.local.json`); audio tags are parsed via `music-metadata`.
- `src/services/weather.ts` — the only network calls (Open-Meteo, 8s timeout, no API key).
- `src/types/settings.ts` + `src/constants/defaults.ts` — schema, defaults and `CURRENT_SCHEMA_VERSION`.
- **Version Manifests:** `package.json`, `public/manifest.json` (keep versions synced across all listed files).

## Personal Rules (Brain)
- **Commit Format:** Write one plain sentence stating what changed and why; do not use `feat:`/`fix:`/`chore:` conventional-commit prefixes.
- **Commit & Push Policy:** Never run `git commit`, `git tag`, or `git push` unless explicitly asked; never force-push to `main`. When the user says "commit and push", verify the build and tests pass, commit on `main`, and push to `origin main`. Pushing never releases anything.
- **Releases:** Releases happen only through `/monjita-github-release`, which bumps the version, pushes, runs `gh workflow run release.yml`, and watches it until the GitHub Release is live. Never create release tags or releases by hand.
- **Path Privacy:** Always use `C:\Users\you` in documentation, comments, and examples—never hardcode the local machine's real username.
- **Release Workflow:** `.github/workflows/release.yml` must be a copy of `GloriaSetup/templates/release.yml` (shared `check`/`release` jobs from `projectGloria/GloriaSetup/.github/workflows/app-{check,release}.yml@main`, plus this repo's own `build` job). Don't hand-write release workflows or pin `gloria-setup`; see `.brain/github-actions.md`.
- **Scrollbars:** Ban raw OS scrollbars; use thin (4–6px) themed scrollbars with transparent tracks and zero layout shift.
- **Interactive Controls:** Custom-style all form controls; define explicit `hover`, `active`, `focus-visible`, and `disabled` states with snappy 120–180ms transitions.
- **Git Branching:** Never create new branches or git worktrees. Always work directly on `main` until explicitly told otherwise.
- **Versioning:** Never bump versions during normal work. The user picks the version at release time and `/monjita-github-release` sets it in every version file at once; keep version files in sync with each other otherwise.

## Playbooks (Read Before Task)
- **GitHub Actions & Releases:** Read `.brain/github-actions.md` before creating/modifying `.github/workflows/*.yml`, setting up release automation, or debugging a failed release.

## Repo Guardrails & Gotchas
- **Schema changes:** When you add a setting, update the type, `DEFAULT_SETTINGS` and `sanitizeSettings` together. Bump `CURRENT_SCHEMA_VERSION` only for breaking shape changes, because imports with a newer version are rejected.
- **Untrusted input:** All stored, imported and root-config data goes through `sanitizeSettings`. All user URLs go through `normalizeAndValidateUrl` in `src/utils/url.ts`, which blocks `javascript:` and similar schemes.
- **Root config precedence:** `bonjorno.config.json` wins over local storage only when its `updatedAt` is newer. The file is committed and gets copied into `dist/` at build time, so don't put personal data in it.
- **CSP:** `script-src 'self'` applies, so no inline scripts, `eval` or remote script/CDN imports.
- **Permissions:** `bookmarks` and `topSites` are optional and requested at runtime through `chromeApi.ts`. Every feature must work when they're denied. Don't add new required permissions without asking.
- **Generated files:** `public/icons/*.png` are written by `scripts/generate-icons.mjs` on every build. Edit the script, not the PNGs.
- **Dependencies:** The only runtime dependencies are `react`, `react-dom` and `music-metadata`. Don't add libraries without asking.
- **Styling:** Use plain CSS in `src/styles/` (`tokens.css` for design tokens). Don't add CSS-in-JS or Tailwind.

## Done Criteria
- `npm test` and `npm run build` both pass, matching `.github/workflows/ci.yml`, and all Version Manifests (`package.json`, `public/manifest.json`) agree.
- For UI changes, check the result in `npm run dev` and say whether you verified it as an unpacked extension in Brave.

<!-- brain-sync: 31e69a675214 -->
