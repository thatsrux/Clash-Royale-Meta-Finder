const fs = require('fs');

const metaDeckStr = `export interface MetaDeck {
  name: string;
  cards: any[];
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

// 1. App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/export interface MetaDeck \{[\s\S]*?\n\}/, metaDeckStr.replace('any[]', 'Card[]'));
fs.writeFileSync('src/App.tsx', app);

// 2. DeckBuilder.tsx
let db = fs.readFileSync('src/components/DeckBuilder.tsx', 'utf8');
db = db.replace(/interface MetaDeck \{[\s\S]*?\n\}\n\n/, ''); // Remove local MetaDeck
if (!db.includes("import type { MetaDeck } from '../App';")) {
  const importIdx = db.indexOf("import type { PlayerProfile");
  db = db.slice(0, importIdx) + "import type { MetaDeck } from '../App';\n" + db.slice(importIdx);
}
db = db.replace(", Droplets", "");
db = db.replace(", ArrowUp, ArrowDown", "");
fs.writeFileSync('src/components/DeckBuilder.tsx', db);

// 3. DeckCard.tsx
let dc = fs.readFileSync('src/components/ui/DeckCard.tsx', 'utf8');
dc = dc.replace(", ArrowUp, ArrowDown", "");
dc = dc.replace(", isAnyHeroUnlocked", "");
dc = dc.replace("allGameCards?: any[];", "");
dc = dc.replace("allGameCards\n})", "})");
fs.writeFileSync('src/components/ui/DeckCard.tsx', dc);

console.log("Fixed all files.");
