// Simple in-memory cache to reduce Firestore reads
const imageCache: { [category: string]: { [country: string]: string } } = {};

export const getCachedImage = (category: string, country: string) => {
  return imageCache[category]?.[country];
};

export const setCachedImage = (category: string, country: string, image: string) => {
  if (!imageCache[category]) {
    imageCache[category] = {};
  }
  imageCache[category][country] = image;
};

export const setBulkCachedImages = (category: string, images: { [country: string]: string }) => {
  imageCache[category] = { ...imageCache[category], ...images };
};
