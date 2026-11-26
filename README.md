# UX Sketches

Small, playful 3D explorations of interface components and micro-interactions, each pushed somewhere new and
often deliberately impractical, to find new ways to interact. Every sketch is a standalone page on one shared
testing stage (`packages/stage`), with its name, question and tools printed on the stage floor. The build
publishes the sketches and a `feed.json` that the PORTFOLIO.EXE Lab reads.

## Add a sketch

1. Copy an existing folder in `sketches/` to `sketches/NNN-your-slug/` (next free number).
2. Edit `sketch.json` (number, slug, title, date, component, question, note, tools, floorText, categories)
   and `package.json` (name = the folder name).
3. Build the idea in `main.ts` on top of `createStage` from `@ux-sketches/stage`.
4. `pnpm install`, then `pnpm thumbnails && pnpm build && pnpm check`.
