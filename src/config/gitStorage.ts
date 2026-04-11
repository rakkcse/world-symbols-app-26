export const GIT_STORAGE_CONFIG = {
  USER: 'rakkcse', // Replace with your GitHub username
  REPO: 'heritage-assets', // Replace with your repository name
  BRANCH: 'main',
  BASE_PATH: 'assets'
};

export const ASSET_CATEGORIES = [
  'animals',
  'birds',
  'currency',
  'flags',
  'monuments',
  'flowers',
  'sports'
] as const;

export type AssetCategory = typeof ASSET_CATEGORIES[number];
