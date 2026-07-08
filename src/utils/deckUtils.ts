import { MetaDeck } from '../hooks/useDeckFilters';

export const generateDeckLink = (deck: MetaDeck) => {
  const towerStr = deck.towerTroopId ? `&tt=${deck.towerTroopId}` : '';
  return `https://link.clashroyale.com/en/?clashroyale://copyDeck?deck=${deck.cards.map(c => c.id).join(';')}&l=MetaArchetype${towerStr}`;
};
