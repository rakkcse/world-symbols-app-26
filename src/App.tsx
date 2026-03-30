import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import GalleryPage from "./components/GalleryPage";
import CountriesPage from "./components/CountriesPage";
import CountryDetailPage from "./components/CountryDetailPage";
import QuizPage from "./components/QuizPage";
import SettingsPage from "./components/SettingsPage";
import { FirebaseProvider } from "./components/FirebaseProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { AutoScrollProvider } from "./components/AutoScrollProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import BackgroundPattern from "./components/BackgroundPattern";
import GlobalControls from "./components/GlobalControls";
import NavigationLayout from "./components/NavigationLayout";

export default function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1280);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AutoScrollProvider>
          <FirebaseProvider>
          <div 
            id="app-root" 
            className={`bg-[#f8f9fa] dark:bg-[#0f1115] text-[#212529] dark:text-[#f8f9fa] font-sans transition-colors duration-300 relative ${isMobile ? 'h-full overflow-y-auto mobile-scrollbar' : 'min-h-screen'}`}
          >
            <BackgroundPattern />
            <div className="relative z-10">
              <Router>
                <GlobalControls />
                <NavigationLayout>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/capitals" element={<GalleryPage type="capitals" />} />
                    <Route path="/animals" element={<GalleryPage type="animals" />} />
                    <Route path="/flags" element={<GalleryPage type="flags" />} />
                    <Route path="/currencies" element={<GalleryPage type="currencies" />} />
                    <Route path="/flowers" element={<GalleryPage type="flowers" />} />
                    <Route path="/sports" element={<GalleryPage type="sports" />} />
                    <Route path="/countries" element={<CountriesPage />} />
                    <Route path="/countries/:countryName" element={<CountryDetailPage />} />
                    <Route path="/quiz" element={<QuizPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </NavigationLayout>
              </Router>
            </div>
          </div>
          </FirebaseProvider>
        </AutoScrollProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
