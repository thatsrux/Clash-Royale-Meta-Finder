const fs = require('fs');
let code = fs.readFileSync('src/components/DeckBuilder.tsx', 'utf8');

const mapStartStr = '(showWarDecks ? bestWarDecks : filteredRecommendations.slice(0, visibleCount)).map((deck, idx) => {';
const mapStartIdx = code.indexOf(mapStartStr);
const endPattern = '        )}'; // End of the map body
let currentIdx = mapStartIdx + mapStartStr.length;

// A simple parenthesis matching logic
let openBrackets = 1;
while(openBrackets > 0 && currentIdx < code.length) {
    if(code[currentIdx] === '{') openBrackets++;
    if(code[currentIdx] === '}') openBrackets--;
    currentIdx++;
}

// currentIdx is exactly after the closing bracket of the map function
const mapBodyStr = code.slice(mapStartIdx + mapStartStr.length, currentIdx - 1); // remove the last '}'

// Create DeckCard component
const deckCardCode = `import React from 'react';
import { CardImage } from '../CardImage';
import { Copy, QrCode, TrendingUp, UserCircle2, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Droplets, Trophy } from 'lucide-react';
import { isEvoUnlocked, isHeroVariantUnlocked, isAnyHeroUnlocked, getCardIcon } from '../../types/clashRoyale';
import type { MetaDeck } from '../../App';
import type { PlayerProfile } from '../../types/clashRoyale';

interface DeckCardProps {
  deck: MetaDeck;
  idx: number;
  profile: PlayerProfile;
  expandedScoreIdx: number | null;
  setExpandedScoreIdx: (idx: number | null) => void;
  handleCopyDeck: (deck: MetaDeck, idx: number) => void;
  handleShowQr: (deck: MetaDeck) => void;
  getDisplayLevel: (card: any) => number;
  getCardSubstitutesData: (cardName: string) => { name: string, icon: string } | null;
  copiedIndex: number | null;
  allGameCards?: any[];
}

export const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  idx,
  profile,
  expandedScoreIdx,
  setExpandedScoreIdx,
  handleCopyDeck,
  handleShowQr,
  getDisplayLevel,
  getCardSubstitutesData,
  copiedIndex,
  allGameCards
}) => {
${mapBodyStr}
};
`;

fs.writeFileSync('src/components/ui/DeckCard.tsx', deckCardCode);

// Replace in DeckBuilder
const replaceStr = `${mapStartStr}${mapBodyStr}}`;
const replacement = `(showWarDecks ? bestWarDecks : filteredRecommendations.slice(0, visibleCount)).map((deck, idx) => (
            <DeckCard 
              key={deck.name || idx}
              deck={deck} 
              idx={idx} 
              profile={profile} 
              expandedScoreIdx={expandedScoreIdx} 
              setExpandedScoreIdx={setExpandedScoreIdx}
              handleCopyDeck={handleCopyDeck}
              handleShowQr={handleShowQr}
              getDisplayLevel={getDisplayLevel}
              getCardSubstitutesData={getCardSubstitutesData}
              copiedIndex={copiedIndex}
              allGameCards={allGameCards}
            />
          )`;

code = code.replace(replaceStr, replacement);
// Add import
const importIdx = code.indexOf("import { useWarDecks }");
code = code.slice(0, importIdx) + "import { DeckCard } from './ui/DeckCard';\n" + code.slice(importIdx);

fs.writeFileSync('src/components/DeckBuilder.tsx', code);
console.log('Extracted DeckCard');
