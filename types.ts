
export interface VoiceOption {
  id: string;
  label: string;
  voiceName: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  speakingRate?: number;
  pitch?: number;
}
