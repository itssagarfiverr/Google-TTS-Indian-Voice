
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSpeech } from './services/geminiService';
import { VOICES, MAX_TEXT_LENGTH } from './constants';
import { VoiceOption } from './types';
import VoiceSelector from './components/VoiceSelector';

function App() {
  const [textInput, setTextInput] = useState<string>('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VOICES[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null); // New state for HTML audio src

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext on component mount
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });

    return () => {
      // Clean up AudioContext on component unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
      // Clean up object URL on unmount
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]); // Include audioBlobUrl in dependencies for cleanup

  // Helper to create a WAV Blob URL from an AudioBuffer
  const createWavBlobUrlFromAudioBuffer = useCallback((buffer: AudioBuffer): string => {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM (uncompressed)
    const bitDepth = 16; // 16-bit
    const blockAlign = numberOfChannels * bitDepth / 8;
    const byteRate = sampleRate * blockAlign;

    const bufferSize = buffer.length * numberOfChannels * (bitDepth / 8); // Total bytes for data
    const arrayBuffer = new ArrayBuffer(44 + bufferSize);
    const view = new DataView(arrayBuffer);

    // Helper to write string
    function writeString(view: DataView, offset: number, s: string) {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(offset + i, s.charCodeAt(i));
      }
    }

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bufferSize, true); // file length
    writeString(view, 8, 'WAVE');

    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // format chunk length
    view.setUint16(20, format, true); // audio format (1 = PCM)
    view.setUint16(22, numberOfChannels, true); // number of channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, byteRate, true); // byte rate
    view.setUint16(32, blockAlign, true); // block align
    view.setUint16(34, bitDepth, true); // bits per sample

    // DATA sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, bufferSize, true); // data chunk length

    // Write the PCM data
    let offset = 44;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < buffer.length; i++) {
        // Scale to 16-bit signed integer
        const s = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2; // 2 bytes per sample for 16-bit
      }
    }
    return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
  }, []);

  const playAudio = useCallback((buffer: AudioBuffer) => {
    if (!audioContextRef.current) {
      setError('AudioContext not initialized.');
      return;
    }

    // Stop any currently playing audio
    if (audioSourceNodeRef.current) {
      audioSourceNodeRef.current.stop();
      audioSourceNodeRef.current.disconnect();
      audioSourceNodeRef.current = null;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start(0); // Play immediately
    audioSourceNodeRef.current = source;
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    setError(null);
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setError(null);
  };

  const handleGenerateSpeech = useCallback(async () => {
    if (!textInput.trim()) {
      setError('Please enter some text to convert to speech.');
      return;
    }
    if (textInput.length > MAX_TEXT_LENGTH) {
      setError(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioBuffer(null);
    // Revoke previous audioBlobUrl if it exists before generating new speech
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }

    try {
      const selectedVoice: VoiceOption | undefined = VOICES.find(v => v.id === selectedVoiceId);
      if (!selectedVoice) {
        throw new Error('Selected voice not found.');
      }
      if (!audioContextRef.current) {
        throw new Error('Audio context is not available.');
      }

      // Resume AudioContext if it's suspended (e.g., after user interaction)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const buffer = await generateSpeech(textInput, selectedVoice, audioContextRef.current);
      setAudioBuffer(buffer);

      // Generate a Blob URL for the HTML audio element
      const newAudioBlobUrl = createWavBlobUrlFromAudioBuffer(buffer);
      setAudioBlobUrl(newAudioBlobUrl);

      playAudio(buffer); // Automatically play after generation via AudioContext
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate speech: ${errorMessage}`);
      setAudioBuffer(null);
      setAudioBlobUrl(null); // Clear URL on error too
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textInput, selectedVoiceId, playAudio, createWavBlobUrlFromAudioBuffer]);

  const handleDownloadAudio = useCallback(() => {
    if (!audioBlobUrl) {
      setError('No audio to download.');
      return;
    }

    const a = document.createElement('a');
    a.href = audioBlobUrl;
    a.download = 'gemini_speech.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // No need to revoke URL here; it's managed by the useEffect hook when audioBlobUrl changes or on unmount.
  }, [audioBlobUrl]);


  const charsLeft = MAX_TEXT_LENGTH - textInput.length;

  return (
    <div className="relative z-10 w-full max-w-4xl bg-white bg-opacity-15 backdrop-blur-md rounded-xl shadow-2xl p-6 md:p-10 border border-purple-500/30">
      <h1 className="text-4xl font-extrabold text-white text-center mb-6 drop-shadow-lg">
        Gemini Text-to-Speech
      </h1>
      <p className="text-white text-opacity-80 text-center mb-8 max-w-2xl mx-auto">
        Experience AI-powered text-to-speech with diverse voices simulating Indian accents across various age and gender profiles. Just type your text and hear it come alive.
      </p>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <label htmlFor="text-input" className="block text-xl font-semibold text-white mb-3">
            Enter your text
          </label>
          <textarea
            id="text-input"
            className="w-full p-4 bg-gray-800 bg-opacity-70 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent focus:border-blue-500 transition-all duration-200 resize-y min-h-[150px]"
            placeholder="Type your message here..."
            value={textInput}
            onChange={handleTextChange}
            maxLength={MAX_TEXT_LENGTH}
            disabled={isLoading}
          ></textarea>
          <div className="text-sm text-gray-300 mt-2 text-right">
            {charsLeft} characters remaining (Max {MAX_TEXT_LENGTH})
          </div>
          {error && (
            <div className="bg-red-500 bg-opacity-80 text-white p-3 rounded-md mt-4 text-sm shadow-md">
              Error: {error}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          <VoiceSelector
            voices={VOICES}
            selectedVoiceId={selectedVoiceId}
            onSelectVoice={handleVoiceChange}
          />

          <div className="mt-8">
            <button
              onClick={handleGenerateSpeech}
              className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-6 rounded-lg text-lg font-bold shadow-xl hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !textInput.trim() || textInput.length > MAX_TEXT_LENGTH}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Speech...
                </>
              ) : (
                'Generate Speech'
              )}
            </button>

            {audioBlobUrl && ( // Render audio controls only if audioBlobUrl is available
              <div className="bg-white bg-opacity-10 p-4 rounded-lg shadow-inner mt-6 flex flex-col items-center gap-4">
                <h3 className="text-lg font-semibold text-white">Generated Audio:</h3>
                <audio
                  controls
                  src={audioBlobUrl} // Use the generated blob URL here
                  className="w-full max-w-md"
                >
                  Your browser does not support the audio element.
                </audio>
                <button
                  onClick={handleDownloadAudio}
                  className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Audio (WAV)
                </button>
                <p className="text-gray-300 text-sm italic">
                  Note: Audio plays automatically upon generation. The controls above are for replaying.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
