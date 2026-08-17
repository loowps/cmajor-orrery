<script setup lang="ts">
export type ActionIconName =
  | 'power'
  | 'pencil'
  | 'lock'
  | 'reset'
  | 'dice'
  | 'copy'
  | 'paste'
  | 'forward'
  | 'reverse'
  | 'pendulum'
  | 'speaker'

/// The marker tone is for listening aids - what the editor is hearing, rather than anything the
/// pattern owns - and matches the colour solo carries in the voices table.
export type ActionIconTone = 'accent' | 'marker'

const {
  active = false,
  compact = false,
  tone = 'accent'
} = defineProps<{
  name: ActionIconName
  active?: boolean
  compact?: boolean
  tone?: ActionIconTone
  title?: string
}>()
</script>

<template>
  <button
    class="action-icon"
    :class="{ active, compact, marker: tone === 'marker' }"
    :title="title"
  >
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <template v-if="name === 'power'">
        <path
          d="M8 2.4v5.1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
        <path
          d="M4.8 4.9a4.6 4.6 0 1 0 6.4 0"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </template>

      <template v-else-if="name === 'pencil'">
        <path d="M10.8 2.1 13.9 5.2 6.3 12.8 2.4 13.6l.8-3.9z" fill="currentColor" />
      </template>

      <template v-else-if="name === 'lock'">
        <path
          d="M4.6 7V5.2a3.4 3.4 0 0 1 6.8 0V7"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        />
        <rect x="3.2" y="7" width="9.6" height="6.4" rx="1.4" fill="currentColor" />
      </template>

      <template v-else-if="name === 'reset'">
        <path
          d="M12.9 6.5A5.2 5.2 0 1 0 13.1 9.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M9.3 6.2h3.9V2.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </template>

      <template v-else-if="name === 'copy'">
        <rect
          x="5.6"
          y="2.4"
          width="8"
          height="8"
          rx="1.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        />
        <rect x="2.4" y="5.6" width="8" height="8" rx="1.6" fill="currentColor" />
      </template>

      <template v-else-if="name === 'forward'">
        <path
          d="M3.4 8h8.4M8.6 4.8 11.8 8l-3.2 3.2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </template>

      <template v-else-if="name === 'reverse'">
        <path
          d="M12.6 8H4.2M7.4 4.8 4.2 8l3.2 3.2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </template>

      <template v-else-if="name === 'pendulum'">
        <path
          d="M3.6 8h8.8M6 5.4 3.4 8 6 10.6M10 5.4 12.6 8 10 10.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </template>

      <template v-else-if="name === 'speaker'">
        <path d="M2.6 6.2h2.2L8.2 3.4v9.2L4.8 9.8H2.6z" fill="currentColor" />
        <path
          d="M10.4 6.4a2.4 2.4 0 0 1 0 3.2M12.1 4.7a4.6 4.6 0 0 1 0 6.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </template>

      <template v-else-if="name === 'paste'">
        <rect
          x="3"
          y="3.4"
          width="10"
          height="10.2"
          rx="1.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        />
        <rect x="5.8" y="1.8" width="4.4" height="3" rx="1" fill="currentColor" />
      </template>

      <template v-else>
        <rect
          x="2.2"
          y="2.2"
          width="11.6"
          height="11.6"
          rx="2.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        />
        <circle cx="5.6" cy="5.6" r="1.2" fill="currentColor" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        <circle cx="10.4" cy="10.4" r="1.2" fill="currentColor" />
      </template>
    </svg>
  </button>
</template>

<style scoped lang="scss">
.action-icon {
  width: var(--control-size);
  height: var(--control-size);
  flex: none;
  display: grid;
  place-items: center;
  padding: 0;
  background: var(--bg-control);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-faint);
  cursor: pointer;
  transition:
    background-color 90ms ease,
    border-color 90ms ease,
    color 90ms ease;

  svg {
    width: 13px;
    height: 13px;
  }

  &.compact {
    width: 19px;
    height: 19px;

    svg {
      width: 12px;
      height: 12px;
    }
  }

  &:hover:not(:disabled) {
    background: var(--bg-control-hover);
    border-color: var(--border-strong);
    color: var(--text);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:active {
    background: var(--accent-dim);
    border-color: var(--accent-dim);
    color: var(--accent-ink);
  }

  &.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
  }

  &.marker.active {
    background: var(--marker);
    border-color: var(--marker);
    color: var(--marker-ink);
  }
}
</style>
