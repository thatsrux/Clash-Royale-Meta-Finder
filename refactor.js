const fs = require('fs');
const code = fs.readFileSync('src/components/DeckBuilder.tsx', 'utf8');

const mapStartString = '          {filteredRecommendations.slice(0, visibleCount).map((deck, idx) => {';
const mapStartIdx = code.indexOf(mapStartString);

const mapEndString = '          })}

          {filteredRecommendations.length > visibleCount';
const mapEndIdx = code.indexOf(mapEndString);

if (mapStartIdx === -1 || mapEndIdx === -1) { console.log('Indices not found', mapStartIdx, mapEndIdx); process.exit(1); }

const extractedBody = code.substring(mapStartIdx + mapStartString.length, mapEndIdx);

const newRenderFunction = \`n  const renderDeckCard = (deck: any, idx: number) => {  };\`n
const returnIdx = code.indexOf('  return (
    <div className="deck-builder">');
let newCode = code.slice(0, returnIdx) + newRenderFunction + code.slice(returnIdx);

newCode = newCode.replace(
  mapStartString + extractedBody,
  '          {filteredRecommendations.slice(0, visibleCount).map((deck, idx) => renderDeckCard(deck, idx))'
);

fs.writeFileSync('src/components/DeckBuilder.tsx', newCode);
console.log('Refactor successful');
