# Orrery Sequencer

![The Orrery editor: a voice's eight lanes, with the resolved sequence above them and the scene
selector in the footer](screenshot.png)

A host-synced generative MIDI sequencer, built as a [cmajor] patch with a [vuejs] UI.

Eight voices, eight lanes each. Every lane cycles through its own window of values at its own length,
so the lanes phase against one another, and a pattern keeps turning without repeating. Nothing is
decided by chance at playback: what you draw is what plays.

#### 🔊 [Bandcamp] / [Soundcloud] / [Apple Music] / [Spotify]

---

## Building

```
pnpm install
pnpm build
```

`dist/` is then the patch bundle — `Orrery.cmajorpatch`, `Orrery.cmajor` and the compiled `main.js`
view — ready to load in a host.

#### Building a CLAP plugin

The [CLAP] headers are not part of cmajor, so clone them once next to this project:

```
git clone --depth 1 https://github.com/free-audio/clap.git ../clap
```

`pnpm run build-clap` then builds the ui and generates a self-contained CLAP plugin project into `dist-clap`,
with the include path to the CLAP headers already baked into its CMakeLists (the Vue gui is embedded into
the generated C++). Open that folder in your IDE, or build it from the command line:

```
cmake -S dist-clap -B dist-clap/build
cmake --build dist-clap/build --config Release
```

[CLAP]: https://github.com/free-audio/clap
[cmajor]: https://github.com/cmajor-lang/cmajor
[vuejs]: https://vuejs.org/
[Bandcamp]: https://loowps.bandcamp.com
[Soundcloud]: https://soundcloud.com/loowps
[Apple Music]: https://music.apple.com/us/artist/loowps/1326334750
[Spotify]: https://open.spotify.com/artist/2jOQrKX3rRoZORPfFcXaYU
