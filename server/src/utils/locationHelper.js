/**
 * Normalizes an incoming location string to extract the city name.
 * Handles: "Kanpur, Kanpur Nagar, Uttar Pradesh" -> "kanpur"
 */
const normalizeCity = (locationString) => {
  if (!locationString || typeof locationString !== 'string') return '';

  let searchStr = locationString;

  // 1. Check if the input is a URL (e.g., Nominatim URL)
  if (locationString.startsWith('http')) {
    try {
      const url = new URL(locationString);
      const qParam = url.searchParams.get('q');
      if (qParam) {
        searchStr = qParam;
      }
    } catch (e) {
      // Not a valid URL, treat as plain string
    }
  }

  // 2. Extract city from the search string
  // Handles: "Kanpur, Kanpur Nagar, Uttar Pradesh" -> "kanpur"
  return searchStr
    .split(',')[0]        // Take the first part before the first comma
    .trim()               // Remove leading/trailing whitespace
    .toLowerCase()        // Force to lowercase for consistency
    .replace(/\s+/g, ' '); // Collapse multiple spaces into one
};

module.exports = {
  normalizeCity
};
