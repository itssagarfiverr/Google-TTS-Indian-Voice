
import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { VoiceOption } from '../types';

/**
 * Decodes a base64 string into a Uint8Array.
 * @param base64 The base64 string to decode.
 * @returns The decoded Uint8Array.
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer.
 * This function assumes the input data is 16-bit PCM, single channel.
 * @param data The Uint8Array containing raw PCM audio data.
 * @param ctx The AudioContext to create the AudioBuffer with.
 * @param sampleRate The sample rate of the audio data.
 * @param numChannels The number of audio channels (e.g., 1 for mono).
 * @returns A Promise that resolves with the decoded AudioBuffer.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Generates speech from text using the Gemini TTS API.
 * @param text The text to convert to speech.
 * @param voice The selected voice option.
 * @param audioContext The AudioContext to decode the audio with.
 * @returns A Promise that resolves with the AudioBuffer of the generated speech.
 * @throws Error if API key is not available or if speech generation fails.
 */
export const generateSpeech = async (
  text: string,
  voice: VoiceOption,
  audioContext: AudioContext,
): Promise<AudioBuffer> => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not set. Please ensure it is configured in your environment.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice.voiceName },
          },
          // Removed speakingRate and pitch as they are causing INVALID_ARGUMENT error
          // with prebuiltVoiceConfig for this model. The model will use default settings for the voice.
          // speakingRate: voice.speakingRate,
          // pitch: voice.pitch,
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No audio data received from the Gemini API.');
    }

    const audioBytes = decode(base64Audio);
    // The Gemini TTS API returns raw PCM data at 24000Hz, single channel
    const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
    return audioBuffer;

  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : String(error)}`);
  }
};