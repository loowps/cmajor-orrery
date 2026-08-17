<template>
  <span class="vendor-logo" aria-label="Loowps">L<span class="slashes">//</span>WPS</span>
</template>

<style scoped lang="scss">
/// Only scale is left to whatever places the logo: its proportions belong to the mark itself.
.vendor-logo {
  font-weight: 600;
  letter-spacing: 0.16em;
  white-space: nowrap;
  user-select: none;
}

/**
 * The slash glyph overshoots the cap height and dips below the baseline, so it is trimmed and
 * lifted to sit between them. The margins are lopsided on purpose: tracking follows every letter,
 * so the L already trails a gap into the slashes while only their own narrow spacing separates
 * them from the W - an even margin would leave the pair sitting well left of centre.
 */
.slashes {
  position: relative;
  top: -0.04em;
  margin: 0 0.14em 0 0.02em;
  color: var(--accent);
  font-size: 0.95em;
  letter-spacing: 0.02em;
}
</style>
