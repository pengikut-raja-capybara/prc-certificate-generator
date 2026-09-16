export interface FontOption {
  name: string;
  category: 'sans-serif' | 'serif' | 'display' | 'handwriting';
  weights: number[];
}

export const POPULAR_FONTS: FontOption[] = [
  { name: 'Cinzel', category: 'serif', weights: [400, 600, 700, 900] },
  { name: 'Playfair Display', category: 'serif', weights: [400, 600, 700] },
  { name: 'Merriweather', category: 'serif', weights: [400, 700] },
  { name: 'Lora', category: 'serif', weights: [400, 600, 700] },
  { name: 'Poppins', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { name: 'Montserrat', category: 'sans-serif', weights: [400, 600, 700, 800] },
  { name: 'Outfit', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { name: 'Inter', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { name: 'Roboto', category: 'sans-serif', weights: [400, 500, 700] },
  { name: 'Great Vibes', category: 'handwriting', weights: [400] },
  { name: 'Alex Brush', category: 'handwriting', weights: [400] },
  { name: 'Dancing Script', category: 'handwriting', weights: [400, 700] },
  { name: 'Pinyon Script', category: 'handwriting', weights: [400] },
];

const loadedFonts = new Set<string>();

/**
 * Loads a Google Font dynamically by injecting link element and waiting for document.fonts.load
 */
export async function loadGoogleFont(fontName: string): Promise<void> {
  if (loadedFonts.has(fontName)) return;

  const fontConfig = POPULAR_FONTS.find((f) => f.name.toLowerCase() === fontName.toLowerCase());
  const weights = fontConfig ? fontConfig.weights.join(';') : '400;700';

  const fontParam = `${fontName.replace(/\s+/g, '+')}:wght@${weights}`;
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontUrl;
  document.head.appendChild(link);

  try {
    await document.fonts.load(`16px "${fontName}"`);
    loadedFonts.add(fontName);
  } catch (err) {
    console.warn(`Font load warning for ${fontName}:`, err);
  }
}
