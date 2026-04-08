import { useState, ChangeEvent, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Image as ImageIcon, PawPrint, Bird, Upload, Trash2, ArrowLeft, Flag, Banknote, Flower2, LogIn, LogOut, Trophy, Landmark, Search, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { countries } from "../data/countries";
import { currencyDetails } from '../lib/currencyData';
import { useFirebase } from './FirebaseProvider';
import { doc, setDoc, serverTimestamp, collection, getDocs, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { compressImage } from '../lib/image-utils';
import { useNavigation } from './NavigationLayout';
import { useAutoScroll } from './AutoScrollProvider';
import { useSound } from './SoundProvider';
import { getCachedImage, setCachedImage, setBulkCachedImages } from '../lib/cache';

interface GalleryPageProps {
  type: 'animals' | 'birds' | 'flags' | 'currencies' | 'flowers' | 'sports' | 'capitals';
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
  <div className={`relative group ${compact ? 'w-24 md:w-32' : 'w-32 md:w-48'}`}>
    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
    <input
      type="text"
      placeholder="Search (3+ chars)..."
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
      }}
      className="w-full pl-7 pr-7 py-1 bg-white dark:bg-[#1a1d23] border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-[10px] md:text-sm"
    />
    {searchQuery && (
      <button
        onClick={() => {
          setSearchQuery("");
          setCurrentPage(1);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
      >
        <Trash2 className="w-2.5 h-2.5" />
      </button>
    )}
  </div>
);

export default function GalleryPage({ type }: GalleryPageProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, logout } = useFirebase();
  const { setCustomHandlers } = useNavigation();
  const { playSound, narrationEnabled, replayCounter, replayNarration, pauseNarration, isNarrationPaused, setIsNarrationPaused } = useSound();
  const { autoScrollEnabled, setAutoScrollEnabled, autoScrollDelay } = useAutoScroll();
  const [images, setImages] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 1280 : false);
  const [isLandscape, setIsLandscape] = useState(typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterItem, setFilterItem] = useState<string | null>(null);
  const [preFilterState, setPreFilterState] = useState<{
    letter: string | null;
    page: number;
    search: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = useMemo(() => {
    if (selectedLetter !== "ALL") return 20;
    if (isMobile) {
      if (isLandscape) {
        return 10; // 5 columns x 2 rows
      } else {
        if (type === 'flags') return 12; // 3 columns x 4 rows
        return 9; // 3 columns x 3 rows
      }
    }
    if (type === 'flags') return 12; // 4 columns x 3 rows
    return 10; // 5 columns x 2 rows
  }, [isMobile, isLandscape, selectedLetter, type]);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: string }>(
    Object.fromEntries(countries.map(c => [
      c.name, 
      type === 'animals' ? (c.animals[0] || '') : type === 'birds' ? (c.birds?.[0] || '') : type === 'currencies' ? c.currencies[0] : type === 'flowers' ? c.flowers[0] : type === 'sports' ? c.sports[0] : type === 'capitals' ? c.capital : ''
    ]))
  );
  const galleryRef = useRef<HTMLElement>(null);
  const [narratingCountry, setNarratingCountry] = useState<string | null>(null);
  const [clickedCountry, setClickedCountry] = useState<string | null>(null);
  const [isAlphabetMode, setIsAlphabetMode] = useState(false);

  const toggleMode = () => {
    if (isAlphabetMode) {
      setIsAlphabetMode(false);
      setSelectedLetter("ALL");
    } else {
      setIsAlphabetMode(true);
      setSelectedLetter("A");
    }
    setCurrentPage(1);
    setSearchQuery("");
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1280);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setSelectedItems(
      Object.fromEntries(countries.map(c => [
        c.name, 
        type === 'animals' ? (c.animals[0] || '') : type === 'birds' ? (c.birds?.[0] || '') : type === 'currencies' ? c.currencies[0] : type === 'flowers' ? c.flowers[0] : type === 'sports' ? c.sports[0] : type === 'capitals' ? c.capital : ''
      ]))
    );
  }, [type]);

  // Base filtered countries (only by type, used for consistent totals)
  const baseFilteredCountries = useMemo(() => countries.filter(c => {
    if (type === 'flowers' && (!c.flowers || c.flowers.length === 0)) return false;
    if (type === 'animals' && (!c.animals || c.animals.length === 0)) return false;
    if (type === 'birds' && (!c.birds || c.birds.length === 0)) return false;
    if (type === 'sports' && (!c.sports || c.sports.length === 0)) return false;
    if (type === 'currencies' && (!c.currencies || c.currencies.length === 0)) return false;
    if (type === 'capitals' && !c.capital) return false;
    return true;
  }), [type]);

  const alphabet = ["ALL", ...Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ")];
  const availableLetters = ["ALL", ...Array.from(new Set(baseFilteredCountries.map(c => c.name.trim()[0].toUpperCase()))).sort()];

  const currentIndex = selectedLetter ? alphabet.indexOf(selectedLetter) : -1;
  const prevLetter = currentIndex > 0 ? alphabet[currentIndex - 1] : null;
  const nextLetter = currentIndex < alphabet.length - 1 ? alphabet[currentIndex + 1] : null;

  const filteredCountries = useMemo(() => baseFilteredCountries.filter(c => {
    const countryName = c.name.trim();
    
    // If we are filtering by a specific item (e.g. "Lion")
    if (filterItem) {
      const items = type === 'animals' ? c.animals : type === 'birds' ? c.birds : type === 'currencies' ? c.currencies : type === 'flowers' ? c.flowers : type === 'sports' ? c.sports : [c.capital].filter(Boolean);
      return items.some(item => item.toLowerCase() === filterItem.toLowerCase());
    }

    // Search logic: at least 3 letters
    if (searchQuery.length >= 3) {
      const query = searchQuery.toLowerCase();
      const items = type === 'animals' ? c.animals : type === 'birds' ? c.birds : type === 'currencies' ? c.currencies : type === 'flowers' ? c.flowers : type === 'sports' ? c.sports : [c.capital].filter(Boolean);
      
      const matchesCountry = countryName.toLowerCase().includes(query);
      const matchesItem = items.some(item => item.toLowerCase().includes(query));
      
      return matchesCountry || matchesItem;
    }

    // If searchQuery is < 3, we ignore it and use letter filtering
    const matchesLetter = !selectedLetter || selectedLetter === "ALL" || countryName.toUpperCase().startsWith(selectedLetter.toUpperCase());
    return matchesLetter;
  }), [baseFilteredCountries, searchQuery, selectedLetter, filterItem, type]);

  const totalPages = selectedLetter === "ALL" ? Math.ceil(filteredCountries.length / itemsPerPage) : 1;
  const paginatedCountries = useMemo(() => 
    selectedLetter === "ALL" 
      ? filteredCountries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
      : filteredCountries,
    [filteredCountries, selectedLetter, currentPage, itemsPerPage]
  );

  // Load images from Firestore
  useEffect(() => {
    const fetchImages = async () => {
      const collPath = `global_collections/${type}/images`;
      const collRef = collection(db, 'global_collections', type, 'images');
      const legacyDocRef = doc(db, 'global_collections', type);
      
      try {
        // First check cache
        const cached = getCachedImage(type, 'ALL_IMAGES');
        if (cached) {
          // This is a bit of a hack to store all images in one cache key if we want
          // But let's just use the existing setBulkCachedImages logic
        }

        // Fetch from subcollection
        const snapshot = await getDocs(collRef);
        const newImages: { [key: string]: string } = {};
        snapshot.forEach((doc) => {
          newImages[doc.id] = doc.data().image;
        });
        
        if (Object.keys(newImages).length > 0) {
          setImages(newImages);
          setBulkCachedImages(type, newImages);
        }

        // Also check legacy document
        const docSnap = await getDoc(legacyDocRef);
        if (docSnap.exists() && docSnap.data().images) {
          const legacyImages = docSnap.data().images;
          setImages(prev => ({ ...legacyImages, ...prev }));
          setBulkCachedImages(type, legacyImages);
        }
      } catch (error: any) {
        // Only log if it's not a quota error
        if (!error.message.includes('Quota')) {
          handleFirestoreError(error, OperationType.GET, collPath);
        }
      }
    };

    fetchImages();
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

  const saveImage = async (countryName: string, base64: string) => {
    const docPath = `global_collections/${type}/images/${countryName}`;
    try {
      await setDoc(doc(db, 'global_collections', type, 'images', countryName), {
        image: base64,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: user?.uid || 'anonymous'
      });
      // Manually update local state and cache since we removed onSnapshot
      setImages(prev => ({ ...prev, [countryName]: base64 }));
      setCachedImage(type, countryName, base64);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const fileList = Array.from(files) as File[];
    
    await Promise.all(fileList.map(async (file) => {
      const fileName = file.name.toLowerCase();
      const sortedCountries = [...countries].sort((a, b) => b.name.length - a.name.length);
      const matchedCountry = sortedCountries.find(c => 
        fileName.includes(c.name.toLowerCase())
      );

      if (matchedCountry) {
        try {
          const compressedBase64 = await compressImage(file, 800, 800, 0.7);
          await saveImage(matchedCountry.name, compressedBase64);
        } catch (error) {
          console.error("Error compressing/saving image", error);
        }
      }
    }));
    
    setUploading(false);
    e.target.value = '';
  };

  const removeImage = async (countryName: string) => {
    const docPath = `global_collections/${type}/images/${countryName}`;
    try {
      // 1. Delete from subcollection
      await deleteDoc(doc(db, 'global_collections', type, 'images', countryName));
      
      // 2. Also update legacy document map
      const docRef = doc(db, 'global_collections', type);
      await setDoc(docRef, { 
        type,
        images: { [countryName]: null },
        updatedAt: serverTimestamp(),
        lastUpdatedBy: user?.uid || 'anonymous'
      }, { merge: true });

      // 3. Update local state
      setImages(prev => {
        const next = { ...prev };
        delete next[countryName];
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  };

  const clearAll = async () => {
    const typeLabel = type === 'animals' ? 'animal photos' : type === 'birds' ? 'bird photos' : type === 'flags' ? 'flags' : type === 'currencies' ? 'currency photos' : type === 'flowers' ? 'flower photos' : type === 'sports' ? 'sports photos' : 'capital photos';
    if (window.confirm(`Are you sure you want to clear all uploaded ${typeLabel}?`)) {
      try {
        const collRef = collection(db, 'global_collections', type, 'images');
        const snapshot = await getDocs(collRef);
        const batch = writeBatch(db);
        
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        // Also clear legacy document
        const docRef = doc(db, 'global_collections', type);
        batch.set(docRef, { 
          type,
          images: {},
          updatedAt: serverTimestamp(),
          lastUpdatedBy: user?.uid || 'anonymous'
        }, { merge: true });

        await batch.commit();
        setImages({});
      } catch (error) {
        console.error("Error clearing images", error);
        handleFirestoreError(error, OperationType.DELETE, `global_collections/${type}`);
      }
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'animals': return <PawPrint className="w-5 h-5 mr-2" />;
      case 'birds': return <Bird className="w-5 h-5 mr-2" />;
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
      case 'birds': return 'Avian Collection';
      case 'flags': return 'Vexillology Collection';
      case 'currencies': return 'Numismatic Collection';
      case 'flowers': return 'Botanical Collection';
      case 'sports': return 'Athletic Collection';
      case 'capitals': return 'Metropolitan Collection';
    }
  };

  const autoScrollRef = useRef(autoScrollEnabled);
  useEffect(() => {
    autoScrollRef.current = autoScrollEnabled;
  }, [autoScrollEnabled]);

  // Auto-scroll logic (when narration is disabled)
  useEffect(() => {
    if (!autoScrollEnabled || narrationEnabled) return;

    const interval = setInterval(() => {
      setCurrentPage(prevPage => {
        if (prevPage < totalPages) {
          return prevPage + 1;
        } else {
          // Use setTimeout to defer state updates and navigation to the next tick
          setTimeout(() => {
            if (selectedLetter === "ALL") {
              setAutoScrollEnabled(false);
              navigate('/');
            } else {
              if (nextLetter) {
                setSelectedLetter(nextLetter);
                setCurrentPage(1);
              } else {
                setAutoScrollEnabled(false);
                navigate('/');
              }
            }
          }, 0);
          return prevPage;
        }
      });
    }, autoScrollDelay);

    return () => clearInterval(interval);
  }, [autoScrollEnabled, autoScrollDelay, selectedLetter, totalPages, navigate, setAutoScrollEnabled, narrationEnabled, nextLetter, currentPage]);

  // Narration logic
  useEffect(() => {
    if (!narrationEnabled) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const formatList = (list: string[]) => {
      if (!list || list.length === 0) return '';
      if (list.length === 1) return list[0];
      return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
    };

    const getCountryNarration = (c: any) => {
      switch (type) {
        case 'capitals':
          return c.capital ? `${c.name}: ${c.capital}` : c.name;
        case 'currencies':
          return c.currencies?.length ? `${c.name}: ${formatList(c.currencies)}` : c.name;
        case 'flowers':
          return c.flowers?.length ? `${c.name}: ${formatList(c.flowers)}` : c.name;
        case 'sports':
          return c.sports?.length ? `${c.name}: ${formatList(c.sports)}` : c.name;
        case 'animals':
          return c.animals?.length ? `${c.name}: ${formatList(c.animals)}` : c.name;
        case 'birds':
          return c.birds?.length ? `${c.name}: ${formatList(c.birds)}` : c.name;
        case 'flags':
          return c.name;
        default:
          return c.name;
      }
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

        // 1. Header narration
        if (currentPage === 1 && selectedLetter === "ALL") {
           const headerText = `National ${type.charAt(0).toUpperCase() + type.slice(1)}`;
           await speakText(headerText, engVoices.length > 0 ? engVoices[0] : undefined);
        }

        // 2. Iterate through paginatedCountries
        for (let i = 0; i < paginatedCountries.length; i++) {
          if (signal.aborted) break;
          const c = paginatedCountries[i];
          setNarratingCountry(c.name);
          const text = getCountryNarration(c);
          
          // Alternate voices between each card
          const voice = engVoices.length > 0 ? engVoices[i % engVoices.length] : undefined;
          await speakText(text, voice);
        }
        
        if (!signal.aborted) {
          setNarratingCountry(null);
        }

        // 3. Auto-scroll if enabled
        if (!signal.aborted && autoScrollRef.current) {
          if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
          } else {
            // Use setTimeout to defer state updates and navigation to the next tick
            setTimeout(() => {
              if (selectedLetter === "ALL") {
                setAutoScrollEnabled(false);
                navigate('/');
              } else {
                if (nextLetter) {
                  setSelectedLetter(nextLetter);
                  setCurrentPage(1);
                } else {
                  setAutoScrollEnabled(false);
                  navigate('/');
                }
              }
            }, 0);
          }
        }
      } catch (err) {
        // ignore
      } finally {
        if (!signal.aborted) {
          setNarratingCountry(null);
          setIsNarrationPaused(false);
        }
      }
    };

    runNarration();

    return () => {
      controller.abort();
      window.speechSynthesis.cancel();
      setNarratingCountry(null);
      setIsNarrationPaused(false);
    };
  }, [type, currentPage, selectedLetter, totalPages, narrationEnabled, navigate, setAutoScrollEnabled, searchQuery, nextLetter, replayCounter, setIsNarrationPaused]);

  useEffect(() => {
    return () => {
      setIsNarrationPaused(false);
    };
  }, [setIsNarrationPaused]);

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

    // Adjust baseCols based on type
    if (type === 'flags') {
      baseCols = Math.max(2, baseCols - 1);
    } else if (type === 'flowers') {
      baseCols = baseCols + 1;
    }

    let bestCols = baseCols;

    if (selectedLetter !== "ALL") {
      if (!isMobile) {
        // Dynamic grid based on height to fill empty space
        const headerHeight = 180; // Approximate header + alphabet height
        const availableHeight = window.innerHeight - headerHeight;
        const availableWidth = Math.min(window.innerWidth, 1280) - 64; // max-w-7xl + padding
        
        let minDiff = Infinity;
        let fitCols = baseCols;
        
        // Test a range of columns to find the best vertical fit
        // For flags (16:9), aspect is 0.5625. For others (1:1), aspect is 1.0
        const aspectRatio = type === 'flags' ? 0.5625 : 1.0;
        const labelHeight = type === 'flags' ? 50 : 80; // Flags have smaller labels, others have more info
        
        const testRange = [2, 3, 4, 5, 6, 7, 8];
        for (const c of testRange) {
          const rows = Math.ceil(count / c);
          const cardWidth = availableWidth / c;
          const cardHeight = (cardWidth * aspectRatio) + labelHeight;
          const totalHeight = rows * cardHeight;
          
          // We prefer filling the height or being slightly over (scrollable) 
          // rather than having huge empty spaces
          const diff = Math.abs(totalHeight - availableHeight);
          
          if (diff < minDiff) {
            minDiff = diff;
            fitCols = c;
          }
        }
        bestCols = fitCols;
      } else {
        // Mobile mode: 3 columns if more than 5 countries, else 2
        bestCols = count > 5 ? 3 : 2;
      }
    }

    const newConfig = { cols: bestCols, rows: Math.ceil(count / bestCols) };
    setGridConfig(newConfig);
    localStorage.setItem(`gallery-grid-${type}`, JSON.stringify(newConfig));
  }, [paginatedCountries.length, selectedLetter, type, isMobile]);

  useEffect(() => {
    updateGridConfig();
    window.addEventListener('resize', updateGridConfig);
    return () => window.removeEventListener('resize', updateGridConfig);
  }, [updateGridConfig]);

  // Play sound on internal transitions
  useEffect(() => {
    playSound(type);
  }, [currentPage, selectedLetter, type, playSound]);

  const clearFilter = useCallback(() => {
    if (preFilterState) {
      setSelectedLetter(preFilterState.letter);
      setCurrentPage(preFilterState.page);
      setSearchQuery(preFilterState.search);
      setPreFilterState(null);
    } else {
      setSelectedLetter("ALL");
      setCurrentPage(1);
      setSearchQuery("");
    }
    setFilterItem(null);
    return true;
  }, [preFilterState]);

  // Custom navigation for pagination and alphabetical groups
  useEffect(() => {
    if (filterItem) {
      setCustomHandlers({
        onNext: clearFilter,
        onBack: clearFilter
      });
    } else if (selectedLetter === "ALL") {
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
    } else if (selectedLetter && selectedLetter !== "ALL") {
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
          if (filterItem) {
            clearFilter();
          } else if (selectedLetter === "A") {
            navigate('/');
          } else if (selectedLetter !== "ALL") {
            if (prevLetter) {
              setSelectedLetter(prevLetter);
              setCurrentPage(1);
              return true;
            } else {
              setSelectedLetter("ALL");
              setCurrentPage(1);
              return true;
            }
          } else if (currentPage > 1) {
            setCurrentPage(prev => Math.max(1, prev - 1));
            return true;
          } else {
            navigate('/');
          }
        },
      });
    } else {
      setCustomHandlers(null);
    }

    return () => setCustomHandlers(null);
  }, [selectedLetter, currentPage, totalPages, setCustomHandlers, prevLetter, nextLetter, filterItem, clearFilter]);

  const lettersOnly = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  const row1 = lettersOnly.slice(0, 13);
  const row2 = lettersOnly.slice(13);

  const getLetterStyles = (letter: string) => {
    const isAvailable = availableLetters.includes(letter);
    const isSelected = selectedLetter === letter;
    const isHash = letter === "ALL";

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
    if (selectedLetter !== "ALL" || totalPages <= 1) return null;
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
    if (selectedLetter === "ALL") {
      if (isMobile) {
        if (isLandscape) {
          return { className: "grid-cols-5 gap-1", style: {} };
        } else {
          if (type === 'flags') {
            return { className: "grid-cols-3 gap-0.5", style: {} };
          }
          return { className: "grid-cols-3 gap-0.5", style: {} };
        }
      }
      if (type === 'flags') {
        return {
          className: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6",
          style: {}
        };
      }
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
    <div className={`${isMobile ? 'min-h-screen' : 'h-screen overflow-hidden'} flex flex-col ${isMobile ? 'p-0.5' : 'p-2 md:p-4'}`}>
      <header className={`max-w-6xl mx-auto ${isMobile ? 'mb-0.5' : 'mb-2'} w-full`}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between w-full">
            {/* Left: Title */}
            <div className="flex-1 flex items-center">
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

            {/* Center: Search + Toggle */}
            <div className="flex-1 flex items-center justify-center gap-2 md:gap-4">
              <div className="flex items-center gap-2">
                <SearchInput 
                  compact 
                  searchQuery={searchQuery} 
                  setSearchQuery={setSearchQuery} 
                  setCurrentPage={setCurrentPage} 
                />
                {filterItem && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg animate-in fade-in slide-in-from-left-2">
                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-tight">
                      {filterItem}
                    </span>
                    <button
                      onClick={clearFilter}
                      className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-md transition-colors"
                    >
                      <Trash2 className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* ALL / A-Z Toggle */}
              <div 
                onClick={toggleMode}
                className="flex items-center bg-gray-100 dark:bg-gray-800/50 rounded-full p-1 relative w-24 md:w-28 h-7 md:h-8 cursor-pointer select-none border border-gray-200/50 dark:border-gray-700/50"
              >
                <motion.div 
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-full shadow-sm"
                  animate={{ x: isAlphabetMode ? '100%' : '0%' }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
                <span className={`flex-1 text-center text-[9px] md:text-[10px] font-black z-10 transition-colors duration-200 ${!isAlphabetMode ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>ALL</span>
                <span className={`flex-1 text-center text-[9px] md:text-[10px] font-black z-10 transition-colors duration-200 ${isAlphabetMode ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>A-Z</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex-1 flex items-center justify-end gap-2">
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2"
              >
                <div className="flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <span className="text-[10px] md:text-xs font-black text-blue-700 dark:text-blue-300 leading-none">
                    {selectedLetter === "ALL" 
                      ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredCountries.length)} of ${baseFilteredCountries.length}`
                      : `${filteredCountries.length} of ${baseFilteredCountries.length}`
                    }
                  </span>
                </div>

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

                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-lg">
                  <ImageIcon className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                    {Object.keys(images).length}
                  </span>
                </div>
                
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
          </div>

          <div className="flex flex-col gap-2">
            {isAlphabetMode && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-x-auto no-scrollbar py-1"
              >
                <div className="flex flex-wrap gap-0.5">
                  {lettersOnly.map(letter => (
                    <button
                      key={letter}
                      disabled={!availableLetters.includes(letter)}
                      onClick={() => {
                        setSelectedLetter(letter);
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                      className={`w-6 h-6 md:w-7 md:h-7 rounded-md text-[9px] md:text-[10px] font-bold transition-all flex items-center justify-center ${getLetterStyles(letter)}`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      <main ref={galleryRef} className={`flex-grow max-w-7xl mx-auto ${isMobile ? 'px-1' : 'px-4'} w-full pb-2`}>
        {paginatedCountries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No countries found for "{filterItem || selectedLetter}"</p>
            <button 
              onClick={() => {
                setSelectedLetter("ALL");
                setSearchQuery("");
                setFilterItem(null);
                setPreFilterState(null);
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
              onClick={() => {
                if (isMobile) {
                  setClickedCountry(country.name);
                }
              }}
              className={`group bg-white dark:bg-[#1a1d23] rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 dark:border-gray-800 flex flex-col ${narratingCountry === country.name || clickedCountry === country.name ? 'opacity-0' : (selectedLetter !== "ALL" ? 'scale-95' : '')}`}
            >
              <div className={`relative ${type === 'flags' ? 'aspect-video' : 'aspect-square'} bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden`}>
                <AnimatePresence mode="wait">
                  {images[country.name] ? (
                    <motion.div key="image" className="relative w-full h-full">
                      <motion.img
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        src={images[country.name]}
                        alt={`${country.name} ${type.slice(0, -1)}`}
                        className={`w-full h-full ${type === 'currencies' ? 'object-contain p-2' : 'object-cover'}`}
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
                      <ImageIcon className={`${selectedLetter !== "ALL" ? 'w-6 h-6' : 'w-12 h-12'} mb-1 opacity-10`} />
                      <p className={`${selectedLetter !== "ALL" ? 'text-[7px]' : 'text-[10px]'} font-medium text-gray-400 dark:text-gray-600 uppercase tracking-widest leading-relaxed`}>
                        No {type.slice(0, -1)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={`${isMobile && selectedLetter === "ALL" && narrationEnabled ? 'p-1' : (selectedLetter !== "ALL" ? 'p-1.5' : 'p-3')} flex-grow flex flex-col items-center text-center`}>
                <p className={`${isMobile && selectedLetter === "ALL" && narrationEnabled ? 'text-[9px]' : (selectedLetter !== "ALL" ? 'text-[10px] md:text-xs' : 'text-sm md:text-base')} font-black text-gray-800 dark:text-gray-100 mb-0.5 truncate w-full`}>
                  {country.name}
                </p>
                {(type === 'animals' || type === 'birds' || type === 'currencies' || type === 'flowers' || type === 'sports' || type === 'capitals') ? (
                  <div className={`w-full flex flex-col ${isMobile && selectedLetter === "ALL" && narrationEnabled ? 'gap-0.5' : 'gap-1'} mt-auto`}>
                    {(() => {
                      const items = type === 'animals' ? country.animals : type === 'birds' ? country.birds : type === 'currencies' ? country.currencies : type === 'flowers' ? country.flowers : type === 'sports' ? country.sports : [country.capital].filter(Boolean);
                      if (items.length === 0) {
                        return <span className="text-[7px] text-gray-400 dark:text-gray-500 italic">No data</span>;
                      }
                      return items.slice(0, 1).map((item, idx) => (
                        <div key={item} className="w-full flex flex-col items-center">
                          <button
                            disabled={type === 'capitals'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (type !== 'capitals') {
                                if (!filterItem) {
                                  setPreFilterState({
                                    letter: selectedLetter,
                                    page: currentPage,
                                    search: searchQuery
                                  });
                                }
                                setFilterItem(item);
                                setSelectedLetter("ALL");
                                setSearchQuery("");
                                setCurrentPage(1);
                              }
                            }}
                            className={`px-1 py-0.5 rounded-md text-center transition-all w-full flex flex-col items-center ${
                              idx === 0
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-black text-[8px] md:text-[11px] uppercase tracking-tight border border-blue-100/50 dark:border-blue-900/30'
                                : 'text-gray-500 dark:text-gray-400 font-bold italic text-[7px] md:text-[10px] opacity-80'
                            } ${type !== 'capitals' ? 'hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer' : ''}`}
                          >
                            <span className="truncate block w-full">{item}</span>
                          </button>
                          {type === 'currencies' && currencyDetails[item] && (
                            <div aria-hidden="true" className="flex justify-between w-full mt-1.5 px-1">
                              <span className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] md:text-[13px] bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                                {currencyDetails[item].symbol}
                              </span>
                              <span className="text-amber-600 dark:text-amber-400 font-black text-[10px] md:text-[13px] bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/30 shadow-sm">
                                {currencyDetails[item].code}
                              </span>
                            </div>
                          )}
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
      {selectedLetter === "ALL" && totalPages > 1 && (
        <div className={`flex justify-center ${isMobile ? 'py-1 mt-1' : 'py-6 mt-8'} border-t border-gray-100 dark:border-gray-800`}>
          <PaginationControls />
        </div>
      )}

      {/* Centered Zoom Overlay (Narration or Clicked) */}
      <AnimatePresence>
        {((narratingCountry && !isNarrationPaused) || clickedCountry) && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={() => {
              if (narratingCountry) pauseNarration();
              if (clickedCountry) setClickedCountry(null);
            }}
          >
            <motion.div
              key={narratingCountry || clickedCountry}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: isMobile ? 1.1 : 1.5 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`${isMobile && isLandscape ? 'w-[85vw] flex-row' : 'w-64 md:w-80 flex-col'} bg-white dark:bg-[#1a1d23] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex pointer-events-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const targetCountry = narratingCountry || clickedCountry;
                if (!targetCountry) return null;
                return (
                  <>
                    <div className={`relative ${isMobile && isLandscape ? 'w-1/3 aspect-square' : (type === 'flags' ? 'aspect-video' : 'aspect-square')} bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden`}>
                      {images[targetCountry] ? (
                        <img
                          src={images[targetCountry]}
                          alt={targetCountry}
                          className={`w-full h-full ${type === 'currencies' ? 'object-contain p-4' : 'object-cover'}`}
                        />
                      ) : (
                        <div className="flex flex-col items-center text-gray-300 dark:text-gray-700">
                          <ImageIcon className="w-12 h-12 mb-2 opacity-10" />
                          <span className="text-xs font-bold uppercase tracking-widest">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className={`p-4 flex flex-col items-center text-center ${isMobile && isLandscape ? 'w-2/3 justify-center' : ''}`}>
                      <p className={`${isMobile && isLandscape ? 'text-2xl' : 'text-lg'} font-black text-gray-800 dark:text-gray-100 mb-1`}>
                        {targetCountry}
                      </p>
                      {(() => {
                        const country = countries.find(c => c.name === targetCountry);
                        if (!country) return null;
                        const items = type === 'animals' ? country.animals : type === 'birds' ? country.birds : type === 'currencies' ? country.currencies : type === 'flowers' ? country.flowers : type === 'sports' ? country.sports : [country.capital].filter(Boolean);
                        if (items.length === 0) return null;
                        return (
                          <div className={`w-full flex flex-col gap-1 ${isMobile && isLandscape ? 'mt-4' : 'mt-2'}`}>
                            {items.slice(0, 1).map((item) => (
                              <div key={item} className="w-full flex flex-col items-center">
                                <div className={`${isMobile && isLandscape ? 'px-6 py-2 text-xl' : 'px-3 py-1 text-sm'} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-black uppercase tracking-tight border border-blue-100 dark:border-blue-900/30 rounded-lg`}>
                                  {item}
                                </div>
                                {type === 'currencies' && currencyDetails[item] && (
                                  <div className={`flex justify-between w-full px-2 ${isMobile && isLandscape ? 'mt-4 max-w-xs' : 'mt-2'}`}>
                                    <span className={`${isMobile && isLandscape ? 'text-lg px-4 py-1.5' : 'text-sm px-3 py-1'} text-emerald-600 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-100 dark:border-emerald-900/30 shadow-sm`}>
                                      {currencyDetails[item].symbol}
                                    </span>
                                    <span className={`${isMobile && isLandscape ? 'text-lg px-4 py-1.5' : 'text-sm px-3 py-1'} text-amber-600 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-900/30 shadow-sm`}>
                                      {currencyDetails[item].code}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
    </div>
  );
}
