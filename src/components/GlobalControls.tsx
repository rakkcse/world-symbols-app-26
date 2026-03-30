import { Link, useLocation } from "react-router-dom";
import { Home, Search, Settings } from "lucide-react";

export default function GlobalControls() {
  const location = useLocation();
  const isCountryDetail = location.pathname.startsWith('/countries/');

  return (
    <div className="fixed bottom-6 right-6 lg:top-6 lg:bottom-auto z-50 flex items-center gap-3">
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
        <Link
          to="/settings"
          className="p-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
      )}
    </div>
  );
}
