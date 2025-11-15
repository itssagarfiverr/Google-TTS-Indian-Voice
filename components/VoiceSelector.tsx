
import React from 'react';
import { VoiceOption } from '../types';

interface VoiceSelectorProps {
  voices: VoiceOption[];
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ voices, selectedVoiceId, onSelectVoice }) => {
  return (
    <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-inner mt-6">
      <h3 className="text-xl font-semibold text-white mb-4">Choose a Voice</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {voices.map((voice) => (
          <label
            key={voice.id}
            className={`
              flex items-center p-3 rounded-md cursor-pointer transition-all duration-200
              ${selectedVoiceId === voice.id
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-105'
                : 'bg-indigo-700 border-indigo-600 text-indigo-100 hover:bg-indigo-800 hover:border-indigo-500'
              }
              border-2
            `}
          >
            <input
              type="radio"
              name="voice"
              value={voice.id}
              checked={selectedVoiceId === voice.id}
              onChange={() => onSelectVoice(voice.id)}
              className="hidden"
            />
            <span className="text-sm font-medium ml-2">
              {voice.label}
            </span>
            {selectedVoiceId === voice.id && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-auto text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};

export default VoiceSelector;
