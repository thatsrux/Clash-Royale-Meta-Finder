const fs = require('fs');

// Fix App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace('hasHeroAvailable, hasEvoAvailable, isChampion, getDeckAverageElixir, getCardsToNextLevel, getVirtualLevelAndGold', 'getCardsToNextLevel');
appCode = appCode.replace('interface MetaDeck {', 'export interface MetaDeck {');
appCode = appCode.replace('setRawDeckCounts,\n', '');
fs.writeFileSync('src/App.tsx', appCode);

// Fix useMetaInsights.ts
let hookCode = fs.readFileSync('src/hooks/useMetaInsights.ts', 'utf8');
// Fix types for metaCard
hookCode = hookCode.replace('deck.cards.forEach((metaCard, idx) => {', 'deck.cards.forEach((metaCard: any, idx: number) => {');
hookCode = hookCode.replace('deck.cards.forEach(metaCard => {', 'deck.cards.forEach((metaCard: any) => {');
fs.writeFileSync('src/hooks/useMetaInsights.ts', hookCode);

console.log('Fixed TS errors');
