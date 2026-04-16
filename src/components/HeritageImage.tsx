import React, { useState, useEffect, forwardRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getAssetUrl, getExtensionsForCategory } from '../lib/gitUtils';

interface HeritageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  category: string;
  countryName: string;
  onLoadSuccess?: (url: string) => void;
}

export const HeritageImage = forwardRef<HTMLImageElement, HeritageImageProps>(({ 
  category, 
  countryName, 
  onLoadSuccess,
  className,
  ...props 
}, ref) => {
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(() => 
    (category && countryName) ? getAssetUrl(category, countryName, getExtensionsForCategory(category)[0]) : ''
  );

  useEffect(() => {
    if (!category || !countryName) return;
    const extensions = getExtensionsForCategory(category);
    
    const updateSrc = () => {
      setFailed(false);
      setExtIndex(0);
      setCurrentSrc(getAssetUrl(category, countryName, extensions[0]));
    };

    // Initial update
    updateSrc();

    // Listen for manifest updates to refresh the URL if it changed
    window.addEventListener('assets-manifest-updated', updateSrc);
    return () => window.removeEventListener('assets-manifest-updated', updateSrc);
  }, [category, countryName]);

  const handleError = () => {
    if (!category || !countryName) return;
    const extensions = getExtensionsForCategory(category);
    if (extIndex < extensions.length - 1) {
      const nextIndex = extIndex + 1;
      setExtIndex(nextIndex);
      setCurrentSrc(getAssetUrl(category, countryName, extensions[nextIndex]));
    } else {
      setFailed(true);
    }
  };

  const handleLoad = () => {
    if (onLoadSuccess) {
      onLoadSuccess(currentSrc);
    }
  };

  if (failed || !currentSrc) {
    return (
      <div className="no-image-placeholder flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 w-full h-full">
        <ImageIcon className="w-8 h-8 mb-1 opacity-20" />
        <span className="text-[8px] font-bold uppercase tracking-widest">No Image</span>
      </div>
    );
  }

  return (
    <img
      ref={ref}
      src={currentSrc}
      onError={handleError}
      onLoad={handleLoad}
      className={className}
      {...props}
    />
  );
});

HeritageImage.displayName = 'HeritageImage';
