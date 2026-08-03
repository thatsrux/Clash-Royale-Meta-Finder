const fs = require('fs');

let db = fs.readFileSync('src/components/DeckBuilder.tsx', 'utf8');

// Add ArrowUp, ArrowDown back
db = db.replace(
  "import { TrendingUp, RefreshCw, Trophy, Filter, X, Sparkles, Crown, Activity, Copy, LayoutDashboard, Gem, Swords } from 'lucide-react';",
  "import { TrendingUp, RefreshCw, Trophy, Filter, X, Sparkles, Crown, Activity, Copy, LayoutDashboard, Gem, Swords, ArrowUp, ArrowDown } from 'lucide-react';"
);
// It might be different, let's just use string replacement on lucide-react import
db = db.replace(/import \{.*?\} from 'lucide-react';/, "import { TrendingUp, RefreshCw, Trophy, Filter, X, Sparkles, Crown, Activity, Copy, LayoutDashboard, Gem, Swords, ArrowUp, ArrowDown } from 'lucide-react';");

// Remove unused from react
db = db.replace("import React, { useState, useMemo, useEffect, useCallback } from 'react';", "import React, { useState, useMemo, useEffect } from 'react';");

// Remove unused from clashRoyale
db = db.replace("import { isEvoUnlocked, isHeroVariantUnlocked, isChampion, hasEvoAvailable, hasHeroAvailable, getCardIcon, getSubstitutions, getVirtualLevelAndGold, getCardsToNextLevel, getDeckAverageElixir } from '../types/clashRoyale';", 
"import { hasEvoAvailable, hasHeroAvailable, getCardIcon, getSubstitutions } from '../types/clashRoyale';");

// Remove allGameCards={allGameCards}
db = db.replace("              allGameCards={allGameCards}\n", "");
db = db.replace("allGameCards={allGameCards}", "");

fs.writeFileSync('src/components/DeckBuilder.tsx', db);

console.log("Fixed DeckBuilder imports");
