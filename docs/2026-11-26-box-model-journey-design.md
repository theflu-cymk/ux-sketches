# 008 Box Model, reworked: a nested layout journey

Date: 2026-11-26 · Status: approved by Brian in conversation ("write up, plan it, execute it", 140 BPM)

## Intent

Replace 008's sliders and marbles with a show the visitor watches and flies around: a zoom-out through layout
concepts, each one embedded in the next, played to a beat. It teaches how layout nests: a box inside a flex
item inside a container inside a component inside a screen.

## Decided by Brian

- The visitor watches; they can orbit and zoom the camera at any time.
- Order: box model (content, padding, border, margin) → border-box → block vs inline → flex items → flex
  container → main / cross axis → flex-basis → flex-grow → flex-shrink → align-self → align-content →
  responsive component → screen sizes.
- The current (innermost) thing pulses on each beat; on the 4th beat the camera pulls back and the next,
  larger thing springs out with velocity from the edges of the smaller one.
- 140 BPM.

## Calls made by Claude

- Real nested 3D boxes in Three.js on the shared stage (orbitable, lit, on the floor); one sensible way.
- "Camera pulls back" is done Powers-of-Ten style: the world shrinks toward the origin so the current level
  always fills about the same space, and the camera eases back a little; the floor text stays legible.
- 16 levels × 4 beats at 140 BPM ≈ 27 s, then loops. Sound (when on): a tick per beat, a thunk on the 4th.
- Each level names itself on a floor label and in the screen-reader status.
- Controls: Play/Pause, Restart, a level readout. Orbit by drag, zoom by wheel or pinch; Reset restores the
  camera and restarts.
- Flex levels use a real (simplified) flex algorithm, unit-tested, so grow and shrink distribute space the
  way CSS does.
- Reduced motion: no pulse, no spring; levels step every 2 s with plain cuts.
- The floor question becomes "What is a layout made of?".
