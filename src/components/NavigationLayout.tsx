import React, { useMemo, useEffect, createContext, useContext, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { countries } from "../data/countries";

const MAIN_PAGES = [
  '/',
  '/capitals',
  '/flags',
  '/currencies',
  '/animals',
  '/flowers',
  '/sports',
  '/quiz',
  '/countries'
];

const sortedCountries = [...countries].sort((a, b) => a.name.localeCompare(b.name));

interface NavigationContextType {
  setCustomHandlers: (handlers: { onNext?: () => boolean; onBack?: () => boolean } | null) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigation must be used within NavigationLayout");
  return context;
};

interface NavigationLayoutProps {
  children: React.ReactNode;
}

export default function NavigationLayout({ children }: NavigationLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [customHandlers, setCustomHandlersState] = useState<{ onNext?: () => boolean; onBack?: () => boolean } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1280);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const setCustomHandlers = useCallback((handlers: { onNext?: () => boolean; onBack?: () => boolean } | null) => {
    setCustomHandlersState(handlers);
  }, []);

  const navInfo = useMemo(() => {
    const path = location.pathname;
    
    // Check if it's a country detail page
    const countryMatch = path.match(/^\/countries\/(.+)$/);
    if (countryMatch) {
      const currentCountryName = decodeURIComponent(countryMatch[1]);
      const currentIndex = sortedCountries.findIndex(c => c.name === currentCountryName);
      
      return {
        prev: currentIndex > 0 ? `/countries/${sortedCountries[currentIndex - 1].name}` : '/',
        next: currentIndex < sortedCountries.length - 1 ? `/countries/${sortedCountries[currentIndex + 1].name}` : '/',
        label: currentCountryName
      };
    }

    // Check if it's a main page
    const mainIndex = MAIN_PAGES.indexOf(path);
    if (mainIndex !== -1) {
      const isGallery = ['/capitals', '/flags', '/currencies', '/animals', '/flowers', '/sports'].includes(path);
      
      if (isGallery) {
        return {
          prev: '/', // Rule 4: Gallery previous goes to Landing Page
          next: '/', // Rule 3: Gallery next goes to Landing Page
          label: null
        };
      }

      if (path === '/countries') {
        return {
          prev: '/', // Rule 5: Search country page previous goes to Landing Page
          next: null,
          label: null
        };
      }

      if (path === '/quiz') {
        return {
          prev: '/', // Rule 6: Quiz page end cases go to Landing Page
          next: '/',
          label: null
        };
      }

      return {
        prev: mainIndex > 0 ? MAIN_PAGES[mainIndex - 1] : null,
        next: mainIndex < MAIN_PAGES.length - 1 ? MAIN_PAGES[mainIndex + 1] : null,
        label: null
      };
    }

    return { prev: null, next: null, label: null };
  }, [location.pathname]);

  const handleNext = useCallback(() => {
    if (customHandlers?.onNext) {
      const handled = customHandlers.onNext();
      if (handled) return;
    }
    if (navInfo.next) {
      navigate(navInfo.next);
    }
  }, [customHandlers, navInfo.next, navigate]);

  const handleBack = useCallback(() => {
    if (customHandlers?.onBack) {
      const handled = customHandlers.onBack();
      if (handled) return;
    }
    if (navInfo.prev) {
      navigate(navInfo.prev);
    }
  }, [customHandlers, navInfo.prev, navigate]);

  // Keyboard and Remote Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "MediaTrackNext") {
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "MediaTrackPrevious") {
        handleBack();
      }
      
      if (e.keyCode === 427 || e.key === "ChannelUp") {
        handleNext();
      } else if (e.keyCode === 428 || e.key === "ChannelDown") {
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handleBack]);

  return (
    <NavigationContext.Provider value={{ setCustomHandlers }}>
      <div className="relative min-h-screen overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="min-h-screen"
            style={{ touchAction: isMobile ? "none" : "auto" }}
            onPan={(e, info) => {
              if (!isMobile) return;
              
              // Only scroll vertically if the movement is primarily vertical
              const isVertical = Math.abs(info.offset.y) > Math.abs(info.offset.x);
              if (isVertical) {
                const container = document.getElementById('app-root');
                if (container) {
                  container.scrollTop -= info.delta.y;
                }
              }
            }}
            onPanEnd={(e, info) => {
              const threshold = 100;
              const velocityThreshold = 0.5;
              const isHorizontal = Math.abs(info.offset.x) > Math.abs(info.offset.y);
              
              if (isHorizontal && (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > velocityThreshold)) {
                if (info.offset.x > 0) {
                  handleBack();
                } else {
                  handleNext();
                }
              }
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </NavigationContext.Provider>
  );
}
