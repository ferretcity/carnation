# Carnation

A static, client-only editing surface for a small organization's handbook — part of
the **ferretcity** portfolio of tools for organizational clarity.

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

## License

[MIT](LICENSE)
