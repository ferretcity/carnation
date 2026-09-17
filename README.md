<p align="center">
  <img src="public/favicon.svg" alt="Carnation logo" width="72">
</p>

# Carnation

A static, client-only editing surface for a small organization's handbook.

Carnation ships with an opinionated pillar structure:

- **Mission** — why the org exists (a rich-text editor, not a raw markdown box)
- **Values** — what it holds to be true (same editor)
- **Organization** — how it's currently structured (a role/group org chart)
- **Policies & Procedures** — how it currently operates (a step list that doubles as a flowchart)
- **Activities & Schedules** — the recurring things it does, when, and who runs them
  (same step-list/flowchart editor, plus a schedule and links to specific roles/groups
  in the org chart)

Every pillar starts empty — there's no draft or example content baked in, just the
structure itself.

Mission/Values/Policy pages use a proper WYSIWYG editor (bold, italic, headings,
quotes, lists, links) backed by [Tiptap](https://tiptap.dev/) — content is still stored
and exported as plain Markdown under the hood.

There's no server, database, or accounts system — Carnation is a fully static app that
runs entirely in your browser. The first time you open it, you choose how to work:

- **In this browser** — start a new blank handbook (autosaved to IndexedDB) or load a
  previously exported handbook file. Nothing leaves your machine.
- **Against a Google Drive folder** — sign in, pick (or create) a folder, and Carnation
  reads/writes a `carnation.json` file directly in that folder. Every change you make
  autosaves back into that same folder, so the folder itself is the shared source of
  truth for whoever else has access to it.

Either way, you can also:

- **Export to Markdown** — a `.zip` with one `.md` file per page, folders per pillar.
- **Export as Google Docs** — a one-way, read-friendly copy of every page written into
  a `Handbook` folder in your Drive as native Google Docs (separate from the
  Drive-folder sync above — this is just for people who'd rather read it in Docs).

## Develop

```bash
pnpm install
pnpm dev
```

## Google setup (optional — only needed for the Drive features)

Copy `.env.local.example` to `.env.local` and follow the instructions in it: you'll
need an OAuth Client ID (for signing in) and an API key (for the folder-picker UI),
both from the same Google Cloud project, with the Drive API and Picker API enabled.

## Build

```bash
pnpm build
pnpm preview
```

## Deploy (GitHub Pages)

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds and
deploys `main` to GitHub Pages automatically. `vite.config.ts` sets `base: '/carnation/'`
to match a project site at `https://<org-or-user>.github.io/carnation/` — change it if
you fork this under a different repo name.

To turn it on: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
GitHub Pages isn't available for private repos on every plan — if enabling it fails,
either make the repo public or use an org plan that includes Pages for private repos.

If you want the Drive sign-in / folder-picker to work on the deployed site, add
`VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY` as repo secrets (**Settings → Secrets
and variables → Actions**), and add the deployed origin to the OAuth client's
authorized JavaScript origins in Google Cloud Console. Without them, everything except
the Drive features still works.

## Releasing

To cut a release: bump `version` in `package.json`, commit it, then tag and push:

```bash
git tag v0.1.0
git push origin v0.1.0
```

[`.github/workflows/release.yml`](.github/workflows/release.yml) builds the app,
zips `dist/`, and publishes a GitHub release for the tag (with the zip attached and
notes generated from the commits since the last release). This is separate from the
Pages deploy — a release is a versioned, downloadable snapshot; Pages always serves
whatever's on `main`.

## License

[MIT](LICENSE). Third-party dependency licenses are in
[`third-party-licenses/`](third-party-licenses/NOTICE.md).
