export interface GradientPreset {
  id: string;
  name: string;
  css: string;
  preview: string;
}

export interface ScenePreset {
  id: string;
  name: string;
  description: string;
  css: string;
  preview: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'dawn-horizon',
    name: 'Dawn Horizon',
    css: 'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(251, 84, 43, 0.24), transparent 65%), radial-gradient(ellipse 60% 50% at 85% 90%, rgba(59, 130, 246, 0.16), transparent 65%), linear-gradient(180deg, #0c0e14 0%, #11141d 100%)',
    preview: 'linear-gradient(135deg, #2a1815 0%, #11141d 55%, #162238 100%)',
  },
  {
    id: 'nordic-slate',
    name: 'Nordic Slate',
    css: 'radial-gradient(ellipse 75% 55% at 20% 10%, rgba(99, 102, 241, 0.2), transparent 60%), radial-gradient(ellipse 65% 50% at 85% 85%, rgba(20, 184, 166, 0.14), transparent 60%), linear-gradient(160deg, #0b0e14 0%, #131924 100%)',
    preview: 'linear-gradient(135deg, #1b223a 0%, #131924 55%, #10282a 100%)',
  },
  {
    id: 'forest-mist',
    name: 'Forest Mist',
    css: 'radial-gradient(ellipse 70% 55% at 30% 15%, rgba(16, 185, 129, 0.18), transparent 60%), radial-gradient(ellipse 60% 55% at 80% 85%, rgba(6, 95, 70, 0.24), transparent 65%), linear-gradient(180deg, #091110 0%, #0e1917 100%)',
    preview: 'linear-gradient(135deg, #0e2a23 0%, #0b1614 60%, #14362c 100%)',
  },
  {
    id: 'velvet-dusk',
    name: 'Velvet Dusk',
    css: 'radial-gradient(ellipse 70% 50% at 75% 15%, rgba(244, 63, 94, 0.2), transparent 60%), radial-gradient(ellipse 65% 55% at 20% 85%, rgba(139, 92, 246, 0.2), transparent 60%), linear-gradient(180deg, #110d16 0%, #17121f 100%)',
    preview: 'linear-gradient(135deg, #2d1424 0%, #17121f 55%, #231938 100%)',
  },
  {
    id: 'amber-atelier',
    name: 'Amber Atelier',
    css: 'radial-gradient(ellipse 75% 50% at 50% 0%, rgba(245, 158, 11, 0.18), transparent 60%), linear-gradient(180deg, #13110f 0%, #1c1916 100%)',
    preview: 'linear-gradient(135deg, #2e2416 0%, #181512 100%)',
  },
  {
    id: 'morning-linen',
    name: 'Morning Linen (Light)',
    css: 'radial-gradient(ellipse 75% 55% at 20% 0%, rgba(251, 146, 60, 0.16), transparent 60%), radial-gradient(ellipse 65% 55% at 85% 95%, rgba(56, 189, 248, 0.14), transparent 60%), linear-gradient(180deg, #f7f6f2 0%, #eef1f5 100%)',
    preview: 'linear-gradient(135deg, #fae8d8 0%, #f4f5f7 55%, #dbeafe 100%)',
  },
];

// Self-contained procedural vector SVG scenes (zero external network requests)
function encodeSvgDataUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}")`;
}

const alpineDuskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="48%" stop-color="#1e293b"/>
      <stop offset="78%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#7c2d12"/>
    </linearGradient>
    <radialGradient id="glow" cx="52%" cy="68%" r="42%">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0.55"/>
      <stop offset="50%" stop-color="#ea580c" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#sky)"/>
  <rect width="1920" height="1080" fill="url(#glow)"/>
  <path d="M0 720 L260 540 L520 670 L810 460 L1140 650 L1460 490 L1740 620 L1920 550 L1920 1080 L0 1080 Z" fill="#1e293b" opacity="0.72"/>
  <path d="M0 800 L310 620 L620 760 L960 560 L1320 750 L1650 610 L1920 710 L1920 1080 L0 1080 Z" fill="#111827" opacity="0.86"/>
  <path d="M0 890 L420 760 L860 880 L1290 770 L1690 870 L1920 820 L1920 1080 L0 1080 Z" fill="#090d16"/>
</svg>`;

const coastalFogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="csky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1926"/>
      <stop offset="55%" stop-color="#132f3d"/>
      <stop offset="100%" stop-color="#1d4d57"/>
    </linearGradient>
    <radialGradient id="moon" cx="72%" cy="28%" r="28%">
      <stop offset="0%" stop-color="#e2f1f8" stop-opacity="0.32"/>
      <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#0c1926" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#csky)"/>
  <rect width="1920" height="1080" fill="url(#moon)"/>
  <path d="M0 680 Q480 610 960 675 T1920 650 L1920 1080 L0 1080 Z" fill="#0f2531" opacity="0.7"/>
  <path d="M0 780 Q520 720 1040 780 T1920 760 L1920 1080 L0 1080 Z" fill="#0b1b24" opacity="0.85"/>
  <path d="M0 880 Q600 845 1200 890 T1920 870 L1920 1080 L0 1080 Z" fill="#071219"/>
</svg>`;

const desertDunesSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="dsky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#18121c"/>
      <stop offset="50%" stop-color="#3b1f2b"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#dsky)"/>
  <circle cx="1320" cy="430" r="110" fill="#fed7aa" opacity="0.18"/>
  <path d="M0 680 C400 570 760 760 1200 640 C1520 550 1740 620 1920 660 L1920 1080 L0 1080 Z" fill="#431407" opacity="0.72"/>
  <path d="M0 790 C460 710 880 860 1360 740 C1640 670 1800 730 1920 770 L1920 1080 L0 1080 Z" fill="#290f09" opacity="0.88"/>
  <path d="M0 910 C540 840 1080 960 1920 870 L1920 1080 L0 1080 Z" fill="#170906"/>
</svg>`;

const geometricPaperSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="psky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8f7f4"/>
      <stop offset="100%" stop-color="#eae7df"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#psky)"/>
  <circle cx="1520" cy="240" r="360" fill="#fb923c" opacity="0.12"/>
  <circle cx="340" cy="860" r="420" fill="#60a5fa" opacity="0.1"/>
  <path d="M0 840 Q480 760 960 830 T1920 800 L1920 1080 L0 1080 Z" fill="#e2dfd6" opacity="0.65"/>
</svg>`;

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'alpine-dusk',
    name: 'Alpine Dusk',
    description: 'Layered mountain silhouettes at sunset',
    css: encodeSvgDataUrl(alpineDuskSvg),
    preview: 'linear-gradient(180deg, #1e293b 0%, #7c2d12 70%, #090d16 100%)',
  },
  {
    id: 'coastal-fog',
    name: 'Coastal Fog',
    description: 'Deep teal ocean horizon under moonlight',
    css: encodeSvgDataUrl(coastalFogSvg),
    preview: 'linear-gradient(180deg, #0c1926 0%, #1d4d57 65%, #071219 100%)',
  },
  {
    id: 'desert-dunes',
    name: 'Desert Dunes',
    description: 'Warm terracotta dunes in twilight',
    css: encodeSvgDataUrl(desertDunesSvg),
    preview: 'linear-gradient(180deg, #3b1f2b 0%, #9a3412 65%, #170906 100%)',
  },
  {
    id: 'geometric-paper',
    name: 'Studio Paper (Light)',
    description: 'Soft warm architectural light backdrop',
    css: encodeSvgDataUrl(geometricPaperSvg),
    preview: 'linear-gradient(135deg, #f8f7f4 0%, #fde6d2 55%, #e2dfd6 100%)',
  },
];
