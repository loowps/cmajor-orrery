# Orrery Sequencer

![The Orrery editor: a voice's five lanes, with the resolved sequence above them and the scene
selector in the header](screenshot.png)

A host-synced generative MIDI sequencer, built as a [cmajor] patch with a [vuejs] UI.

Eight voices, five lanes each. Every lane cycles through its own window of values at its own length,
so the lanes phase against one another and a pattern keeps turning without repeating. Nothing is
decided by chance at playback: what you draw is what plays.

#### 🔊 [Bandcamp] / [Soundcloud] / [Apple Music] / [Spotify]

---

## How a voice plays

Every slot is one 16th, and a slot either starts a note, extends the note before it, or is silent:

```
trigger >= (1 - density)            -> start a note
hold    >= (1 - hold), sounding     -> extend that note
otherwise                           -> rest
```

**Trigger** and **Hold** decide the rhythm and are read at every slot. Because the decision is a
threshold rather than a coin toss, the pattern is stable and the editor can draw exactly what will
play — Density and Hold set the waterline, the lanes draw the shape.

**Pitch**, **Velocity** and **Gate** describe a note and advance once per note, so a five-value pitch
lane plays its five values in order however the rhythm falls, and no value goes unused when the
density changes. Note length is emergent rather than stored — the holds produce it — and gate is a
percentage of whatever length they produced.

## Lanes

Each lane owns 64 values and four ways of reading them:

- **Window** — the start and length of the slice it cycles through. Sliding it re-uses drawn
  material in a different order, which finds something faster than redrawing it.
- **Phase** — where inside the window it begins, dragged as a line through the step grid. The window
  chooses the material, the phase chooses the entry point, so two lanes can share values and still
  answer each other.
- **Direction** — forward, reverse, or pendulum. The phase stays the cell the lane reads first
  whichever way it travels, and a pendulum takes almost twice as long to come round, so turning one
  lane around re-times it against the others without redrawing anything.
- **Output range** — mapped as the note is produced, so narrowing it squeezes a running sequence
  instead of flattening it.

Per voice: pattern length, density, hold, and how often every lane snaps back to the start of its
window — **Reset every**, or `Off` to let each lane free-run at its own length.

## Scenes

Eight scenes, each holding a whole board. The scene being edited and the scene being played are
separate choices: the topbar selector picks what you edit, while the **Scene** parameter picks what
sounds. It is the patch's only automatable parameter, and the patch holds every scene itself, so a
host can arrange by automating scenes with the editor closed.

The editor never writes that parameter — selecting a scene to edit is silent, so it can't overwrite
an arrangement or land in a recorded automation pass. The speaker beside the slots points playback
at whatever is being edited for as long as it is on, and hands it straight back when it is switched
off; the slot lights show what is sounding, with the parameter's own choice half lit underneath.

## Building

```
pnpm install
pnpm build
```

`dist/` is then the patch bundle — `Orrery.cmajorpatch`, `Orrery.cmajor` and the compiled `main.js`
view — ready to load in a host.

[cmajor]: https://github.com/cmajor-lang/cmajor
[vuejs]: https://vuejs.org/
[Bandcamp]: https://loowps.bandcamp.com
[Soundcloud]: https://soundcloud.com/loowps
[Apple Music]: https://music.apple.com/us/artist/loowps/1326334750
[Spotify]: https://open.spotify.com/artist/2jOQrKX3rRoZORPfFcXaYU
