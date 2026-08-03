const fs = require('fs');

// 1. Fix App.tsx MetaDeck interface
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
const metaDeckProps = `  totalCostScore?: number;
  towerTroopId?: number;
  winRate?: number;
  totalMatches?: number;
  wildcardsUsed?: Record<string, number>;
  wildcardsUsedByCard?: { id: number; count: number; rarity: string }[];
  scoreBreakdown?: {
    baseLevelScore: number;
    levelScoreBoost: number;
    missingCardPenalty: number;
    missingVariantPenalty: number;
    missingMaxLevelPenalty: number;
    missingBaseCards: string[];
    missingVariants: string[];
    nonMaxLevelCards: string[];
  };`;
appCode = appCode.replace(/  totalCostScore\?: number;\n  towerTroopId\?: number;\n  winRate\?: number;/, metaDeckProps);
fs.writeFileSync('src/App.tsx', appCode);

// 2. Fix DeckCard.tsx
let deckCardCode = fs.readFileSync('src/components/ui/DeckCard.tsx', 'utf8');
deckCardCode = deckCardCode.replace(
  "import { Copy, QrCode, TrendingUp, UserCircle2, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Droplets, Trophy } from 'lucide-react';",
  "import { Copy, QrCode, TrendingUp, UserCircle2, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Droplets, Trophy, Gem, Activity } from 'lucide-react';"
);
deckCardCode = deckCardCode.replace(
  "import { isEvoUnlocked, isHeroVariantUnlocked, isAnyHeroUnlocked, getCardIcon } from '../../types/clashRoyale';",
  "import { isEvoUnlocked, isHeroVariantUnlocked, isAnyHeroUnlocked, getCardIcon, isChampion } from '../../types/clashRoyale';"
);
// Fix implicit any for c
deckCardCode = deckCardCode.replace(/\(c =>/g, '(c: any =>').replace(/\(c: any =>/g, '((c: any) =>');
// Actually, it's safer to just regex replace 'c =>' with '(c: any) =>'
deckCardCode = deckCardCode.replace(/ c =>/g, ' (c: any) =>');
// There's a specific place: missingBaseCards.map(c => ... )
deckCardCode = deckCardCode.replace(/missingBaseCards\.map\(\(c, i\)/g, 'missingBaseCards.map((c: any, i: number)');
deckCardCode = deckCardCode.replace(/missingVariants\.map\(\(c, i\)/g, 'missingVariants.map((c: any, i: number)');
deckCardCode = deckCardCode.replace(/nonMaxLevelCards\.map\(\(c, i\)/g, 'nonMaxLevelCards.map((c: any, i: number)');

fs.writeFileSync('src/components/ui/DeckCard.tsx', deckCardCode);

// 3. Fix useWarDecks.ts
let useWarDecksCode = fs.readFileSync('src/hooks/useWarDecks.ts', 'utf8');
useWarDecksCode = useWarDecksCode.replace(
  "import { isEvoUnlocked, isHeroVariantUnlocked, getCardsToNextLevel, getVirtualLevelAndGold } from '../types/clashRoyale';",
  "import { isEvoUnlocked, isHeroVariantUnlocked, getCardsToNextLevel, getVirtualLevelAndGold, getCardIcon, getDeckAverageElixir } from '../types/clashRoyale';"
);
fs.writeFileSync('src/hooks/useWarDecks.ts', useWarDecksCode);

console.log('Fixed build issues');
