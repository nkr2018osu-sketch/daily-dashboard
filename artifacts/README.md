# artifacts/

Source for pages published as Claude Artifacts (claude.ai), not for GitHub Pages.

These files are HTML *fragments*: the artifact host wraps them in
`<!doctype html><head>…</head><body>` at publish time, so they have no
`<html>`/`<head>`/`<body>` tags of their own and will not render correctly if
opened straight from disk.

- `gac-war-table.html` — GAC War Table, the SWGOH Grand Arena offense planner.
  Saves to the artifact's private per-user store, falling back to browser
  storage. Published at https://claude.ai/code/artifact/18c612f0-3896-41db-8387-013539f61779
