import React, { useState, useEffect } from 'react';
import './styles/App.css';
import { Search, UserCircle2, LayoutDashboard, X, RefreshCw } from 'lucide-react';

import { usePlayerProfile } from './hooks/usePlayerProfile';
import { useMetaDecks } from './hooks/useMetaDecks';
import { useCardFilters } from './hooks/useCardFilters';

import { PlayerProfileHeader } from './components/profile/PlayerProfileHeader';
import { CollectionGrid } from './components/profile/CollectionGrid';
import { MetaStatsDashboard } from './components/meta/MetaStatsDashboard';
import { DeckBuilder } from './components/DeckBuilder';

import { getAllCards } from './services/royaleApi';
import { registerAllGameCards } from './types/clashRoyale';

const INTEGRATED_API_KEY = "dummy_api_key_for_proxy"; // Used with proxy

function App() {
  const [activeTab, setActiveTab] = useState<'profile' | 'decks'>('profile');
  const [allGameCards, setAllGameCards] = useState<any[]>([]);
  const [recentTags, setRecentTags] = useState<string[]>([]);

  const { tag, setTag, profile, loading: profileLoading, error: profileError, fetchProfile, collectionLevel } = usePlayerProfile(INTEGRATED_API_KEY);
  const { metaDecksCache, isMetaLoading, metaProgress, error: metaError, performMetaAnalysis, metaInsightsData } = useMetaDecks(profile, INTEGRATED_API_KEY);
  
  const { sortBy, setSortBy, sortOrder, setSortOrder, sortedCards, cardMap } = useCardFilters(profile, allGameCards);

  useEffect(() => {
    const saved = localStorage.getItem('cr_tag_history');
    if (saved) setRecentTags(JSON.parse(saved));
    getAllCards(INTEGRATED_API_KEY).then(data => {
      setAllGameCards(data.items || []);
      registerAllGameCards(data.items || []);
    });
  }, []);

  const normalizeTag = (t: string) => {
    let clean = t.trim().toUpperCase();
    if (clean && !clean.startsWith('#')) clean = '#' + clean;
    return clean;
  };

  const saveTagToHistory = (t: string) => {
    const cleanTag = normalizeTag(t);
    if (!cleanTag || cleanTag === '#') return;
    setRecentTags(prev => {
      const filtered = prev.filter(x => x !== cleanTag);
      const updated = [cleanTag, ...filtered].slice(0, 5);
      localStorage.setItem('cr_tag_history', JSON.stringify(updated));
      return updated;
    });
  };

  const removeTagFromHistory = (e: React.MouseEvent, tagToRemove: string) => {
    e.stopPropagation();
    setRecentTags(prev => {
      const updated = prev.filter(t => t !== tagToRemove);
      localStorage.setItem('cr_tag_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const rawTag = typeof e === 'string' ? e : tag;
    const tagToSearch = normalizeTag(rawTag);
    if (!tagToSearch || tagToSearch === '#') return;

    setTag(tagToSearch);
    saveTagToHistory(tagToSearch);
    
    // In usePlayerProfile, fetchProfile uses the state tag, but we need to pass tagToSearch directly if called from string
    // To fix this cleanly, we can dispatch the event
    const formEvent = typeof e !== 'string' ? e : undefined;
    await fetchProfile(formEvent);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon-wrapper pure-style">👑</div>
          <div className="logo-text">
            <h1>CR Meta Finder</h1>
            <span className="logo-subtitle">PRO INSIGHTS</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="search-section pure-style">
          <form onSubmit={handleSearch} className="search-form">
            <div className="input-group">
              <Search className="search-icon" size={20} />
              <input type="text" placeholder="Enter Player Tag (e.g. #Y8QG..." value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} className="tag-input" />
              <button type="submit" className="primary-btn" disabled={profileLoading || !tag}>
                {profileLoading ? <RefreshCw size={20} className="spin" /> : 'ANALYZE'}
              </button>
            </div>
          </form>

          {recentTags.length > 0 && !profileLoading && !profile && (
            <div className="recent-tags-container">
              <span className="recent-label">Recent:</span>
              <div className="recent-tags-list">
                {recentTags.map(recentTag => (
                  <div key={recentTag} className="tag-chip" onClick={() => handleSearch(recentTag)}>
                    <span className="tag-text">{recentTag}</span>
                    <button className="remove-tag" onClick={(e) => removeTagFromHistory(e, recentTag)}><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(profileError || metaError) && (
            <div className="error-message">
              {profileError || metaError}
            </div>
          )}
        </div>

        {profileLoading && <div className="loading-state"><RefreshCw size={48} className="spin" color="var(--primary)" /><p>Fetching Royale Data...</p></div>}

        {profile && !profileLoading && (
          <div className="profile-view">
            <div className="tabs-premium-container">
              <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><UserCircle2 size={24} /><span>PROFILE</span></button>
              <button className={`tab-btn ${activeTab === 'decks' ? 'active' : ''}`} onClick={() => setActiveTab('decks')}><LayoutDashboard size={24} /><span>META DECKS</span></button>
            </div>

            {activeTab === 'profile' ? (
              <div className="profile-content">
                <PlayerProfileHeader profile={profile} collectionLevel={collectionLevel} />
                
                <CollectionGrid 
                  sortedCards={sortedCards}
                  sortBy={sortBy} setSortBy={setSortBy}
                  sortOrder={sortOrder} setSortOrder={setSortOrder}
                  cardMap={cardMap}
                />

                <MetaStatsDashboard 
                  profile={profile}
                  metaInsightsData={metaInsightsData}
                  isMetaLoading={isMetaLoading}
                  metaProgress={metaProgress}
                />
              </div>
            ) : (
              <DeckBuilder 
                profile={profile} 
                cachedDecks={metaDecksCache}
                onAnalysisStart={() => performMetaAnalysis()}
                isLoading={isMetaLoading}
                progress={metaProgress}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
