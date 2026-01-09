// Manual location-to-coords mapping for common countries
const GEO_LOOKUP: Record<string, [number, number]> = {
  'Democratic Republic of Congo': [-4.3317, 15.3139],
  'Congo': [-4.3317, 15.3139],
  'DRC': [-4.3317, 15.3139],
  'Nigeria': [9.082, 8.6753],
  'Brazil': [-14.235, -51.9253],
  'Yemen': [15.5527, 48.5164],
  'Singapore': [1.3521, 103.8198],
  'Kenya': [-0.0236, 37.9062],
  'India': [20.5937, 78.9629],
  'United States': [37.0902, -95.7129],
  'USA': [37.0902, -95.7129],
  'US': [37.0902, -95.7129],
  'China': [35.8617, 104.1954],
  'United Kingdom': [55.3781, -3.4360],
  'UK': [55.3781, -3.4360],
  'France': [46.2276, 2.2137],
  'Germany': [51.1657, 10.4515],
  'Japan': [36.2048, 138.2529],
  'Australia': [-25.2744, 133.7751],
  'Canada': [56.1304, -106.3468],
  'Mexico': [23.6345, -102.5528],
  'Argentina': [-38.4161, -63.6167],
  'South Africa': [-30.5595, 22.9375],
  'Egypt': [26.8206, 30.8025],
  'Indonesia': [-0.7893, 113.9213],
  'Bangladesh': [23.6850, 90.3563],
  'Pakistan': [30.3753, 69.3451],
  'Thailand': [15.8700, 100.9925],
  'Vietnam': [14.0583, 108.2772],
  'Philippines': [12.8797, 121.7740],
  'Myanmar': [21.9162, 95.9560],
  'Cambodia': [12.5657, 104.9910],
  'Laos': [19.8563, 102.4955],
  'Malaysia': [4.2105, 101.9758],
  'Saudi Arabia': [23.8859, 45.0792],
  'Iran': [32.4279, 53.6880],
  'Iraq': [33.2232, 43.6793],
  'Turkey': [38.9637, 35.2433],
  'Russia': [61.5240, 105.3188],
  'Ukraine': [48.3794, 31.1656],
  'Poland': [51.9194, 19.1451],
  'Italy': [41.8719, 12.5674],
  'Spain': [40.4637, -3.7492],
  'Portugal': [39.3999, -8.2245],
  'Greece': [39.0742, 21.8243],
  'Netherlands': [52.1326, 5.2913],
  'Belgium': [50.5039, 4.4699],
  'Switzerland': [46.8182, 8.2275],
  'Austria': [47.5162, 14.5501],
  'Sweden': [60.1282, 18.6435],
  'Norway': [60.4720, 8.4689],
  'Denmark': [56.2639, 9.5018],
  'Finland': [61.9241, 25.7482],
  'Ireland': [53.4129, -8.2439],
  'New Zealand': [-40.9006, 174.8860],
  'Chile': [-35.6751, -71.5430],
  'Peru': [-9.1900, -75.0152],
  'Colombia': [4.5709, -74.2973],
  'Venezuela': [6.4238, -66.5897],
  'Ecuador': [-1.8312, -78.1834],
  'Bolivia': [-16.2902, -63.5887],
  'Paraguay': [-23.4425, -58.4438],
  'Uruguay': [-32.5228, -55.7658],
  'Ghana': [7.9465, -1.0232],
  'Tanzania': [-6.3690, 34.8888],
  'Uganda': [1.3733, 32.2903],
  'Ethiopia': [9.1450, 38.7667],
  'Sudan': [12.8628, 30.2176],
  'Morocco': [31.7917, -7.0926],
  'Algeria': [28.0339, 1.6596],
  'Tunisia': [33.8869, 9.5375],
  'Libya': [26.3351, 17.2283],
  'Angola': [-11.2027, 17.8739],
  'Mozambique': [-18.6657, 35.5296],
  'Madagascar': [-18.7669, 46.8691],
  'Zimbabwe': [-19.0154, 29.1549],
  'Zambia': [-13.1339, 27.8493],
  'Malawi': [-13.2543, 34.3015],
  'Rwanda': [-1.9403, 29.8739],
  'Burundi': [-3.3731, 29.9189],
  'Cameroon': [7.3697, 12.3547],
  'Senegal': [14.4974, -14.4524],
  'Mali': [17.5707, -3.9962],
  'Niger': [17.6078, 8.0817],
  'Chad': [15.4542, 18.7322],
  'Burkina Faso': [12.2383, -1.5616],
  'Guinea': [9.9456, -9.6966],
  'Sierra Leone': [8.4606, -11.7799],
  'Liberia': [6.4281, -9.4295],
  "Cote d'Ivoire": [7.5400, -5.5471],
  'Ivory Coast': [7.5400, -5.5471],
  'Benin': [9.3077, 2.3158],
  'Togo': [8.6195, 0.8248],
  'Gabon': [-0.8037, 11.6094],
  'Congo Republic': [-0.2280, 15.8277],
  'Central African Republic': [6.6111, 20.9394],
  'South Sudan': [6.8770, 31.3070],
  'Eritrea': [15.1794, 39.7823],
  'Djibouti': [11.8251, 42.5903],
  'Somalia': [5.1521, 46.1996],
  'Afghanistan': [33.9391, 67.7100],
  'Nepal': [28.3949, 84.1240],
  'Sri Lanka': [7.8731, 80.7718],
  'Bhutan': [27.5142, 90.4336],
  'Maldives': [3.2028, 73.2207],
  'Mongolia': [46.8625, 103.8467],
  'North Korea': [40.3399, 127.5101],
  'South Korea': [35.9078, 127.7669],
  'Taiwan': [23.6978, 120.9605],
  'Hong Kong': [22.3193, 114.1694],
  'Mauritius': [-20.3484, 57.5522],
  'Seychelles': [-4.6796, 55.4920],
  'Comoros': [-11.6455, 43.3333],
  'Cuba': [21.5218, -77.7812],
  'Jamaica': [18.1096, -77.2975],
  'Haiti': [18.9712, -72.2852],
  'Dominican Republic': [18.7357, -70.1627],
  'Puerto Rico': [18.2208, -66.5901],
  'Trinidad and Tobago': [10.6918, -61.2225],
  'Guatemala': [15.7835, -90.2308],
  'Belize': [17.1899, -88.4976],
  'Honduras': [15.2000, -86.2419],
  'El Salvador': [13.7942, -88.8965],
  'Nicaragua': [12.2650, -85.2072],
  'Costa Rica': [9.7489, -83.7534],
  'Panama': [8.5380, -80.7821],
  'Guyana': [4.8604, -58.9302],
  'Suriname': [3.9193, -56.0278],
  'French Guiana': [3.9339, -53.1258],
  'Fiji': [-16.7784, 178.0650],
  'Papua New Guinea': [-6.3150, 143.9555],
  'Solomon Islands': [-9.6457, 160.1562],
  'Vanuatu': [-15.3767, 166.9592],
  'New Caledonia': [-20.9043, 165.6180],
  'Samoa': [-13.7590, -172.1046],
  'Tonga': [-21.1789, -175.1982],
  'Cayman Islands': [19.3133, -81.2546],
  'Jersey': [49.2144, -2.1312],
  'Cook Islands': [-21.2367, -159.7777],
  'Isle of Man': [54.2361, -4.5481],
};

export function geocodeLocation(location: string): [number, number] | null {
  const normalized = location.trim();
  // Try exact match first
  if (GEO_LOOKUP[normalized]) {
    return GEO_LOOKUP[normalized];
  }
  // Try case-insensitive match
  for (const [key, value] of Object.entries(GEO_LOOKUP)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return value;
    }
  }
  return null;
}

const COUNTRY_NAMES = Object.keys(GEO_LOOKUP);

export function detectCountryInText(text?: string): string | null {
  if (!text) return null;
  const hay = text.toLowerCase().trim();
  
  // Handle common aliases first (these are always valid, even for short queries)
  if (hay === 'usa' || hay === 'us' || hay === 'united states') {
    return 'United States';
  }
  if (hay === 'uk' || hay === 'united kingdom') {
    return 'United Kingdom';
  }
  if (hay === 'drc' || hay === 'congo') {
    // Prefer Democratic Republic of Congo over Congo Republic
    return 'Democratic Republic of Congo';
  }
  
  // For very short queries (1-2 characters), don't match countries to avoid false positives
  // This prevents "c" from matching "Democratic Republic of Congo" or "China"
  // Users need to type at least 3 characters or use a known alias
  if (hay.length <= 2) {
    return null;
  }
  
  // Try exact match first
  for (const name of COUNTRY_NAMES) {
    const nameLower = name.toLowerCase();
    if (hay === nameLower || hay === nameLower.replace(/\s+/g, '')) {
      return name;
    }
  }
  
  // Try partial match - but require at least 3 characters for partial matching
  // This prevents single letters from matching countries
  if (hay.length >= 3) {
    let bestMatch: string | null = null;
    let bestMatchLength = 0;
    for (const name of COUNTRY_NAMES) {
      const nameLower = name.toLowerCase();
      // Only match if the search term is at least 3 chars and matches the start of a country name
      // or if the country name starts with the search term
      if (nameLower.startsWith(hay) || hay.startsWith(nameLower)) {
        // Prefer longer country names for better specificity
        if (name.length > bestMatchLength) {
          bestMatch = name;
          bestMatchLength = name.length;
        }
      }
    }
    return bestMatch;
  }
  
  return null;
}

export function resolveCoordinatesFromTexts(texts: Array<string | undefined>): [number, number] | null {
  for (const t of texts) {
    const detected = detectCountryInText(t);
    if (detected) return geocodeLocation(detected);
  }
  return null;
}
