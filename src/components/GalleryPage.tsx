import { useState, ChangeEvent, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Image as ImageIcon, PawPrint, Upload, Trash2, ArrowLeft, Flag, Banknote, Flower2, LogIn, LogOut, Trophy, Landmark, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { countries } from "../data/countries";
import { useFirebase } from './FirebaseProvider';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { compressImage } from '../lib/image-utils';
import { useNavigation } from './NavigationLayout';
import { useAutoScroll } from './AutoScrollProvider';
import { useSound } from './SoundProvider';

interface GalleryPageProps {
  type: 'animals' | 'flags' | 'currencies' | 'flowers' | 'sports' | 'capitals';
}

const SearchInput = ({ 
  compact = false, 
  searchQuery, 
  setSearchQuery, 
  setCurrentPage 
}: { 
  compact?: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  setCurrentPage: (val: number) => void;
}) => (
  <div className={`relative group ${compact ? 'w-32' : 'w-32 md:w-48'}`}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
    <input
      type="text"
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
      }}
      className="w-full pl-9 pr-10 py-2 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
    />
    {searchQuery && (
      <button
        onClick={() => {
          setSearchQuery("");
          setCurrentPage(1);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    )}
  </div>
);

export default function GalleryPage({ type }: GalleryPageProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, logout } = useFirebase();
  const { setCustomHandlers } = useNavigation();
  const { playSound } = useSound();
  const { autoScrollEnabled, setAutoScrollEnabled, autoScrollDelay } = useAutoScroll();
  const [images, setImages] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>("#");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: string }>(
    Object.fromEntries(countries.map(c => [
      c.name, 
      type === 'animals' ? (c.animals[0] || c.birds?.[0] || '') : type === 'currencies' ? c.currencies[0] : type === 'flowers' ? c.flowers[0] : type === 'sports' ? c.sports[0] : type === 'capitals' ? c.capital : ''
    ]))
  );
  const galleryRef = useRef<HTMLElement>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1280);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load images from Firestore
  useEffect(() => {
    const docPath = `global_collections/${type}`;
    const docRef = doc(db, 'global_collections', type);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setImages(docSnap.data().images || {});
      } else {
        setImages({});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, docPath);
    });

    return () => unsubscribe();
  }, [type]);

  // Scroll to top of gallery when letter changes
  useEffect(() => {
    const container = isMobile ? document.getElementById('app-root') : window;
    if (galleryRef.current) {
      const offset = 100; // Offset to keep some of the header/alphabet visible
      
      if (isMobile && container instanceof HTMLElement) {
        const elementRect = galleryRef.current.getBoundingClientRect().top;
        const containerRect = container.getBoundingClientRect().top;
        const scrollPosition = container.scrollTop + (elementRect - containerRect) - offset;
        
        container.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      } else {
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = galleryRef.current.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedLetter, currentPage, isMobile]);

  const saveImages = async (newImages: { [key: string]: string }) => {
    const docPath = `global_collections/${type}`;
    try {
      await setDoc(doc(db, 'global_collections', type), {
        type,
        images: newImages,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: user?.uid || 'anonymous'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  };

  const alphabet = ["#", ...Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ")];
  const availableLetters = ["#", ...Array.from(new Set(countries.map(c => c.name.trim()[0].toUpperCase()))).sort()];

  const currentIndex = selectedLetter ? availableLetters.indexOf(selectedLetter) : -1;
  const prevLetter = currentIndex > 0 ? availableLetters[currentIndex - 1] : null;
  const nextLetter = currentIndex < availableLetters.length - 1 ? availableLetters[currentIndex + 1] : null;

  const filteredCountries = countries.filter(c => {
    const countryName = c.name.trim();
    const matchesSearch = countryName.toLowerCase().includes(searchQuery.toLowerCase());
    if (searchQuery) return matchesSearch;
    
    const matchesLetter = !selectedLetter || selectedLetter === "#" || countryName.toUpperCase().startsWith(selectedLetter.toUpperCase());
    return matchesSearch && matchesLetter;
  });

  const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);
  const paginatedCountries = selectedLetter === "#" 
    ? filteredCountries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredCountries;

  // Auto-scroll logic
  useEffect(() => {
    if (!autoScrollEnabled || selectedLetter !== "#") return;

    const interval = setInterval(() => {
      setCurrentPage(prev => {
        if (prev < totalPages) {
          return prev + 1;
        }
        // Stop auto-scroll and go to landing page
        setAutoScrollEnabled(false);
        navigate('/');
        return prev;
      });
    }, autoScrollDelay);

    return () => clearInterval(interval);
  }, [autoScrollEnabled, autoScrollDelay, selectedLetter, totalPages, navigate, setAutoScrollEnabled]);

  const [gridConfig, setGridConfig] = useState<{ cols: number; rows: number }>(() => {
    try {
      const saved = localStorage.getItem(`gallery-grid-${type}`);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return { cols: 5, rows: 2 };
  });

  const updateGridConfig = useCallback(() => {
    const count = paginatedCountries.length;
    if (count === 0) return;

    // Base responsive columns
    let baseCols = 5;
    if (window.innerWidth < 640) baseCols = 2;
    else if (window.innerWidth < 768) baseCols = 3;
    else if (window.innerWidth < 1024) baseCols = 4;
    else if (window.innerWidth < 1280) baseCols = 5;
    else baseCols = 6;

    let bestCols = baseCols;

    if (selectedLetter !== "#") {
      if (baseCols >= 4 && selectedLetter === 'U') {
        bestCols = 4; // 7 items -> 2 rows of 4 and 3
      } else if (baseCols >= 4 && selectedLetter === 'S') {
        bestCols = 9; // 26 items -> 3 rows (9 columns reduces card size as requested)
      } else if (count <= baseCols) {
        bestCols = Math.max(2, count);
      } else {
        // For A-Z mode, try to balance the last row to avoid orphans
        // Check a small range around the base columns
        const minCols = Math.max(2, baseCols - 1);
        const maxCols = Math.min(8, baseCols + 1);
        
        let minEmpty = 999;
        let balancedCols = baseCols;
        
        for (let c = minCols; c <= maxCols; c++) {
          const empty = (c - (count % c)) % c;
          if (empty < minEmpty) {
            minEmpty = empty;
            balancedCols = c;
          } else if (empty === minEmpty) {
            // If tied, prefer the one closer to baseCols
            if (Math.abs(c - baseCols) < Math.abs(balancedCols - baseCols)) {
              balancedCols = c;
            } else if (Math.abs(c - baseCols) === Math.abs(balancedCols - baseCols)) {
              // If still tied, prefer fewer columns (larger items) to fill space better
              if (c < balancedCols) {
                balancedCols = c;
              }
            }
          }
        }
        bestCols = balancedCols;
      }
    }

    const newConfig = { cols: bestCols, rows: Math.ceil(count / bestCols) };
    setGridConfig(newConfig);
    localStorage.setItem(`gallery-grid-${type}`, JSON.stringify(newConfig));
  }, [paginatedCountries.length, selectedLetter, type]);

  useEffect(() => {
    updateGridConfig();
    window.addEventListener('resize', updateGridConfig);
    return () => window.removeEventListener('resize', updateGridConfig);
  }, [updateGridConfig]);

  // Play sound on internal transitions
  useEffect(() => {
    playSound(type);
  }, [currentPage, selectedLetter, type, playSound]);

  // Custom navigation for pagination and alphabetical groups
  useEffect(() => {
    if (selectedLetter === "#") {
      setCustomHandlers({
        onNext: () => {
          if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
            return true;
          }
          return false; // Let NavigationLayout handle it (go to Landing)
        },
        onBack: () => {
          if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
            return true;
          }
          return false; // Let NavigationLayout handle it (go to Landing)
        }
      });
    } else if (selectedLetter && selectedLetter !== "#") {
      setCustomHandlers({
        onNext: () => {
          if (selectedLetter === "Z") {
            return false; // Go to Landing Page
          }
          if (nextLetter) {
            setSelectedLetter(nextLetter);
            setCurrentPage(1);
            return true;
          }
          return false; // End of available letters, go to Landing
        },
        onBack: () => {
          if (selectedLetter === "A") {
            setSelectedLetter("#");
            setCurrentPage(1);
            return true;
          }
          if (prevLetter) {
            setSelectedLetter(prevLetter);
            setCurrentPage(1);
            return true;
          }
          return false;
        }
      });
    } else {
      setCustomHandlers(null);
    }

    return () => setCustomHandlers(null);
  }, [selectedLetter, currentPage, totalPages, setCustomHandlers, prevLetter, nextLetter]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const fileList = Array.from(files) as File[];
    let processedCount = 0;
    const newImages = { ...images };

    fileList.forEach(async (file) => {
      const fileName = file.name.toLowerCase();
      const sortedCountries = [...countries].sort((a, b) => b.name.length - a.name.length);
      const matchedCountry = sortedCountries.find(c => 
        fileName.includes(c.name.toLowerCase())
      );

      if (matchedCountry) {
        try {
          const compressedBase64 = await compressImage(file, 800, 800, 0.7);
          newImages[matchedCountry.name] = compressedBase64;
        } catch (error) {
          console.error("Error compressing image", error);
        }
      }
      
      processedCount++;
      if (processedCount === fileList.length) {
        await saveImages(newImages);
        setUploading(false);
      }
    });
    
    e.target.value = '';
  };

  const removeImage = async (countryName: string) => {
    const next = { ...images };
    delete next[countryName];
    await saveImages(next);
  };

  const clearAll = async () => {
    const typeLabel = type === 'animals' ? 'animal photos' : type === 'flags' ? 'flags' : type === 'currencies' ? 'currency photos' : type === 'flowers' ? 'flower photos' : type === 'sports' ? 'sports photos' : 'capital photos';
    if (window.confirm(`Are you sure you want to clear all uploaded ${typeLabel}?`)) {
      await saveImages({});
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'animals': return <PawPrint className="w-5 h-5 mr-2" />;
      case 'flags': return <Flag className="w-5 h-5 mr-2" />;
      case 'currencies': return <Banknote className="w-5 h-5 mr-2" />;
      case 'flowers': return <Flower2 className="w-5 h-5 mr-2" />;
      case 'sports': return <Trophy className="w-5 h-5 mr-2" />;
      case 'capitals': return <Landmark className="w-5 h-5 mr-2" />;
    }
  };

  const getCollectionLabel = () => {
    switch (type) {
      case 'animals': return 'Wildlife Collection';
      case 'flags': return 'Vexillology Collection';
      case 'currencies': return 'Numismatic Collection';
      case 'flowers': return 'Botanical Collection';
      case 'sports': return 'Athletic Collection';
      case 'capitals': return 'Metropolitan Collection';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'animals': return "Build your personal collection by uploading animal photos. Name your files with the country name for automatic matching.";
      case 'flags': return "Create your digital flag collection. Upload flag images named after their respective countries for automatic organization.";
      case 'currencies': return "Curate your digital currency collection. Upload banknote or coin images named after their respective countries.";
      case 'flowers': return "Discover the world's national flowers. Upload photos of symbolic flora named after their respective countries.";
      case 'sports': return "Explore national sports from around the globe. Upload photos of athletes or sporting events named after their respective countries.";
      case 'capitals': return "Explore the world's capital cities. Upload photos of landmarks or cityscapes named after their respective countries.";
    }
  };

  const lettersOnly = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  const row1 = lettersOnly.slice(0, 13);
  const row2 = lettersOnly.slice(13);

  const getLetterStyles = (letter: string) => {
    const isAvailable = availableLetters.includes(letter);
    const isSelected = selectedLetter === letter;
    const isHash = letter === "#";

    if (isSelected) {
      if (isHash) return 'bg-indigo-600 text-white shadow-md scale-105';
      return 'bg-black dark:bg-white text-white dark:text-black shadow-md scale-105';
    }
    
    if (isAvailable) {
      if (isHash) return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900/30';
      return 'bg-white dark:bg-[#1a1d23] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800';
    }
    
    return 'bg-transparent text-gray-200 dark:text-gray-800 cursor-not-allowed';
  };

  const PaginationControls = () => {
    if (selectedLetter !== "#" || totalPages <= 1) return null;
    return (
      <div className="flex items-center gap-2 bg-white dark:bg-[#1a1d23] p-1 px-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          className="p-1 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-1 px-1">
          <span className="text-[10px] font-bold">{currentPage}</span>
          <span className="text-[10px] text-gray-400">/</span>
          <span className="text-[10px] text-gray-400">{totalPages}</span>
        </div>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          className="p-1 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const getGridConfig = () => {
    if (selectedLetter === "#") {
      return {
        className: "grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-3 md:gap-4",
        style: {}
      };
    }
    
    return {
      className: `gap-1 md:gap-2`,
      style: { 
        gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
        gridAutoRows: gridConfig.rows > 3 ? 'min-content' : '1fr'
      }
    };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'min-h-screen' : 'h-screen overflow-hidden'} flex flex-col p-2 md:p-4`}>
      <header className="max-w-6xl mx-auto mb-2 w-full">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center justify-center p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400"
              >
                {getIcon()}
                <span className="text-[10px] font-semibold uppercase tracking-wider ml-1">
                  National {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2"
            >
              <label className="relative cursor-pointer group">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95">
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {uploading ? "..." : `Upload`}
                </div>
              </label>
              
              {Object.keys(images).length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center justify-center px-3 py-1.5 bg-white dark:bg-[#1a1d23] text-red-500 border border-red-100 dark:border-red-900/30 rounded-xl text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear
                </button>
              )}
            </motion.div>
          </div>

          {selectedLetter === "#" ? (
            <div className="w-full flex flex-row lg:flex-row items-center justify-center gap-3 lg:gap-6 px-2 gallery-header-responsive">
              <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3 gallery-search-section">
                <div className="flex items-center gap-1.5">
                  <SearchInput 
                    compact 
                    searchQuery={searchQuery} 
                    setSearchQuery={setSearchQuery} 
                    setCurrentPage={setCurrentPage} 
                  />
                  <button
                    onClick={() => {
                      setSelectedLetter("#");
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${getLetterStyles("#")}`}
                  >
                    #
                  </button>
                </div>
                
                <div className="flex lg:hidden items-center gap-3 gallery-stats-mobile">
                  <div className="flex flex-col items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <span className="text-[7px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Total</span>
                    <span className="text-xs font-black text-blue-700 dark:text-blue-300 leading-none">{filteredCountries.length}</span>
                  </div>
                  <PaginationControls />
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-1 lg:border-l border-gray-100 dark:border-gray-800 lg:pl-3 md:pl-6 w-full lg:w-auto overflow-x-auto no-scrollbar gallery-alphabet-container"
              >
                <div className="flex flex-wrap justify-center gap-0.5 min-w-0 gallery-alphabet-row">
                  {lettersOnly.map(letter => (
                    <button
                      key={letter}
                      disabled={!availableLetters.includes(letter)}
                      onClick={() => {
                        setSelectedLetter(letter);
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                      className={`w-6 h-6 md:w-6.5 md:h-6.5 rounded-md text-[9px] md:text-[9px] font-bold transition-all flex items-center justify-center ${getLetterStyles(letter)}`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </motion.div>

              <div className="hidden lg:flex items-center gap-3 border-l border-gray-100 dark:border-gray-800 pl-3 md:pl-6 gallery-stats-desktop">
                <div className="flex flex-col items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  <span className="text-[8px] md:text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-0.5">Total</span>
                  <span className="text-sm md:text-xl font-black text-blue-700 dark:text-blue-300 leading-none">{filteredCountries.length}</span>
                </div>
                <PaginationControls />
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-row lg:flex-row items-center justify-center gap-3 lg:gap-6 px-2 gallery-header-responsive">
              <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3 gallery-search-section">
                <div className="flex items-center gap-1.5">
                  <SearchInput 
                    compact 
                    searchQuery={searchQuery} 
                    setSearchQuery={setSearchQuery} 
                    setCurrentPage={setCurrentPage} 
                  />
                  <button
                    onClick={() => {
                      setSelectedLetter("#");
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${getLetterStyles("#")}`}
                  >
                    #
                  </button>
                </div>

                <div className="flex lg:hidden items-center gap-3 gallery-stats-mobile">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-900/30 flex flex-col items-center">
                    <span className="text-[7px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Total</span>
                    <span className="text-xs font-black text-blue-700 dark:text-blue-300 leading-none">{filteredCountries.length}</span>
                  </div>
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-1 lg:border-l border-gray-100 dark:border-gray-800 lg:pl-3 md:pl-6 w-full lg:w-auto overflow-x-auto no-scrollbar gallery-alphabet-container"
              >
                <div className="flex flex-wrap justify-center gap-0.5 min-w-0 gallery-alphabet-row">
                  {lettersOnly.map(letter => (
                    <button
                      key={letter}
                      disabled={!availableLetters.includes(letter)}
                      onClick={() => {
                        setSelectedLetter(letter);
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                      className={`w-6 h-6 md:w-6.5 md:h-6.5 rounded-md text-[9px] md:text-[9px] font-bold transition-all flex items-center justify-center ${getLetterStyles(letter)}`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </motion.div>

              <div className="hidden lg:flex flex-col items-center justify-center shrink-0 border-l border-gray-100 dark:border-gray-800 pl-3 md:pl-6 gallery-stats-desktop">
                <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/30 flex flex-col items-center">
                  <span className="text-[8px] md:text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-0.5">Total</span>
                  <span className="text-sm md:text-xl font-black text-blue-700 dark:text-blue-300 leading-none">{filteredCountries.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main ref={galleryRef} className="flex-grow max-w-7xl mx-auto px-4 w-full pb-4">
        {paginatedCountries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No countries found for "{selectedLetter}"</p>
            <button 
              onClick={() => {
                setSelectedLetter("#");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="mt-4 text-blue-500 hover:underline font-bold"
            >
              View all countries
            </button>
          </div>
        ) : (
          <div 
            className={`grid ${getGridConfig().className}`}
            style={getGridConfig().style}
          >
          <AnimatePresence mode="popLayout">
            {paginatedCountries.map((country) => (
            <motion.div
              key={country.name}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className={`group bg-white dark:bg-[#1a1d23] rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 dark:border-gray-800 flex flex-col ${selectedLetter !== "#" ? 'scale-95' : ''}`}
            >
              <div className="relative aspect-square bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  {images[country.name] ? (
                    <motion.div key="image" className="relative w-full h-full">
                      <motion.img
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        src={images[country.name]}
                        alt={`${country.name} ${type.slice(0, -1)}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1.5 right-1.5 flex gap-1">
                        <button
                          onClick={() => removeImage(country.name)}
                          className="p-1 bg-white/90 dark:bg-black/50 backdrop-blur shadow-sm rounded-md text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center text-gray-300 dark:text-gray-700 p-2 text-center"
                    >
                      <ImageIcon className={`${selectedLetter !== "#" ? 'w-6 h-6' : 'w-12 h-12'} mb-1 opacity-10`} />
                      <p className={`${selectedLetter !== "#" ? 'text-[7px]' : 'text-[10px]'} font-medium text-gray-400 dark:text-gray-600 uppercase tracking-widest leading-relaxed`}>
                        No {type.slice(0, -1)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={`${selectedLetter !== "#" ? 'p-1.5' : 'p-3'} flex-grow flex flex-col items-center text-center`}>
                <p className={`${selectedLetter !== "#" ? 'text-[10px] md:text-xs' : 'text-sm md:text-base'} font-black text-gray-800 dark:text-gray-100 mb-1 truncate w-full`}>
                  {country.name}
                </p>
                {(type === 'animals' || type === 'currencies' || type === 'flowers' || type === 'sports' || type === 'capitals') ? (
                  <div className="w-full flex flex-col gap-1 mt-auto">
                    {(() => {
                      const items = type === 'animals' ? [...country.animals, ...(country.birds || [])] : type === 'currencies' ? country.currencies : type === 'flowers' ? country.flowers : type === 'sports' ? country.sports : [country.capital].filter(Boolean);
                      if (items.length === 0) {
                        return <span className="text-[7px] text-gray-400 dark:text-gray-500 italic">No data</span>;
                      }
                      return items.slice(0, 2).map((item, idx) => (
                        <div
                          key={item}
                          className={`px-2 py-1 rounded-lg text-center transition-all ${
                            idx === 0
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-black text-[9px] md:text-[11px] uppercase tracking-tight border border-blue-100/50 dark:border-blue-900/30'
                              : 'text-gray-500 dark:text-gray-400 font-bold italic text-[8px] md:text-[10px] opacity-80'
                          }`}
                        >
                          <span className="truncate block">{item}</span>
                        </div>
                      ));
                    })()}
                  </div>
                ) : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}
    </main>
    </div>
  );
}
