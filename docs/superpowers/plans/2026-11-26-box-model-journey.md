# Box Model Journey Implementation Plan

**Goal:** Rework sketch 008 into the nested, beat-driven layout journey in the design.
**Spec:** `docs/2026-11-26-box-model-journey-design.md`

## Global constraints
Same as the series: reduced motion, keyboard-reachable controls, sr-only status, `pnpm check` passes. Commit
locally; ask before pushing.

### Task 1: Timing, spring and flex logic (`sketches/008-box-model/journey.ts`, tests first)
- `BPM = 140`, `BEATS_PER_LEVEL = 4`, `LEVELS` (16 entries: `{ id, name, line }`).
- `beatAt(t: number, bpm: number, count: number): { level: number; beat: number; phase: number; transition: number }`
  (`beat` 0–3; `phase` 0–1 within the beat; `transition` 0→1 across the 4th beat, else 0; loops after `count`).
- `springOut(x: number): number` (0 at 0, overshoots past 1, settles to 1 by x = 1).
- `flexLayout(items: { basis: number; grow: number; shrink: number }[], container: number, gap: number): number[]`
  (CSS-style: free space shared by `grow` when positive, by `shrink × basis` when negative; never negative).
- Tests: beat boundaries at 140 BPM; loop; transition only in beat 4; spring overshoot and settle; grow
  ratios; shrink weighting; no negative widths; exact fit when free space is 0.

### Task 2: Scene and camera (`main.ts`, `sketch.json`)
Build the 16 levels as nested groups; world scale eases so the current level fills ~1 m; the new level
springs out from the previous level's bounds; pulse on beats; orbit and zoom on top of the stage framing;
controls, status, floor label, sound; reduced motion. Remove the old slider code and `box.ts`.
Browser check: play through all 16 levels at 1440×900 and 360×780, orbit, zoom, pause, reset; no errors.

### Task 3: Thumbnail, build, checks, commit (no push).
