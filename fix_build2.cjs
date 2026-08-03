const fs = require('fs');

// 1. Fix App.tsx MetaDeck interface
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const oldMetaDeck = `export interface MetaDeck {
  name: string;
  cards: Card[];
  score: number;
  avgLevel: number;
  elixirCost: number;
  count: number;
  maxedCount: number;
  isBestSynergy: boolean;
  maxMedals: number;
  bestPlayerName?: string;
  missingEvos: { name: string; icon: string }[];
  missingHeroes: { name: string; icon: string }[];
  virtualUpgrades: { id: number; gold: number; level: number }[];
  evoShardsUsed: { id: number; count: number }[];
  heroCoinsUsed: { id: number; count: number }[];
  gemsUsed: number;
  gemsUsedByCard: { id: number; count: number }[];
  totalCostScore?: number;
  towerTroopId?: number;
  winRate?: number;
  totalMatches?: number;
}`;

const newMetaDeck = `export interface MetaDeck {
  name: string;
  cards: Card[];
  score: number;
  avgLevel: number;
  elixirCost: number;
  count: number;
  maxedCount: number;
  isBestSynergy: boolean;
  maxMedals: number;
  bestPlayerName?: string;
  missingEvos: { name: string; icon: string }[];
  missingHeroes: { name: string; icon: string }[];
  virtualUpgrades?: { id: number; gold: number; level: number }[];
  evoShardsUsed?: { id: number; count: number }[];
  heroCoinsUsed?: { id: number; count: number }[];
  gemsUsed?: number;
  gemsUsedByCard?: { id: number; count: number }[];
  totalCostScore?: number;
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
  };
}`;

appCode = appCode.replace(oldMetaDeck, newMetaDeck);
fs.writeFileSync('src/App.tsx', appCode);

// 2. Fix DeckCard.tsx
let deckCardCode = fs.readFileSync('src/components/ui/DeckCard.tsx', 'utf8');

// Fix imports in DeckCard.tsx
deckCardCode = deckCardCode.replace(
  "import { Copy, QrCode, TrendingUp, UserCircle2, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Droplets, Trophy, Gem, Activity } from 'lucide-react';",
  "import { Copy, QrCode, TrendingUp, UserCircle2, CheckCircle2, AlertCircle, Droplets, Trophy, Gem, Activity, Medal, Check, Target } from 'lucide-react';"
);
deckCardCode = deckCardCode.replace(
  "import { isEvoUnlocked, isHeroVariantUnlocked, isAnyHeroUnlocked, getCardIcon, isChampion } from '../../types/clashRoyale';",
  "import { isEvoUnlocked, isHeroVariantUnlocked, getCardIcon, isChampion } from '../../types/clashRoyale';"
);

// Fix unused `allGameCards`
deckCardCode = deckCardCode.replace("allGameCards?: any[];", "");
deckCardCode = deckCardCode.replace("allGameCards\n})", "})");

fs.writeFileSync('src/components/ui/DeckCard.tsx', deckCardCode);
console.log("Fixed files");
