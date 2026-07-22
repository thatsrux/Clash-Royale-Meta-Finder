const fs = require('fs');
let code = fs.readFileSync('src/components/DeckBuilder.tsx', 'utf8');
const lines = code.split('\n');

const startIdx = lines.findIndex(l => l.includes('const warScoredDecks = useMemo(() => {'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('  }, [warScoredDecks]);'));

const extractedLines = lines.slice(startIdx, endIdx + 1);

const hookCode = `import { useMemo, useCallback } from 'react';
import type { PlayerProfile, Card, MagicItems } from '../types/clashRoyale';
import { isEvoUnlocked, isHeroVariantUnlocked, getCardsToNextLevel, getVirtualLevelAndGold } from '../types/clashRoyale';
import type { MetaDeck } from '../App';

export const useWarDecks = (
  profile: PlayerProfile,
  magicItems: MagicItems,
  rawDeckCounts: any,
  getRarityClass: ((card: Card) => string) | undefined,
  getDisplayLevel: (card: Card) => number,
  warUseGold: boolean,
  warUseGems: boolean,
  warUseWildcards: boolean,
  warUseEvoShards: boolean,
  warUseHeroCoins: boolean
) => {
${extractedLines.join('\n')}

  return bestWarDecks;
};
`;

fs.writeFileSync('src/hooks/useWarDecks.ts', hookCode);

// Modify DeckBuilder.tsx
lines.splice(startIdx, endIdx - startIdx + 1, `  const bestWarDecks = useWarDecks(
    profile,
    magicItems,
    rawDeckCounts,
    getRarityClass,
    getDisplayLevel,
    warUseGold,
    warUseGems,
    warUseWildcards,
    warUseEvoShards,
    warUseHeroCoins
  );`);

// Add import
const importIdx = lines.findIndex(l => l.includes("import { QRCodeSVG } from 'qrcode.react';"));
lines.splice(importIdx + 1, 0, "import { useWarDecks } from '../hooks/useWarDecks';");

fs.writeFileSync('src/components/DeckBuilder.tsx', lines.join('\n'));
console.log('Extracted useWarDecks');
