import { useEffect } from "react";
import { motion } from "motion/react";
import { Moon, Sun, Play, Pause, Clock, Settings, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeProvider";
import { useAutoScroll } from "./AutoScrollProvider";
import { useSound } from "./SoundProvider";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { autoScrollEnabled, setAutoScrollEnabled, autoScrollDelay, setAutoScrollDelay } = useAutoScroll();
  const { soundEnabled, setSoundEnabled, narrationEnabled, setNarrationEnabled } = useSound();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'Backspace' ||
        e.key === 'Escape' ||
        e.key === 'BrowserBack' ||
        e.key === 'MediaTrackPrevious' ||
        e.key === 'GoBack'
      ) {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-2xl mx-auto">
      <header className="flex items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-500" />
          Settings
        </h1>
      </header>

      <div className="space-y-6">
        {/* Theme Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1a1d23] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between"
        >
          <div>
            <h2 className="text-lg font-bold mb-1">Appearance</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-6 h-6 text-gray-600" /> : <Sun className="w-6 h-6 text-yellow-500" />}
          </button>
        </motion.div>

        {/* Sound Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#1a1d23] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between"
        >
          <div>
            <h2 className="text-lg font-bold mb-1">Sound Effects</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Enable or disable page transition sounds</p>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-xl transition-all ${
              soundEnabled 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            aria-label={soundEnabled ? 'Turn off sound' : 'Turn on sound'}
          >
            {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </motion.div>

        {/* Voice Narration Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-[#1a1d23] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between"
        >
          <div>
            <h2 className="text-lg font-bold mb-1">Voice Narration</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Read country details aloud on page load</p>
          </div>
          <button
            onClick={() => setNarrationEnabled(!narrationEnabled)}
            className={`p-3 rounded-xl transition-all ${
              narrationEnabled 
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            aria-label={narrationEnabled ? 'Turn off narration' : 'Turn on narration'}
          >
            {narrationEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
        </motion.div>

        {/* Auto Scroll Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#1a1d23] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between"
        >
          <div>
            <h2 className="text-lg font-bold mb-1">Auto-Scroll</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Automatically navigate through items</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 transition-opacity ${autoScrollEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <Clock className="w-5 h-5 text-gray-400" />
              <select
                value={autoScrollDelay}
                onChange={(e) => setAutoScrollDelay(Number(e.target.value))}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
              </select>
            </div>

            <button
              onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
              className={`p-3 rounded-xl transition-all ${
                autoScrollEnabled 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              aria-label={autoScrollEnabled ? 'Turn off auto-scroll' : 'Turn on auto-scroll'}
            >
              {autoScrollEnabled ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
