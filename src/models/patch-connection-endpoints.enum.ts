/**
 * Everything a scene owns travels as an addressed event. Only the scene selection is a parameter,
 * because it is the one thing the host should be able to automate.
 */
export enum PatchConnectionEndpoint {
  LaneValues = 'laneValuesIn',
  LaneSettings = 'laneSettingsIn',
  StepEdit = 'stepEditIn',
  VoiceSettings = 'voiceSettingsIn',
  SoloMask = 'soloMaskIn',
  Scene = 'sceneIn',
  Playhead = 'playheadOut'
}

export const storedPatternKey = 'pattern'
