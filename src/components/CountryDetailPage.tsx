import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from "motion/react";
import { Home, ArrowLeft, ArrowRight, PawPrint, Flag, Banknote, Flower2, Trophy, Loader2, Image as ImageIcon, Landmark, Map as MapIcon, MapPin } from "lucide-react";
import { countries } from "../data/countries";
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import InteractiveMap from './InteractiveMap';
import { useAutoScroll } from './AutoScrollProvider';

export default function CountryDetailPage() {
  const { countryName } = useParams<{ countryName: string }>();
  const navigate = useNavigate();
  const { autoScrollEnabled, setAutoScrollEnabled, autoScrollDelay } = useAutoScroll();
  const [loading, setLoading] = useState(true);
  const [countryImages, setCountryImages] = useState<{ [key: string]: string }>({});
  const [isoCode, setIsoCode] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [continent, setContinent] = useState<string | null>(null);

  const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));
  const currentIndex = sortedCountries.findIndex(c => c.name === countryName);
  const prevCountry = currentIndex > 0 ? sortedCountries[currentIndex - 1] : null;
  const nextCountry = currentIndex < sortedCountries.length - 1 ? sortedCountries[currentIndex + 1] : null;

  const country = countries.find(c => c.name === countryName);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [countryName]);

  // Auto-scroll logic
  useEffect(() => {
    if (!autoScrollEnabled) return;

    const interval = setInterval(() => {
      if (nextCountry) {
        navigate(`/countries/${nextCountry.name}`);
      } else {
        // Stop auto-scroll and go to landing page
        setAutoScrollEnabled(false);
        navigate('/');
      }
    }, autoScrollDelay);

    return () => clearInterval(interval);
  }, [autoScrollEnabled, autoScrollDelay, nextCountry, navigate, setAutoScrollEnabled]);

  useEffect(() => {
    if (!country) {
      navigate('/countries');
      return;
    }

    const fetchImages = async () => {
      setLoading(true);
      const categories = ['capitals', 'flags', 'currencies', 'animals', 'flowers', 'sports'];
      const images: { [key: string]: string } = {};

      try {
        // Fetch ISO code and continent for map
        try {
          const restRes = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(country.name)}?fullText=true`);
          if (restRes.ok) {
            const restData = await restRes.json();
            if (restData && restData[0]) {
              if (restData[0].cca2) {
                setIsoCode(restData[0].cca2.toLowerCase());
              }
              if (restData[0].latlng) {
                setCoordinates([restData[0].latlng[0], restData[0].latlng[1]]);
              }
              if (restData[0].continents && restData[0].continents[0]) {
                setContinent(restData[0].continents[0]);
              }
            }
          }
        } catch (mapInfoError) {
          console.warn("Could not fetch additional map information:", mapInfoError);
        }

        await Promise.all(categories.map(async (category) => {
          const docRef = doc(db, 'global_collections', category);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.images && data.images[country.name]) {
              images[category] = data.images[country.name];
            }
          }
        }));
        setCountryImages(images);
      } catch (error) {
        console.error("Error fetching country images:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [country, navigate]);

  if (!country) return null;

  const categories = [
    { id: 'capitals', label: 'Capital City', icon: <Landmark className="w-6 h-6" />, items: [country.capital].filter(Boolean), color: 'purple' },
    { id: 'flags', label: 'National Flag', icon: <Flag className="w-6 h-6" />, items: [country.name], color: 'red' },
    { id: 'currencies', label: 'National Currency', icon: <Banknote className="w-6 h-6" />, items: country.currencies, color: 'emerald' },
    { id: 'animals', label: 'National Animal', icon: <PawPrint className="w-6 h-6" />, items: [...country.animals, ...(country.birds || [])], color: 'blue' },
    { id: 'flowers', label: 'National Flower', icon: <Flower2 className="w-6 h-6" />, items: country.flowers, color: 'pink' },
    { id: 'sports', label: 'National Sport', icon: <Trophy className="w-6 h-6" />, items: country.sports, color: 'teal' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="max-w-6xl mx-auto mb-4">
        <div className="flex justify-between items-center mb-2">
        </div>

        <div className="flex items-center justify-center gap-6 md:gap-10">
          <div className="flex flex-col items-start">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-6xl font-black tracking-tighter mb-2"
            >
              {country.name}
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1d23] text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 shadow-sm"
            >
              <span>{continent || 'National Heritage Profile'}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
              <span>{currentIndex + 1} of {sortedCountries.length}</span>
            </motion.div>
          </div>

          {isoCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center"
            >
              <img 
                src={`https://raw.githubusercontent.com/djaiss/mapsicon/master/all/${isoCode}/vector.svg`} 
                alt={`${country.name} Outline`} 
                className="w-full h-full object-contain opacity-80 dark:invert dark:opacity-60 drop-shadow-sm"
              />
            </motion.div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Heritage Data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {categories.map((cat, index) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-[#1a1d23] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="aspect-video bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden relative">
                  {countryImages[cat.id] ? (
                    <img 
                      src={countryImages[cat.id]} 
                      alt={cat.label} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-300 dark:text-gray-700">
                      <ImageIcon className="w-8 h-8 mb-1 opacity-20" />
                      <span className="text-[8px] font-bold uppercase tracking-widest">No Image</span>
                    </div>
                  )}
                  <div className={`absolute top-2 left-2 p-1.5 rounded-lg bg-${cat.color}-50 dark:bg-${cat.color}-900/20 text-${cat.color}-600 dark:text-${cat.color}-400 shadow-sm`}>
                    {cat.icon}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{cat.label}</h3>
                  <div className="flex flex-wrap gap-1">
                    {cat.items.map(item => (
                      <span key={item} className={`px-2 py-0.5 bg-${cat.color}-50 dark:bg-${cat.color}-900/10 text-${cat.color}-600 dark:text-${cat.color}-400 rounded-full text-base font-bold border border-${cat.color}-100 dark:border-${cat.color}-900/30`}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {coordinates && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 md:mt-6 bg-white dark:bg-[#1a1d23] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
          >
            <div className="p-2 md:p-3 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Geography of {country.name}</p>
              </div>
              <div className="flex gap-3 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>Lat: {coordinates[0].toFixed(2)}°</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Lng: {coordinates[1].toFixed(2)}°</span>
                </div>
              </div>
            </div>
            <div className="h-[200px] md:h-[300px] w-full relative">
              <InteractiveMap 
                center={coordinates} 
                countryName={country.name} 
                capital={country.capital} 
                isoCode={isoCode}
              />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
