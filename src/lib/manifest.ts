import { GIT_STORAGE_CONFIG } from '../config/gitStorage';

const MANIFEST_URL = `https://cdn.jsdelivr.net/gh/${GIT_STORAGE_CONFIG.USER}/${GIT_STORAGE_CONFIG.REPO}@${GIT_STORAGE_CONFIG.BRANCH}/${GIT_STORAGE_CONFIG.BASE_PATH}/assets-manifest.json`;
const RAW_MANIFEST_URL = `https://raw.githubusercontent.com/${GIT_STORAGE_CONFIG.USER}/${GIT_STORAGE_CONFIG.REPO}/${GIT_STORAGE_CONFIG.BRANCH}/${GIT_STORAGE_CONFIG.BASE_PATH}/assets-manifest.json`;

export interface AssetManifest {
  [category: string]: {
    [country: string]: string;
  };
}

export const fetchManifest = async (): Promise<AssetManifest | null> => {
  const cacheBuster = `?t=${Date.now()}`;
  
  const saveManifest = (manifest: any, source: string) => {
    console.log(`[Manifest Loaded from ${source}]`, manifest);
    localStorage.setItem('assets-manifest', JSON.stringify(manifest));
    window.dispatchEvent(new CustomEvent('assets-manifest-updated'));
    return manifest;
  };

  // Try GitHub Raw first
  try {
    const response = await fetch(RAW_MANIFEST_URL + cacheBuster);
    if (response.ok) {
      const manifest = await response.json();
      return saveManifest(manifest, 'GitHub Raw');
    }
  } catch (error) {
    console.warn('GitHub Raw fetch failed, trying CDN...', error);
  }

  // Fallback to CDN
  try {
    const response = await fetch(MANIFEST_URL + cacheBuster);
    if (response.ok) {
      const manifest = await response.json();
      return saveManifest(manifest, 'CDN');
    }
  } catch (error) {
    console.error('All manifest fetch attempts failed:', error);
  }

  return null;
};

export const getManifest = (): AssetManifest | null => {
  const saved = localStorage.getItem('assets-manifest');
  return saved ? JSON.parse(saved) : null;
};
