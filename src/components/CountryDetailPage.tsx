import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "motion/react";
import { Home, ArrowLeft, ArrowRight, PawPrint, Bird, Flag, Banknote, Flower2, Trophy, Loader2, Image as ImageIcon, Landmark, Map as MapIcon, MapPin, Volume2, RotateCcw, AlertCircle, RefreshCw } from "lucide-react";
import { countries } from "../data/countries";
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import InteractiveMap from './InteractiveMap';
import { useAutoScroll } from './AutoScrollProvider';
import { useSound } from './SoundProvider';
import { getCachedImage, setCachedImage } from '../lib/cache';
import { currencyDetails } from '../lib/currencyData';
import { getAssetUrl, preloadImage } from '../lib/gitUtils';
import { HeritageImage } from './HeritageImage';

export default function CountryDetailPage() {
  const { countryName } = useParams<{ countryName: string }>();
  const navigate = useNavigate();
  const { autoScrollEnabled, setAutoScrollEnabled, autoScrollDelay } = useAutoScroll();
  const { narrationEnabled, replayCounter, pauseNarration, isNarrationPaused, setIsNarrationPaused } = useSound();
  const [loading, setLoading] = useState(true);
  const [isNarrating, setIsNarrating] = useState(false);
  const [narratingCategory, setNarratingCategory] = useState<string | null>(null);
  const [countryImages, setCountryImages] = useState<{ [key: string]: string }>({});
  const [isoCode, setIsoCode] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [continent, setContinent] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 1280 : false);
  const [isLandscape, setIsLandscape] = useState(typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false);
  const [clickedCategory, setClickedCategory] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      setIsNarrationPaused(false);
    };
  }, [setIsNarrationPaused]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1280);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));
  const currentIndex = sortedCountries.findIndex(c => c.name === countryName);
  const prevCountry = currentIndex > 0 ? sortedCountries[currentIndex - 1] : null;
  const nextCountry = currentIndex < sortedCountries.length - 1 ? sortedCountries[currentIndex + 1] : null;

  const country = countries.find(c => c.name === countryName);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [countryName]);

  const autoScrollRef = useRef(autoScrollEnabled);
  useEffect(() => {
    autoScrollRef.current = autoScrollEnabled;
  }, [autoScrollEnabled]);

  // Auto-scroll logic (when narration is disabled)
  useEffect(() => {
    if (!autoScrollEnabled || narrationEnabled) return;

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
  }, [autoScrollEnabled, autoScrollDelay, nextCountry, navigate, setAutoScrollEnabled, narrationEnabled]);

  // Narration logic
  useEffect(() => {
    if (!country || !narrationEnabled) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const formatList = (list: string[]) => {
      if (!list || list.length === 0) return '';
      if (list.length === 1) return list[0];
      return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
    };

    const getNarrationText = (c: any) => {
      const parts = [];
      if (c.capital) parts.push(`Capital : ${c.capital}`);
      if (c.currencies?.length) parts.push(`Currency : ${formatList(c.currencies)}`);
      if (c.animals?.length) parts.push(`National Animal : ${formatList(c.animals)}`);
      if (c.birds?.length) parts.push(`National Bird : ${formatList(c.birds)}`);
      if (c.flowers?.length) parts.push(`National Flower : ${formatList(c.flowers)}`);
      if (c.sports?.length) parts.push(`National Sport : ${formatList(c.sports)}`);
      
      if (parts.length === 0) return c.name;
      if (parts.length === 1) return `${c.name}, ${parts[0]}`;
      
      const lastPart = parts.pop();
      return `${c.name}, ${parts.join(', ')} and ${lastPart}`;
    };

    const speakText = (text: string, voice: SpeechSynthesisVoice | undefined) => {
      return new Promise<void>((resolve) => {
        if (signal.aborted) return resolve();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.70;
        if (voice) utterance.voice = voice;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        signal.addEventListener('abort', () => {
          window.speechSynthesis.cancel();
          resolve();
        });

        window.speechSynthesis.speak(utterance);
      });
    };

    const runNarration = async () => {
      setIsNarrating(true);
      try {
        window.speechSynthesis.cancel();
        
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(resolve, 500);
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            resolve();
          });
        });
        
        if (signal.aborted) return;

        let voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          await new Promise<void>(resolve => {
            window.speechSynthesis.onvoiceschanged = () => resolve();
            const fallbackId = setTimeout(resolve, 100);
            signal.addEventListener('abort', () => {
              clearTimeout(fallbackId);
              resolve();
            });
          });
          voices = window.speechSynthesis.getVoices();
        }
        if (signal.aborted) return;

        const engVoices = voices.filter(v => v.lang.startsWith('en'));
        let voice: SpeechSynthesisVoice | undefined;
        if (engVoices.length > 0) {
          voice = engVoices[currentIndex % engVoices.length];
        }

        // 1. Speak country name
        setNarratingCategory('header');
        await speakText(country.name, voice);
        
        if (signal.aborted) return;

        // 2. Speak categories
        const catsToNarrate = [
          { id: 'capitals', text: country.capital ? `Capital : ${country.capital}` : null },
          { id: 'flags', text: `Flag of ${country.name}` },
          { id: 'currencies', text: country.currencies?.length ? `Currency : ${formatList(country.currencies)}` : null },
          { id: 'animals', text: country.animals?.length ? `National Animal : ${formatList(country.animals)}` : null },
          { id: 'birds', text: country.birds?.length ? `National Bird : ${formatList(country.birds)}` : null },
          { id: 'flowers', text: country.flowers?.length ? `National Flower : ${formatList(country.flowers)}` : null },
          { id: 'sports', text: country.sports?.length ? `National Sport : ${formatList(country.sports)}` : null },
        ].filter(c => c.text);

        for (const cat of catsToNarrate) {
          if (signal.aborted) break;
          setNarratingCategory(cat.id);
          await speakText(cat.text!, voice);
        }

        if (!signal.aborted) {
          setNarratingCategory(null);
        }

        if (!signal.aborted && autoScrollRef.current) {
          if (nextCountry) {
            navigate(`/countries/${nextCountry.name}`);
          } else {
            setAutoScrollEnabled(false);
            navigate('/');
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Narration error:", err);
        }
        // Fallback if narration fails completely
        if (!signal.aborted && autoScrollRef.current) {
          setTimeout(() => {
            if (!signal.aborted && autoScrollRef.current) {
              if (nextCountry) {
                navigate(`/countries/${nextCountry.name}`);
              } else {
                setAutoScrollEnabled(false);
                navigate('/');
              }
            }
          }, autoScrollDelay);
        }
      } finally {
        if (!signal.aborted) {
          setIsNarrating(false);
          setNarratingCategory(null);
          setIsNarrationPaused(false);
        }
      }
    };

    runNarration();

    return () => {
      controller.abort();
      window.speechSynthesis.cancel();
      setNarratingCategory(null);
      setIsNarrationPaused(false);
    };
  }, [country, currentIndex, narrationEnabled, nextCountry, navigate, setAutoScrollEnabled, autoScrollDelay, replayCounter, setIsNarrationPaused]);

  useEffect(() => {
    if (!country) {
      navigate('/countries');
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchImages = async () => {
      setLoading(true);
      setIsoCode(null);
      setCoordinates(null);
      setContinent(null);
      const images: { [key: string]: string } = {};

      try {
        setFetchError(null);
        // Fetch ISO code and continent for map
        try {
          const restRes = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(country.name)}?fullText=true`, { signal });
          if (restRes.ok) {
            const restData = await restRes.json();
            if (!signal.aborted && restData && restData[0]) {
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
        } catch (mapInfoError: any) {
          if (mapInfoError.name !== 'AbortError') {
            console.warn("Could not fetch additional map information:", mapInfoError);
          }
        }

        if (signal.aborted) return;

        const categoriesToFetch = ['capitals', 'flags', 'currencies', 'animals', 'birds', 'flowers', 'sports'];
        
        // Use JSDelivr URLs for all categories
        categoriesToFetch.forEach((category) => {
          const url = getAssetUrl(category, country.name);
          images[category] = url;
          // Preload the image
          preloadImage(url);
        });
        
        if (!signal.aborted) {
          setCountryImages(images);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setFetchError(error.message || String(error));
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchImages();
    return () => controller.abort();
  }, [country, navigate]);

  if (!country) return null;

  const categories = [
    { id: 'capitals', label: 'Capital City', icon: <Landmark className="w-6 h-6" />, items: [country.capital].filter(Boolean), color: 'purple' },
    { id: 'flags', label: 'National Flag', icon: <Flag className="w-6 h-6" />, items: [country.name], color: 'red' },
    { id: 'currencies', label: 'National Currency', icon: <Banknote className="w-6 h-6" />, items: country.currencies, color: 'emerald' },
    { id: 'animals', label: 'National Animal', icon: <PawPrint className="w-6 h-6" />, items: country.animals, color: 'blue' },
    { id: 'birds', label: 'National Bird', icon: <Bird className="w-6 h-6" />, items: country.birds, color: 'orange' },
    { id: 'flowers', label: 'National Flower', icon: <Flower2 className="w-6 h-6" />, items: country.flowers, color: 'pink' },
    { id: 'sports', label: 'National Sport', icon: <Trophy className="w-6 h-6" />, items: country.sports, color: 'teal' },
  ].filter(cat => cat.items && cat.items.length > 0);

  const narratingCat = categories.find(c => c.id === narratingCategory);

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-all duration-500`}>
      <header className={`${categories.length === 7 ? 'max-w-7xl' : 'max-w-6xl'} mx-auto mb-4 transition-all duration-500 ${narratingCategory === 'header' ? 'scale-[1.05] ring-4 ring-blue-500/20 dark:ring-blue-400/20 rounded-3xl p-4 bg-white/50 dark:bg-gray-800/50' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 md:gap-10">
          <div className="flex flex-col items-start min-w-[200px] md:min-w-[400px]">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-6xl font-black tracking-tighter"
            >
              {country.name}
            </motion.h1>

            <div className="flex items-center justify-between w-full mt-1 px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">{continent || 'National Heritage Profile'}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">{currentIndex + 1} of {sortedCountries.length}</span>
                {isNarrating && <Volume2 className="w-3 h-3 text-purple-500 animate-pulse" />}
              </div>
            </div>
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

      <main className={`${categories.length === 7 ? 'max-w-7xl' : 'max-w-6xl'} mx-auto`}>
        {fetchError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider">Image load Technical Issue. Please try later</span>
              <span className="text-[10px] opacity-70 font-mono truncate max-w-md">{fetchError}</span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="ml-auto p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Heritage Data...</p>
          </div>
        ) : (
          <div className={`grid ${isMobile ? 'grid-cols-4 gap-1.5 px-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'} ${categories.length === 7 ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-3 md:gap-4`}>
            {categories.map((cat, index) => {
              const isNarrating = narratingCategory === cat.id;
              const isClicked = clickedCategory === cat.id;
              
              return (
                <div key={cat.id} className={`relative ${isNarrating || isClicked ? 'z-50' : 'z-0'}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      if (isMobile) {
                        setClickedCategory(isClicked ? null : cat.id);
                      }
                    }}
                    className={`bg-white dark:bg-[#1a1d23] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col transition-all duration-500 cursor-pointer ${narratingCategory === cat.id || (isMobile && isClicked) ? 'opacity-0' : (!isMobile && isClicked ? 'scale-[1.8] ring-4 ring-blue-500 dark:ring-blue-400 shadow-2xl z-50' : '')}`}
                  >
                    <div className="aspect-square bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden relative">
                      <HeritageImage 
                        category={cat.id} 
                        countryName={country.name} 
                        loading="eager"
                        decoding="async"
                        // @ts-ignore
                        fetchPriority={cat.id === 'flags' || cat.id === 'capitals' ? 'high' : 'auto'}
                        className={`w-full h-full ${cat.id === 'currencies' || cat.id === 'flags' ? 'object-contain' : 'object-cover'}`}
                      />
                      {isMobile && (
                        <div className="absolute top-1 right-1 p-1 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-lg shadow-sm">
                          {React.cloneElement(cat.icon as React.ReactElement<any>, { className: 'w-3 h-3 text-gray-600 dark:text-gray-300' })}
                        </div>
                      )}
                    </div>
                    {(!isMobile || !narrationEnabled) && (
                      <div className={`${isMobile ? 'p-1.5' : 'p-4'}`}>
                        <h3 className={`${isMobile ? 'text-[7px]' : 'text-xs'} font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5 flex items-center gap-1`}>
                          {!isMobile && <span className="opacity-50">{React.cloneElement(cat.icon as React.ReactElement<any>, { className: 'w-3 h-3' })}</span>}
                          {cat.label}
                        </h3>
                        <div className="flex flex-wrap gap-1">
                          {cat.items.map((item, idx) => (
                            <div key={`${item}-${idx}`} className="flex flex-col w-full">
                              <span className={`px-2 py-1 bg-${cat.color}-50 dark:bg-${cat.color}-900/10 text-${cat.color}-600 dark:text-${cat.color}-400 rounded-full ${isMobile ? 'text-[8px]' : 'text-[11px] md:text-xs'} font-bold border border-${cat.color}-100 dark:border-${cat.color}-900/30 text-center whitespace-normal break-words shadow-sm transition-all`}>
                                {item}
                              </span>
                              {cat.id === 'currencies' && currencyDetails[item] && (
                                <div aria-hidden="true" className="flex justify-between w-full mt-1 px-0.5">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-[7px] md:text-[13px] bg-emerald-50 dark:bg-emerald-900/20 px-1 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                                    {currencyDetails[item].symbol}
                                  </span>
                                  {country.name === 'Panama' && (
                                    <div className="text-[6px] md:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center">
                                      Panamanian Balboa
                                    </div>
                                  )}
                                  {country.name === 'Tuvalu' && (
                                    <div className="text-[6px] md:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center">
                                      Tuvalu Dollar
                                    </div>
                                  )}
                                  {country.name === 'Ecuador' && (
                                    <div className="text-[6px] md:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center">
                                      Ecuadorian Centavo
                                    </div>
                                  )}
                                  {country.name === 'Timor-Leste' && (
                                    <div className="text-[6px] md:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center">
                                      Timor-Leste Centavo
                                    </div>
                                  )}
                                  <span className="text-amber-600 dark:text-amber-400 font-black text-[7px] md:text-[13px] bg-amber-50 dark:bg-amber-900/20 px-1 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/30 shadow-sm">
                                    {currencyDetails[item].code}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Mobile Overlay Zoom */}
                  <AnimatePresence>
                    {isMobile && isClicked && (
                      <>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setClickedCategory(null)}
                          className="fixed inset-0 bg-black/60 z-[100]"
                        />
                        <motion.div
                          layoutId={`card-${cat.id}`}
                          initial={{ opacity: 0, scale: 0.8, y: 20, x: '-50%', left: '50%', top: '50%' }}
                          animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%', left: '50%', top: '50%' }}
                          exit={{ opacity: 0, scale: 0.8, y: 20, x: '-50%', left: '50%', top: '50%' }}
                          className="fixed z-[101] w-[90%] max-w-sm bg-white dark:bg-[#1a1d23] rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col"
                        >
                          <div className="aspect-square bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden relative">
                            <HeritageImage 
                              category={cat.id} 
                              countryName={country.name} 
                              className={`w-full h-full ${cat.id === 'currencies' || cat.id === 'flags' ? 'object-contain' : 'object-cover'}`}
                            />
                          </div>
                          <div className="p-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-2">
                              <span className="opacity-50">{React.cloneElement(cat.icon as React.ReactElement<any>, { className: 'w-4 h-4' })}</span>
                              {cat.label}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {cat.items.map((item, idx) => (
                                <div key={`${item}-${idx}`} className="flex flex-col w-full">
                                  <span className={`px-3 py-2 bg-${cat.color}-50 dark:bg-${cat.color}-900/10 text-${cat.color}-600 dark:text-${cat.color}-400 rounded-full text-lg md:text-xl font-bold border border-${cat.color}-100 dark:border-${cat.color}-900/30 text-center whitespace-normal break-words shadow-md transition-all`}>
                                    {item}
                                  </span>
                                  {cat.id === 'currencies' && currencyDetails[item] && (
                                    <div aria-hidden="true" className="flex justify-between w-full mt-2 px-2">
                                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm md:text-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                                        {currencyDetails[item].symbol}
                                      </span>
                                      {country.name === 'Panama' && (
                                        <div className="text-xs md:text-base font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center">
                                          Panamanian Balboa
                                        </div>
                                      )}
                                      {country.name === 'Tuvalu' && (
                                        <div className="text-xs md:text-base font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center">
                                          Tuvalu Dollar
                                        </div>
                                      )}
                                      {country.name === 'Ecuador' && (
                                        <div className="text-xs md:text-base font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center">
                                          Ecuadorian Centavo
                                        </div>
                                      )}
                                      {country.name === 'Timor-Leste' && (
                                        <div className="text-xs md:text-base font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center">
                                          Timor-Leste Centavo
                                        </div>
                                      )}
                                      <span className="text-amber-600 dark:text-amber-400 font-black text-sm md:text-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 shadow-sm">
                                        {currencyDetails[item].code}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Centered Narration Zoom Overlay */}
        <AnimatePresence>
          {narratingCat && !isNarrationPaused && (
            <div 
              className="fixed inset-0 z-[100] flex items-center justify-center"
              onClick={pauseNarration}
            >
              <motion.div
                key={narratingCat.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: isMobile ? 1.1 : 1.5 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`${isMobile && isLandscape ? 'w-[85vw] flex-row' : 'w-64 md:w-80 flex-col'} bg-white dark:bg-[#1a1d23] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex pointer-events-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`relative ${isMobile && isLandscape ? 'w-1/3 aspect-square' : 'aspect-square'} bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden`}>
                  <HeritageImage 
                    category={narratingCat.id} 
                    countryName={country.name} 
                    className={`w-full h-full ${narratingCat.id === 'currencies' || narratingCat.id === 'flags' ? 'object-contain' : 'object-cover'}`}
                  />
                </div>
                <div className={`p-6 flex flex-col items-center text-center ${isMobile && isLandscape ? 'w-2/3 justify-center' : ''}`}>
                  <h3 className={`${isMobile && isLandscape ? 'text-lg' : 'text-sm'} font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-2`}>
                    <span className="opacity-50">{React.cloneElement(narratingCat.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}</span>
                    {narratingCat.label}
                  </h3>
                  <div className={`flex flex-wrap gap-2 justify-center ${isMobile && isLandscape ? 'mt-4' : ''}`}>
                    {narratingCat.items.map((item, idx) => (
                      <div key={`${item}-${idx}`} className="flex flex-col w-full items-center">
                        <span className={`px-4 py-1.5 bg-${narratingCat.color}-50 dark:bg-${narratingCat.color}-900/10 text-${narratingCat.color}-600 dark:text-${narratingCat.color}-400 rounded-full ${isMobile && isLandscape ? 'text-2xl' : 'text-xl'} font-bold border border-${narratingCat.color}-100 dark:border-${narratingCat.color}-900/30 text-center`}>
                          {item}
                        </span>
                        {narratingCat.id === 'currencies' && currencyDetails[item] && (
                          <div aria-hidden="true" className={`flex justify-between w-full px-2 ${isMobile && isLandscape ? 'mt-6 max-w-xs' : 'mt-2'}`}>
                            <span className={`${isMobile && isLandscape ? 'text-lg px-4 py-1.5' : 'text-sm px-3 py-1'} text-emerald-600 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-100 dark:border-emerald-900/30 shadow-sm`}>
                              {currencyDetails[item].symbol}
                            </span>
                            {country.name === 'Panama' && (
                              <div className={`${isMobile && isLandscape ? 'text-base' : 'text-xs'} font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center`}>
                                Panamanian Balboa
                              </div>
                            )}
                            {country.name === 'Tuvalu' && (
                              <div className={`${isMobile && isLandscape ? 'text-base' : 'text-xs'} font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center`}>
                                Tuvalu Dollar
                              </div>
                            )}
                            {country.name === 'Ecuador' && (
                              <div className={`${isMobile && isLandscape ? 'text-base' : 'text-xs'} font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center`}>
                                Ecuadorian Centavo
                              </div>
                            )}
                            {country.name === 'Timor-Leste' && (
                              <div className={`${isMobile && isLandscape ? 'text-base' : 'text-xs'} font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center`}>
                                Timor-Leste Centavo
                              </div>
                            )}
                            <span className={`${isMobile && isLandscape ? 'text-lg px-4 py-1.5' : 'text-sm px-3 py-1'} text-amber-600 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-900/30 shadow-sm`}>
                              {currencyDetails[item].code}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {coordinates && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 md:mt-6 bg-white dark:bg-[#1a1d23] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
          >
            {!isMobile && (
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
            )}
            <div className={`${isMobile ? 'h-[150px]' : 'h-[200px] md:h-[300px]'} w-full relative`}>
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
