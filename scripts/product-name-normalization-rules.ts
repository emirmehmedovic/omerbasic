export interface NameRule {
  id: string;
  description: string;
  pattern: RegExp;
  replacement: string;
}

export const nameRules: NameRule[] = [
  {
    id: 'set-zup-kit',
    description: 'SET ZUP / SET ZUP R. → SET ZUPČASTOG REMENA / ZUPČASTI REMEN',
    pattern: /\bSET\s+ZUP(?:\.|\s+R\.?)?(?=\s|$)/gi,
    replacement: 'SET ZUPČASTOG REMENA / ZUPČASTI REMEN',
  },
  {
    id: 'zup-rem',
    description: 'ZUP REM → ZUPČASTI REMEN',
    pattern: /\bZUP\s+REM\b/gi,
    replacement: 'ZUPČASTI REMEN',
  },
  {
    id: 'filter-zraka',
    description: 'FILT./FIL ZRAKA → FILTER ZRAKA',
    pattern: /\bFIL(T)?\.?\s*ZRAKA\b/gi,
    replacement: 'FILTER ZRAKA',
  },
  {
    id: 'filter-ulja',
    description: 'FILT./FIL ULJA → FILTER ULJA',
    pattern: /\bFIL(T)?\.?\s*ULJA\b/gi,
    replacement: 'FILTER ULJA',
  },
  {
    id: 'filter-kabine',
    description: 'FILT./FIL KABINE → FILTER KABINE',
    pattern: /\bFIL(T)?\.?\s*KABINE\b/gi,
    replacement: 'FILTER KABINE',
  },
  {
    id: 'filter-nafte',
    description: 'FILT./FIL NAFTE → FILTER NAFTE',
    pattern: /\bFIL(T)?\.?\s*NAFTE\b/gi,
    replacement: 'FILTER NAFTE',
  },
  {
    id: 'set-kv',
    description: 'SET KV → SET KVAČILA',
    pattern: /\bSET\s+KV\.?\b/gi,
    replacement: 'SET KVAČILA',
  },
  {
    id: 'sajla-rucne-kocnice',
    description: 'SAJLA RU. KOČNICE → SAJLA RUČNE KOČNICE',
    pattern: /\bSAJLA\s+RU\.?\s+KOČNICE\b/gi,
    replacement: 'SAJLA RUČNE KOČNICE',
  },
  {
    id: 'osc-rame',
    description: 'OSC. RAME → OSCILIRAJUĆE RAME',
    pattern: /\bOSC\.?\s*RAME\b/gi,
    replacement: 'OSCILIRAJUĆE RAME',
  },
  {
    id: 'gumica-stab',
    description: 'GUMICA STAB. → GUMICA STABILIZATORA',
    pattern: /\bGUMICA\s+STAB\.?([\s]*)/gi,
    replacement: 'GUMICA STABILIZATORA ',
  },
  {
    id: 'brt-brtva',
    description: 'BRT. → BRTVA (samo kad se koristi kao skraćenica, npr. "BRT. GLAVE")',
    pattern: /\bBRT\.(?=\s|$)/gi,
    replacement: 'BRTVA',
  },
  {
    id: 'sajla-rucne-fix',
    description: 'SAJLA RU. → SAJLA RUČNE (ne diraj već ispravno SAJLA RUČNE)',
    pattern: /\bSAJLA\s+RU\.?(?=\s|$)/gi,
    replacement: 'SAJLA RUČNE',
  },
  {
    id: 'guma-stabil-fix',
    description: 'GUMA STABIL. → GUMA STABILIZATORA (uz obavezni razmak nakon)',
    pattern: /\bGUMA\s+STABIL\.?([\s]*)/gi,
    replacement: 'GUMA STABILIZATORA ',
  },
];
