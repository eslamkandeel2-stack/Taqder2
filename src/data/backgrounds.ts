export interface BackgroundTexturePreset {
  id: string;
  name: string;
  category: 'زخارف إسلامية' | 'كلاسيكي وورق' | 'ملكي وفاخر' | 'رخام وذهب' | 'حديث وأمني';
  url: string;
  previewGradient: string;
}

// High Quality SVG Data URIs for offline, fast, crisp background textures
const createSvgDataUrl = (svgContent: string): string => {
  const encoded = encodeURIComponent(svgContent.trim());
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
};

export const BACKGROUND_TEXTURES: BackgroundTexturePreset[] = [
  // --- 1. زخارف إسلامية وآرابيسك ---
  {
    id: 'arabesque-gold',
    name: 'زخارف آرابيسك ذهبية',
    category: 'زخارف إسلامية',
    previewGradient: 'from-amber-200 via-amber-100 to-amber-50',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <path d="M50 0 L100 50 L50 100 L0 50 Z" fill="none" stroke="#d97706" stroke-width="0.75" opacity="0.12"/>
        <circle cx="50" cy="50" r="25" fill="none" stroke="#b45309" stroke-width="0.75" opacity="0.1"/>
        <path d="M25 25 L75 75 M75 25 L25 75" stroke="#d97706" stroke-width="0.5" opacity="0.08"/>
        <polygon points="50,15 60,35 85,35 65,50 72,75 50,60 28,75 35,50 15,35 40,35" fill="none" stroke="#f59e0b" stroke-width="0.5" opacity="0.1"/>
      </svg>
    `)
  },
  {
    id: 'emerald-islamic-stars',
    name: 'نجوم أندلسية زمردية',
    category: 'زخارف إسلامية',
    previewGradient: 'from-emerald-900 via-teal-900 to-emerald-950',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
        <g stroke="#34d399" stroke-width="0.75" fill="none" opacity="0.15">
          <polygon points="40,5 50,25 70,25 55,40 60,60 40,48 20,60 25,40 10,25 30,25"/>
          <polygon points="40,15 47,28 60,28 50,37 54,50 40,42 26,50 30,37 20,28 33,28"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'ottoman-floral-gold',
    name: 'زخرفة عثمانية زهرية',
    category: 'زخارف إسلامية',
    previewGradient: 'from-amber-300 via-amber-100 to-yellow-50',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <g stroke="#b45309" stroke-width="0.7" fill="none" opacity="0.12">
          <path d="M60 0 C70 20, 80 30, 100 30 C80 40, 70 50, 60 70 C50 50, 40 40, 20 30 C40 30, 50 20, 60 0 Z"/>
          <circle cx="60" cy="35" r="10" stroke="#f59e0b" stroke-width="0.5"/>
          <circle cx="60" cy="35" r="4" fill="#f59e0b" opacity="0.2"/>
          <path d="M0 60 C20 70, 30 80, 30 100 C40 80, 50 70, 70 60 C50 50, 40 40, 30 20 C30 40, 20 50, 0 60 Z"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'moroccan-zellige-gold',
    name: 'زليج مغربي ملكي',
    category: 'زخارف إسلامية',
    previewGradient: 'from-yellow-100 via-amber-100 to-stone-100',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">
        <g stroke="#d97706" stroke-width="0.8" fill="none" opacity="0.14">
          <rect x="15" y="15" width="60" height="60" transform="rotate(45 45 45)"/>
          <rect x="22.5" y="22.5" width="45" height="45"/>
          <circle cx="45" cy="45" r="18" stroke="#b45309"/>
          <path d="M45 0 L45 90 M0 45 L90 45" stroke-dasharray="2,2"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'kufic-geometric-lattice',
    name: 'مشربية هندسية فاخرة',
    category: 'زخارف إسلامية',
    previewGradient: 'from-amber-900 via-stone-900 to-slate-950',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <g stroke="#f59e0b" stroke-width="0.6" fill="none" opacity="0.16">
          <path d="M30 0 L60 30 L30 60 L0 30 Z"/>
          <path d="M30 10 L50 30 L30 50 L10 30 Z"/>
          <line x1="0" y1="0" x2="60" y2="60"/>
          <line x1="60" y1="0" x2="0" y2="60"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'golden-mandala-radial',
    name: 'وريدة أندلسية شعاعية',
    category: 'زخارف إسلامية',
    previewGradient: 'from-amber-100 via-yellow-100 to-amber-50',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
        <g stroke="#b45309" stroke-width="0.75" fill="none" opacity="0.13">
          <circle cx="70" cy="70" r="60"/>
          <circle cx="70" cy="70" r="45"/>
          <circle cx="70" cy="70" r="30"/>
          <path d="M70 10 L70 130 M10 70 L130 70 M27.5 27.5 L112.5 112.5 M112.5 27.5 L27.5 112.5"/>
          <polygon points="70,25 82,58 115,70 82,82 70,115 58,82 25,70 58,58"/>
        </g>
      </svg>
    `)
  },

  // --- 2. كلاسيكي وورق معتق ---
  {
    id: 'vintage-parchment',
    name: 'ورق بردي معتق (Parchment)',
    category: 'كلاسيكي وورق',
    previewGradient: 'from-amber-100 via-stone-100 to-amber-50',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="matrix" values="0.8 0 0 0 0.1  0 0.7 0 0 0.1  0 0 0.5 0 0.1  0 0 0 0.05 0"/>
        </filter>
        <rect width="200" height="200" fill="#fef3c7" opacity="0.3"/>
        <rect width="200" height="200" filter="url(#noise)"/>
      </svg>
    `)
  },
  {
    id: 'royal-cert-paper',
    name: 'ورق شهادات محبب (Granulated)',
    category: 'كلاسيكي وورق',
    previewGradient: 'from-slate-100 via-amber-50 to-stone-100',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
        <filter id="fineGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise"/>
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 0.95 0 0 0  0 0 0.8 0 0  0 0 0 0.04 0"/>
        </filter>
        <rect width="180" height="180" fill="#fffbebe6"/>
        <rect width="180" height="180" filter="url(#fineGrain)"/>
      </svg>
    `)
  },
  {
    id: 'linen-texture-gold',
    name: 'قماش كتان مذهب',
    category: 'كلاسيكي وورق',
    previewGradient: 'from-amber-100 via-stone-200 to-amber-100',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <path d="M0 10 L40 10 M0 20 L40 20 M0 30 L40 30 M10 0 L10 40 M20 0 L20 40 M30 0 L30 40" stroke="#d97706" stroke-width="0.5" opacity="0.1"/>
        <path d="M5 5 L35 35 M35 5 L5 35" stroke="#b45309" stroke-width="0.3" opacity="0.05"/>
      </svg>
    `)
  },

  // --- 3. ملكي وفاخر ---
  {
    id: 'royal-damask',
    name: 'نقوش دمشقية ملكية',
    category: 'ملكي وفاخر',
    previewGradient: 'from-indigo-900 via-indigo-950 to-slate-900',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <g stroke="#e2e8f0" stroke-width="0.8" fill="none" opacity="0.12">
          <path d="M60 10 C 40 30, 40 50, 60 70 C 80 50, 80 30, 60 10 Z"/>
          <path d="M60 20 C 50 35, 50 45, 60 60 C 70 45, 70 35, 60 20 Z"/>
          <path d="M10 60 C 30 40, 50 40, 70 60 C 50 80, 30 80, 10 60 Z"/>
          <circle cx="60" cy="60" r="6" fill="#f59e0b" opacity="0.2"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'dark-obsidian-gold',
    name: 'أوبسيديان بغبار الذهب',
    category: 'ملكي وفاخر',
    previewGradient: 'from-slate-950 via-slate-900 to-amber-950',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
        <circle cx="20" cy="30" r="1.5" fill="#fbbf24" opacity="0.3"/>
        <circle cx="120" cy="40" r="2" fill="#f59e0b" opacity="0.25"/>
        <circle cx="70" cy="110" r="1.2" fill="#d97706" opacity="0.3"/>
        <circle cx="130" cy="120" r="1.8" fill="#fef08a" opacity="0.2"/>
        <path d="M0 0 L150 150 M150 0 L0 150" stroke="#f59e0b" stroke-width="0.4" opacity="0.06"/>
      </svg>
    `)
  },
  {
    id: 'royal-navy-filigree',
    name: 'فيليجري كحلي وملكي',
    category: 'ملكي وفاخر',
    previewGradient: 'from-slate-900 via-blue-950 to-indigo-950',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <g stroke="#fbbf24" stroke-width="0.65" fill="none" opacity="0.15">
          <path d="M0 50 Q 25 25, 50 50 T 100 50"/>
          <path d="M50 0 Q 25 25, 50 50 T 50 100"/>
          <circle cx="50" cy="50" r="12" stroke="#f59e0b"/>
          <circle cx="50" cy="50" r="24" stroke="#d97706" stroke-dasharray="3,3"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'golden-crest-corners',
    name: 'زوايا وأركان مذهبة',
    category: 'ملكي وفاخر',
    previewGradient: 'from-amber-200 via-amber-50 to-white',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <g stroke="#b45309" stroke-width="0.8" fill="none" opacity="0.14">
          <path d="M 0 30 Q 30 30, 30 0 M 0 40 C 40 40, 40 40, 40 0 M 0 50 Q 50 50, 50 0"/>
          <path d="M 200 30 Q 170 30, 170 0 M 200 40 C 160 40, 160 40, 160 0 M 200 50 Q 150 50, 150 0"/>
          <path d="M 0 170 Q 30 170, 30 200 M 0 160 C 40 160, 40 160, 40 200"/>
          <path d="M 200 170 Q 170 170, 170 200 M 200 160 C 160 160, 160 160, 160 200"/>
        </g>
      </svg>
    `)
  },

  // --- 4. رخام وذهب ---
  {
    id: 'golden-marble-weave',
    name: 'رخام أبيض بعروق ذهبية',
    category: 'رخام وذهب',
    previewGradient: 'from-slate-100 via-amber-50 to-white',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <path d="M0 50 Q 80 120, 150 60 T 300 150" fill="none" stroke="#d97706" stroke-width="1.2" opacity="0.12"/>
        <path d="M50 0 Q 180 90, 220 200 T 100 300" fill="none" stroke="#f59e0b" stroke-width="1" opacity="0.1"/>
        <path d="M100 300 Q 200 150, 300 250" fill="none" stroke="#b45309" stroke-width="0.8" opacity="0.08"/>
      </svg>
    `)
  },
  {
    id: 'black-gold-marble',
    name: 'رخام أسود ملكي بذهب',
    category: 'رخام وذهب',
    previewGradient: 'from-slate-950 via-stone-900 to-amber-950',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <path d="M10 0 Q 120 100, 80 180 T 290 300" fill="none" stroke="#fbbf24" stroke-width="1.5" opacity="0.18"/>
        <path d="M0 150 Q 150 80, 220 250" fill="none" stroke="#f59e0b" stroke-width="1" opacity="0.15"/>
        <path d="M120 0 Q 200 160, 300 80" fill="none" stroke="#d97706" stroke-width="0.8" opacity="0.12"/>
      </svg>
    `)
  },
  {
    id: 'turquoise-gold-marble',
    name: 'رخام فيروزي مذهب',
    category: 'رخام وذهب',
    previewGradient: 'from-teal-900 via-cyan-950 to-teal-950',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">
        <path d="M0 40 C 90 110, 120 20, 250 140" fill="none" stroke="#fef08a" stroke-width="1.2" opacity="0.16"/>
        <path d="M40 250 C 110 140, 180 200, 250 30" fill="none" stroke="#f59e0b" stroke-width="0.9" opacity="0.14"/>
      </svg>
    `)
  },

  // --- 5. حديث وأمني ---
  {
    id: 'guilloche-security-lines',
    name: 'خطوط غيوش أمنية للشهادات',
    category: 'حديث وأمني',
    previewGradient: 'from-amber-100 via-slate-100 to-amber-50',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <g stroke="#d97706" stroke-width="0.5" fill="none" opacity="0.14">
          <path d="M0 20 C 30 40, 90 0, 120 20 M0 30 C 30 50, 90 10, 120 30 M0 40 C 30 60, 90 20, 120 40 M0 50 C 30 70, 90 30, 120 50"/>
          <path d="M0 70 C 30 90, 90 50, 120 70 M0 80 C 30 100, 90 60, 120 80 M0 90 C 30 110, 90 70, 120 90"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'golden-hexagon-mesh',
    name: 'سداسيات ذهبية ناعمة',
    category: 'حديث وأمني',
    previewGradient: 'from-amber-50 via-yellow-100 to-amber-100',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="104" viewBox="0 0 60 104">
        <g stroke="#b45309" stroke-width="0.6" fill="none" opacity="0.12">
          <polygon points="30,0 60,17.32 60,51.96 30,69.28 0,51.96 0,17.32"/>
          <polygon points="30,52 60,69.32 60,103.96 30,121.28 0,103.96 0,69.32"/>
          <circle cx="30" cy="34.64" r="3" fill="#f59e0b" opacity="0.15"/>
        </g>
      </svg>
    `)
  },
  {
    id: 'subtle-geometric-grid',
    name: 'شبكة هندسية دقيقة حديثة',
    category: 'حديث وأمني',
    previewGradient: 'from-slate-200 via-slate-100 to-white',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#94a3b8" stroke-width="0.5" opacity="0.12"/>
        <circle cx="30" cy="30" r="15" fill="none" stroke="#64748b" stroke-width="0.5" opacity="0.08"/>
      </svg>
    `)
  },
  {
    id: 'silver-silk-wave',
    name: 'أمواج الحرير الفضي الناعم',
    category: 'حديث وأمني',
    previewGradient: 'from-slate-100 via-slate-50 to-white',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <path d="M0 100 C 50 150, 150 50, 200 100 S 300 150, 400 100" fill="none" stroke="#cbd5e1" stroke-width="1" opacity="0.2"/>
        <path d="M0 120 C 50 170, 150 70, 200 120 S 300 170, 400 120" fill="none" stroke="#94a3b8" stroke-width="0.75" opacity="0.15"/>
      </svg>
    `)
  },
  {
    id: 'delicate-sunburst-lines',
    name: 'أشعة إنجاز ذهبية شعاعية',
    category: 'حديث وأمني',
    previewGradient: 'from-amber-100 via-yellow-50 to-white',
    url: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <g stroke="#d97706" stroke-width="0.5" opacity="0.12">
          <line x1="100" y1="0" x2="100" y2="200"/>
          <line x1="0" y1="100" x2="200" y2="100"/>
          <line x1="29.29" y1="29.29" x2="170.71" y2="170.71"/>
          <line x1="170.71" y1="29.29" x2="29.29" y2="170.71"/>
          <circle cx="100" cy="100" r="40" fill="none" stroke="#f59e0b" stroke-width="0.75"/>
          <circle cx="100" cy="100" r="80" fill="none" stroke="#b45309" stroke-width="0.5" stroke-dasharray="4,4"/>
        </g>
      </svg>
    `)
  }
];
