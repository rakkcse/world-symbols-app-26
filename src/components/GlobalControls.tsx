import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Home, Search, Settings, ArrowLeft, RotateCcw } from "lucide-react";
import { useSound } from "./SoundProvider";

export default function GlobalControls() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { narrationEnabled, replayNarration } = useSound();
  const isCountryDetail = location.pathname.startsWith('/countries/');
  const isQuiz = location.pathname === '/quiz';
  const quizCategory = searchParams.get('category');

  const isLanding = location.pathname === '/';
  const isSearchCountries = location.pathname === '/countries';
  const showReplay = narrationEnabled && !isLanding && !isQuiz && !isSearchCountries;

  return (
    <>
      {isLanding && (
        <div className="fixed bottom-6 left-6 lg:top-6 lg:bottom-auto z-[110]">
          <Link
            to="/settings"
            className="p-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      )}
      <div className="fixed bottom-6 right-6 lg:top-6 lg:bottom-auto z-[110] flex items-center gap-3">
        {showReplay && (
          <button
            onClick={replayNarration}
            className="p-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-blue-600 dark:text-blue-400"
            aria-label="Replay Narration"
            title="Replay Narration"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
        {isQuiz && quizCategory && (
          <button
            onClick={() => setSearchParams({})}
            className="p-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label="Back to Quiz Categories"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {isCountryDetail && (
          <Link
            to="/countries"
            className="p-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label="Search Countries"
          >
            <Search className="w-5 h-5" />
          </Link>
        )}
        {!isLanding && (
          <Link
            to="/"
            className="p-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label="Go to Home"
          >
            <Home className="w-5 h-5" />
          </Link>
        )}
      </div>
    </>
  );
}
