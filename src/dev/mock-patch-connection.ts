import type { PatchConnection } from '@/models/patch-connection.model'

/**
 * Stands in for the connection the Cmajor host injects, so the GUI can be developed in a plain
 * browser with hot reloading. Every call is inert — the sequencer state currently lives in the
 * Pinia store rather than in the patch.
 */
export function createMockPatchConnection(): PatchConnection {
  return {
    requestStatusUpdate: () => {},
    addStatusListener: () => {},
    removeStatusListener: () => {},
    resetToInitialState: () => {},

    sendEventOrValue: () => {},
    sendMIDIInputEvent: () => {},
    sendParameterGestureStart: () => {},
    sendParameterGestureEnd: () => {},

    requestStoredStateValue: () => {},
    sendStoredStateValue: () => {},
    addStoredStateValueListener: () => {},
    removeStoredStateValueListener: () => {},
    sendFullStoredState: () => {},
    requestFullStoredState: (callback) => callback({}),

    addEndpointListener: () => {},
    removeEndpointListener: () => {},
    requestParameterValue: () => {},
    addParameterListener: () => {},
    removeParameterListener: () => {},
    addAllParameterListener: () => {},
    removeAllParameterListener: () => {},

    // Root-absolute, so a resource still resolves the same whatever route the dev server is on.
    getResourceAddress: (path: string) => `/${path}`
  }
}
