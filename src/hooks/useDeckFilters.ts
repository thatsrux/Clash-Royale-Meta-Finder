import { useState, useMemo } from 'react';
import { PlayerProfile, Card } from '../types/clashRoyale';

export interface MetaDeck {
  name: string;
  cards: Card[];
  towerTroopId?: number;
  count: number;
  maxedCount: number;
  isBestSynergy: boolean;
  maxMedals: number;
  bestPlayerName: string;
  score: number;
  avgLevel: number;
  elixirCost: number;
  missingEvos: { name: string; icon: string }[];
  missingHeroes: { name: string; icon: string }[];
}

export const useDeckFilters = (cachedDecks: MetaDeck[] | null, profile: PlayerProfile | null) => {
  const [minCountFilter, setMinCountFilter] = useState(1);
  const [missingFilter, setMissingFilter] = useState<number | 'all'>('all');
  const [playstyleFilter, setPlaystyleFilter] = useState<string>('all');
  const [showBestSynergyOnly, setShowBestSynergyOnly] = useState(false);
  const [cardFilter, setCardFilter] = useState<string>('');
  
  const detectArchetype = (cards: Card[]) => {
    const names = cards.map(c => c.name?.toLowerCase() || '');
    if (names.includes('x-bow')) return 'Siege';
    if (names.includes('mortar')) return 'Siege';
    if (names.includes('miner') && names.includes('poison')) return 'Control';
    if (names.includes('hog rider') || names.includes('royal hogs')) return 'Bridge Spam';
    if (names.includes('golem') || names.includes('electro giant') || names.includes('elixir golem')) return 'Beatdown';
    if (names.includes('goblin barrel') && names.includes('princess')) return 'Bait';
    if (names.includes('graveyard')) return 'Control';
    return 'Midrange';
  };

  const filteredDecks = useMemo(() => {
    if (!cachedDecks) return [];
    
    return cachedDecks.filter(deck => {
      if (deck.count < minCountFilter) return false;
      if (showBestSynergyOnly && !deck.isBestSynergy) return false;
      
      let missingOwned = 0;
      deck.cards.forEach(metaCard => {
        const userCard = profile?.cards.find(c => Number(c.id) === Number(metaCard.id));
        if (!userCard) missingOwned++;
      });
      if (missingFilter !== 'all' && missingOwned > missingFilter) return false;
      if (playstyleFilter !== 'all' && detectArchetype(deck.cards) !== playstyleFilter) return false;
      
      if (cardFilter) {
        const lowerFilter = cardFilter.toLowerCase();
        const hasCard = deck.cards.some(c => c.name?.toLowerCase().includes(lowerFilter));
        if (!hasCard) return false;
      }
      
      return true;
    });
  }, [cachedDecks, minCountFilter, missingFilter, playstyleFilter, showBestSynergyOnly, cardFilter, profile]);

  return {
    minCountFilter,
    setMinCountFilter,
    missingFilter,
    setMissingFilter,
    playstyleFilter,
    setPlaystyleFilter,
    showBestSynergyOnly,
    setShowBestSynergyOnly,
    cardFilter,
    setCardFilter,
    filteredDecks,
    detectArchetype
  };
};
