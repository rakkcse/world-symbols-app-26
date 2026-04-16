import { GIT_STORAGE_CONFIG } from '../config/gitStorage';
import { getManifest } from './manifest';

/**
 * Mapping between UI category IDs and GitHub folder names
 */
const CATEGORY_MAP: Record<string, string> = {
  capitals: 'monuments',
  flags: 'flags',
  currencies: 'currency',
  animals: 'animals',
  birds: 'birds',
  flowers: 'flowers',
  sports: 'sports'
};

export const getExtensionsForCategory = (category: string): string[] => {
  if (category === 'flags') return ['png'];
  return ['webp', 'gif'];
};

/**
 * Generates a JSDelivr CDN URL for a heritage asset
 * @param category The UI category ID
 * @param countryName The name of the country
 * @param extension File extension
 * @returns The JSDelivr URL
 */
export const getAssetUrl = (category: string, countryName: string, extension?: string) => {
  const { USER, REPO, BRANCH, BASE_PATH } = GIT_STORAGE_CONFIG;
  const folder = CATEGORY_MAP[category] || category;
  const manifest = getManifest();
  const trimmedCountry = countryName.trim();

  // If we have a manifest, check if it has a specific filename for this country/category
  // We use the folder name as the key to match the manifest structure
  if (manifest && manifest[folder]) {
    // Try exact match first, then try a case-insensitive match
    const manifestCategory = manifest[folder];
    const filename = manifestCategory[trimmedCountry] || 
                     Object.entries(manifestCategory).find(([k]) => k.toLowerCase() === trimmedCountry.toLowerCase())?.[1];

    if (filename) {
      // Encode the filename in case it has spaces or special characters
      const encodedFilename = encodeURIComponent(filename);
      const url = `https://cdn.jsdelivr.net/gh/${USER}/${REPO}@${BRANCH}/${BASE_PATH}/${folder}/${encodedFilename}`;
      
      if (trimmedCountry === 'Australia') {
        console.log(`[Manifest Match] Australia -> ${filename}`);
      }
      return url;
    }
  }
  
  // Use default extension for category if not provided
  const ext = extension || getExtensionsForCategory(category)[0];
  
  // Clean country name for URL
  const encodedCountry = encodeURIComponent(trimmedCountry);
  
  const fallbackUrl = `https://cdn.jsdelivr.net/gh/${USER}/${REPO}@${BRANCH}/${BASE_PATH}/${folder}/${encodedCountry}.${ext}`;
  
  if (trimmedCountry === 'Australia') {
    if (!manifest) {
      console.log(`[Manifest Fallback] Australia -> Manifest not loaded yet`);
    } else if (!manifest[folder]) {
      console.log(`[Manifest Fallback] Australia -> Category "${folder}" not found in manifest. Available: ${Object.keys(manifest).join(', ')}`);
    } else if (!manifest[folder][trimmedCountry]) {
      console.log(`[Manifest Fallback] Australia -> "Australia" not found in "${folder}". Available: ${Object.keys(manifest[folder]).slice(0, 5).join(', ')}...`);
    }
  }

  return fallbackUrl;
};

/**
 * Preloads an image to the browser cache
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Resolve anyway to not block
  });
};
