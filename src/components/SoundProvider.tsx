import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SoundContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playSound: (type: string) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};

const SOUNDS: Record<string, string> = {
  default: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  animals: 'https://assets.mixkit.co/active_storage/sfx/2580/2580-preview.mp3',
  flags: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3',
  capitals: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  currencies: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
  flowers: 'https://assets.mixkit.co/active_storage/sfx/2582/2582-preview.mp3',
  sports: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
  quiz: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3',
  settings: 'https://assets.mixkit.co/active_storage/sfx/2576/2576-preview.mp3',
  countries: 'https://assets.mixkit.co/active_storage/sfx/2581/2581-preview.mp3',
  search: 'https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3',
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Preload sounds
  useEffect(() => {
    if (soundEnabled) {
      Object.values(SOUNDS).forEach(url => {
        const audio = new Audio();
        audio.src = url;
        audio.load();
      });
    }
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const playSound = useCallback((type: string) => {
    if (!soundEnabled) return;
    
    const soundUrl = SOUNDS[type] || SOUNDS.default;
    console.log(`Playing sound: ${type} (${soundUrl})`);
    
    if (!audioRef.current) {
      audioRef.current = new Audio();
    } else {
      // Stop current sound before starting a new one to avoid interruption warnings
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    audioRef.current.src = soundUrl;
    audioRef.current.volume = 0.3;
    
    // Use a promise to handle play() properly
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        if (err.name === 'AbortError') {
          // Ignore AbortError as it's expected when sounds are interrupted by new ones
          return;
        }
        console.warn(`Audio play failed for ${type}:`, err);
      });
    }
  }, [soundEnabled]);

  return (
    <SoundContext.Provider value={{ soundEnabled, setSoundEnabled, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};
