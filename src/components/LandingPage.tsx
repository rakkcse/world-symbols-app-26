import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Globe2, PawPrint, Bird, Flag, Banknote, Flower2, Trophy, Map, Brain, Landmark, Search } from "lucide-react";
import { countries } from "../data/countries";

export default function LandingPage() {
  const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));
  const firstCountry = sortedCountries[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-8">
      <header className="max-w-4xl mx-auto mb-6 md:mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-2 mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400"
        >
          <Globe2 className="w-5 h-5 md:w-6 md:h-6 mr-2" />
          <span className="text-[10px] md:text-sm font-bold uppercase tracking-widest">World Heritage Explorer</span>
        </motion.div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8 w-full max-w-xs md:max-w-none flex justify-center items-center gap-4"
      >
        <Link
          to={`/countries/${firstCountry.name}`}
          className="flex items-center justify-center w-full md:w-auto px-8 md:px-10 py-4 md:py-5 bg-blue-600 dark:bg-blue-600 rounded-[24px] shadow-lg shadow-blue-500/30 hover:bg-blue-700 dark:hover:bg-blue-700 transition-all active:scale-95 font-bold text-lg md:text-xl text-white group"
        >
          <Map className="w-6 h-6 md:w-7 md:h-7 mr-3 text-white group-hover:scale-110 transition-transform" />
          View All Countries
        </Link>
        <Link
          to="/countries"
          className="p-4 md:p-5 bg-white dark:bg-[#1a1d23] rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all active:scale-95 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <Search className="w-6 h-6 md:w-7 md:h-7" />
        </Link>
      </motion.div>

      <main className="max-w-6xl w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link to="/capitals" className="group block">
            <div className="bg-white dark:bg-[#1a1d23] p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-purple-100 dark:hover:border-purple-900 transition-all duration-500 flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-50 dark:bg-purple-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-500">
                <Landmark className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-sm md:text-lg font-bold">Capitals</h2>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/flags" className="group block">
            <div className="bg-white dark:bg-[#1a1d23] p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-red-100 dark:hover:border-red-900 transition-all duration-500 flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-red-50 dark:bg-red-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-500">
                <Flag className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-sm md:text-lg font-bold">Flags</h2>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link to="/currencies" className="group block">
            <div className="bg-white dark:bg-[#1a1d23] p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-emerald-100 dark:hover:border-emerald-900 transition-all duration-500 flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-500">
                <Banknote className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-sm md:text-lg font-bold">Currencies</h2>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/animals" className="group block">
            <div className="bg-white dark:bg-[#1a1d23] p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900 transition-all duration-500 flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 dark:bg-blue-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-500">
                <PawPrint className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-sm md:text-lg font-bold">Animals</h2>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Link to="/birds" className="group block">
            <div className="bg-white dark:bg-[#1a1d23] p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-orange-100 dark:hover:border-orange-900 transition-all duration-500 flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-50 dark:bg-orange-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-500">
                <Bird className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-sm md:text-lg font-bold">Birds</h2>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link to="/flowers" className="group block">
            <div className="bg-white dark:bg-[#1a1d23] p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-pink-100 dark:hover:border-pink-900 transition-all duration-500 flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-pink-50 dark:bg-pink-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-pink-600 dark:text-pink-400 mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-500">
                <Flower2 className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-sm md:text-lg font-bold">Flowers</h2>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link to="/sports" className="group block">
            <div className="bg-white dark:bg-[#1a1d23] p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-teal-100 dark:hover:border-teal-900 transition-all duration-500 flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-teal-50 dark:bg-teal-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-500">
                <Trophy className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-sm md:text-lg font-bold">Sports</h2>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link to="/quiz" className="group block">
            <div className="bg-white dark:bg-[#1a1d23] p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-purple-100 dark:hover:border-purple-900 transition-all duration-500 flex flex-col items-center text-center h-full">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-50 dark:bg-purple-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-500">
                <Brain className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-sm md:text-lg font-bold">Quiz</h2>
            </div>
          </Link>
        </motion.div>
      </main>

      <footer className="mt-20 text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-widest">
        © 2026 World Heritage Explorer
      </footer>
    </div>
  );
}
