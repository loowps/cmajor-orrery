# Orrery Sequencer

![The Orrery editor: a voice's eight lanes, with the resolved sequence above them and the scene
selector in the footer](screenshot.png)

A host-synced generative MIDI sequencer, built as a [cmajor] patch with a [vuejs] UI.

Eight voices, eight lanes each. Every lane cycles through its own window of values at its own length,
so the lanes phase against one another and a pattern keeps turning without repeating. Nothing is
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

[cmajor]: https://github.com/cmajor-lang/cmajor
[vuejs]: https://vuejs.org/
[Bandcamp]: https://loowps.bandcamp.com
[Soundcloud]: https://soundcloud.com/loowps
[Apple Music]: https://music.apple.com/us/artist/loowps/1326334750
[Spotify]: https://open.spotify.com/artist/2jOQrKX3rRoZORPfFcXaYU
