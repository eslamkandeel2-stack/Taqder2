/**
 * Code 39 Barcode Generator for Certificate Verification Codes
 * Generates accurate 1D linear barcode bars that can be scanned by standard barcode readers.
 */

// Code 39 9-element character patterns (5 bars, 4 spaces; 0 = narrow, 1 = wide)
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '*': '010010100', // Start / Stop character
};

export interface BarcodeBar {
  x: number;
  width: number;
}

const barcodeCache = new Map<string, { bars: BarcodeBar[]; totalWidth: number }>();

export function generateCode39Bars(codeText: string): { bars: BarcodeBar[]; totalWidth: number } {
  // Normalize and frame with Code 39 start/stop delimiter (*)
  const cleanCode = codeText ? codeText.toUpperCase().replace(/[^A-Z0-9\-\.\s]/g, '') : 'TAQDEER';
  
  if (barcodeCache.has(cleanCode)) {
    return barcodeCache.get(cleanCode)!;
  }

  const framedText = `*${cleanCode}*`;

  const narrowWidth = 1.2;
  const wideWidth = 3.2;

  let currentX = 0;
  const bars: BarcodeBar[] = [];

  for (let i = 0; i < framedText.length; i++) {
    const char = framedText[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];

    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === '1';
      const width = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        bars.push({ x: currentX, width });
      }
      currentX += width;
    }

    // Inter-character narrow space
    currentX += narrowWidth;
  }

  const result = { bars, totalWidth: currentX };
  barcodeCache.set(cleanCode, result);
  return result;
}
