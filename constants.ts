
import { VoiceOption } from './types';

export const VOICES: VoiceOption[] = [
  { id: 'zephyr-young-female-indian', label: 'Young Female (Indian Accent, Zephyr)', voiceName: 'Zephyr', speakingRate: 1.1, pitch: 1 },
  { id: 'kore-mature-female-indian', label: 'Mature Female (Indian Accent, Kore)', voiceName: 'Kore', speakingRate: 0.9, pitch: -0.5 },
  { id: 'puck-young-male-indian', label: 'Young Male (Indian Accent, Puck)', voiceName: 'Puck', speakingRate: 1.05, pitch: 0.8 },
  { id: 'charon-mature-male-indian', label: 'Mature Male (Indian Accent, Charon)', voiceName: 'Charon', speakingRate: 0.95, pitch: -0.2 },
  { id: 'fenrir-deep-male-indian', label: 'Deep Male (Indian Accent, Fenrir)', voiceName: 'Fenrir', speakingRate: 0.85, pitch: -1.0 },
  { id: 'zephyr-child-indian', label: 'Child Voice (Indian Accent, Zephyr)', voiceName: 'Zephyr', speakingRate: 1.25, pitch: 2.5 },
  { id: 'puck-child-indian', label: 'Child Voice (Indian Accent, Puck)', voiceName: 'Puck', speakingRate: 1.2, pitch: 2 },
  { id: 'kore-old-female-indian', label: 'Elderly Female (Indian Accent, Kore)', voiceName: 'Kore', speakingRate: 0.8, pitch: -1.0 },
  { id: 'charon-old-male-indian', label: 'Elderly Male (Indian Accent, Charon)', voiceName: 'Charon', speakingRate: 0.75, pitch: -1.5 },
];

export const MAX_TEXT_LENGTH = 500;
