import { useMemo, useState } from 'react';
import { type PlayerProfile, getDisplayLevel, getRarityClass, isEvoUnlocked, isHeroVariantUnlocked } from '../types/clashRoyale';

export type SortOption = 'level' | 'rarity' | 'elixir' | 'evo' | 'hero-only' | 'evo-only';
export type SortOrder = 'asc' | 'desc';

export const useCardFilters = (profile: PlayerProfile | null, allGameCards: any[]) => {
  const [sortBy, setSortBy] = useState<SortOption>('level');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Build a quick map for elixir costs based on allGameCards
  const cardMap = useMemo(() => {
    const map: Record<number, any> = {};
    if (allGameCards && Array.isArray(allGameCards)) {
      allGameCards.forEach(c => map[c.id] = c);
    }
    return map;
  }, [allGameCards]);

  const getRarityWeight = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'champion': return 5;
      case 'hero': return 5;
      case 'legendary': return 4;
      case 'epic': return 3;
      case 'rare': return 2;
      case 'common': return 1;
      default: return 0;
    }
  };

  const sortedCards = useMemo(() => {
    if (!profile?.cards) return [];
    
    return [...profile.cards]
      .filter(c => {
        if (sortBy === 'hero-only') return isHeroVariantUnlocked(c);
        if (sortBy === 'evo-only') return isEvoUnlocked(c);
        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'elixir') comp = (cardMap[b.id]?.elixir || 0) - (cardMap[a.id]?.elixir || 0);
        else if (sortBy === 'rarity') comp = getRarityWeight(getRarityClass(b)) - getRarityWeight(getRarityClass(a));
        else if (sortBy === 'evo' || sortBy === 'evo-only') comp = (isEvoUnlocked(b) ? 1 : 0) - (isEvoUnlocked(a) ? 1 : 0);
        else if (sortBy === 'hero-only') comp = (isHeroVariantUnlocked(b) ? 1 : 0) - (isHeroVariantUnlocked(a) ? 1 : 0);
        else comp = getDisplayLevel(b) - getDisplayLevel(a);
        
        if (comp === 0) comp = (a.name || '').localeCompare(b.name || '');
        return sortOrder === 'desc' ? comp : -comp;
      });
  }, [profile, sortBy, sortOrder, cardMap]);

  return {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    sortedCards,
    cardMap
  };
};
