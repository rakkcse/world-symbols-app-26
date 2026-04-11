import { GIT_STORAGE_CONFIG } from '../config/gitStorage';

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
  
  // Use default extension for category if not provided
  const ext = extension || getExtensionsForCategory(category)[0];
  
  // Clean country name for URL
  const encodedCountry = encodeURIComponent(countryName);
  
  return `https://cdn.jsdelivr.net/gh/${USER}/${REPO}@${BRANCH}/${BASE_PATH}/${folder}/${encodedCountry}.${ext}`;
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
