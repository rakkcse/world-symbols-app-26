import { useState } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Globe2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { countries } from "../data/countries";

export default function CountriesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedCountries = filteredCountries.reduce((acc, country) => {
    const firstLetter = country.name[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(country);
    return acc;
  }, {} as { [key: string]: typeof countries });

  const sortedLetters = Object.keys(groupedCountries).sort();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-12">
        <div className="flex justify-between items-center mb-8">
        </div>

        <div className="text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12 px-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 w-full md:w-auto">
              <Globe2 className="w-5 h-5 mr-2" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Global Directory
              </span>
            </div>

            <div className="relative w-full md:flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto relative px-4 md:px-0">
        {/* Alphabetical Scrollbar */}
        <div className="fixed right-2 md:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 md:gap-2 bg-white/80 dark:bg-[#1a1d23]/80 backdrop-blur-md p-2 rounded-full border border-gray-100 dark:border-gray-800 shadow-lg max-h-[80vh] overflow-y-auto no-scrollbar">
          {sortedLetters.map(letter => (
            <button
              key={letter}
              onClick={() => {
                const element = document.getElementById(`section-${letter}`);
                if (element) {
                  const offset = 20;
                  const bodyRect = document.body.getBoundingClientRect().top;
                  const elementRect = element.getBoundingClientRect().top;
                  const elementPosition = elementRect - bodyRect;
                  const offsetPosition = elementPosition - offset;

                  window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                  });
                }
              }}
              className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-[10px] md:text-sm font-black rounded-full hover:bg-blue-600 hover:text-white transition-all text-blue-600 dark:text-blue-400"
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="space-y-12">
          {sortedLetters.map(letter => (
            <section key={letter} id={`section-${letter}`} className="relative scroll-mt-8">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-3xl font-black text-blue-600 dark:text-blue-400 w-12">{letter}</h2>
                <div className="h-px flex-grow bg-gray-100 dark:bg-gray-800"></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-4">
                {groupedCountries[letter].map(country => (
                  <motion.div
                    key={country.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Link 
                      to={`/countries/${country.name}`}
                      className="block bg-white dark:bg-[#1a1d23] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all hover:border-blue-200 dark:hover:border-blue-900"
                    >
                      <h3 className="font-bold text-lg">{country.name}</h3>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
          
          {sortedLetters.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-400 text-xl">No countries found matching your search.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
