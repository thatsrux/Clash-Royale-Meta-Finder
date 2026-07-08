import { useState, useEffect } from 'react';
import { getPlayerProfile } from '../services/royaleApi';
import { PlayerProfile, Card } from '../types/clashRoyale';

export interface UsePlayerProfileResult {
  tag: string;
  setTag: (tag: string) => void;
  profile: PlayerProfile | null;
  loading: boolean;
  error: string;
  fetchProfile: (e?: React.FormEvent) => Promise<void>;
  clearProfile: () => void;
  collectionLevel: number;
}

export const usePlayerProfile = (apiKey: string): UsePlayerProfileResult => {
  const [tag, setTag] = useState('');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved tag from localStorage on mount
  useEffect(() => {
    const savedTag = localStorage.getItem('cr_player_tag');
    if (savedTag) {
      setTag(savedTag);
      fetchProfileDirect(savedTag);
    }
  }, []);

  const fetchProfileDirect = async (targetTag: string) => {
    if (!targetTag) return;
    setLoading(true);
    setError('');
    try {
      const data = await getPlayerProfile(targetTag, apiKey);
      if (data) {
        setProfile(data as PlayerProfile);
        localStorage.setItem('cr_player_tag', targetTag);
      } else {
        setError('Player not found or API error. Check your tag.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching player data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await fetchProfileDirect(tag);
  };

  const clearProfile = () => {
    setProfile(null);
    setTag('');
    setError('');
    localStorage.removeItem('cr_player_tag');
  };

  // Calculate collection level equivalent
  const collectionLevel = profile ? Math.floor(
    profile.cards.reduce((sum: number, card: Card) => sum + (card.level || 1), 0) / 10
  ) : 0;

  return {
    tag,
    setTag,
    profile,
    loading,
    error,
    fetchProfile,
    clearProfile,
    collectionLevel
  };
};
