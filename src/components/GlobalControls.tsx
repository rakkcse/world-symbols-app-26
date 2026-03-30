import { Link, useLocation } from "react-router-dom";
import { Home, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function GlobalControls() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isCountryDetail = location.pathname.startsWith('/countries/');

  return (
    <div className="fixed bottom-6 right-6 lg:top-6 lg:bottom-auto lg:right-6 z-50 flex items-center gap-3">
      {isCountryDetail && (
        <Link
          to="/countries"
          className="p-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          aria-label="Search Countries"
        >
          <Search className="w-5 h-5" />
        </Link>
      )}
      {location.pathname !== '/' && (
        <Link
          to="/"
          className="p-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          aria-label="Go to Home"
        >
          <Home className="w-5 h-5" />
        </Link>
      )}
      {location.pathname === '/' && (
        <button
          onClick={toggleTheme}
          className="p-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5 text-gray-600" /> : <Sun className="w-5 h-5 text-yellow-500" />}
        </button>
      )}
    </div>
  );
}
