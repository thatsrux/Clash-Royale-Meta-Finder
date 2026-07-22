import React from 'react';
import { Sparkles, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';
import type { MagicItems, Card, PlayerProfile } from '../../types/clashRoyale';
import { getCardIcon, hasEvoAvailable, isEvoUnlocked } from '../../types/clashRoyale';

interface MagicItemsPanelProps {
  showMagicItems: boolean;
  setShowMagicItems: (show: boolean) => void;
  magicItems: MagicItems;
  setMagicItems: (items: MagicItems) => void;
  isApplyingMagicItems: boolean;
  onApply: () => void;
  profile: PlayerProfile;
  cardMap: Record<number, any>;
}

export const MagicItemsPanel: React.FC<MagicItemsPanelProps> = ({
  showMagicItems,
  setShowMagicItems,
  magicItems,
  setMagicItems,
  isApplyingMagicItems,
  onApply,
  profile,
  cardMap
}) => {
  return (
    <div className="magic-items-config" style={{ marginBottom: '1rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button 
        className="magic-toggle-btn" 
        onClick={() => setShowMagicItems(!showMagicItems)}
        style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <Sparkles size={20} />
          <span>Magic Items 🃏</span>
        </div>
        {showMagicItems ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
      </button>
      {showMagicItems && (
        <div className="magic-items-panel" style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Wild Evo Shards</label>
            <input 
              type="number" min="0" max="6" 
              value={magicItems.evoShards || ''} 
              onChange={e => setMagicItems({...magicItems, evoShards: e.target.value === '' ? 0 : parseInt(e.target.value)})} 
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>6 Shards = 1 Unlock</span>
          </div>
          <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hero Coins</label>
            <input 
              type="number" min="0" 
              value={magicItems.heroCoins || ''} 
              onChange={e => setMagicItems({...magicItems, heroCoins: e.target.value === '' ? 0 : parseInt(e.target.value)})} 
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>200 Coins = 1 Unlock</span>
          </div>
          <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gems</label>
            <input 
              type="number" min="0" 
              value={magicItems.gems || ''} 
              onChange={e => setMagicItems({...magicItems, gems: e.target.value === '' ? 0 : parseInt(e.target.value)})} 
              style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }}
            />
            <span style={{ fontSize: '0.7rem', color: '#10b981' }}>Used for missing cards</span>
          </div>
          
          <div style={{ width: '100%', marginTop: '0.5rem' }}>
             <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Rarity Wildcards</div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Common</label>
                  <input type="number" min="0" value={magicItems.commonWild || ''} onChange={e => setMagicItems({...magicItems, commonWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                </div>
                <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rare</label>
                  <input type="number" min="0" value={magicItems.rareWild || ''} onChange={e => setMagicItems({...magicItems, rareWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                </div>
                <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Epic</label>
                  <input type="number" min="0" value={magicItems.epicWild || ''} onChange={e => setMagicItems({...magicItems, epicWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                </div>
                <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Legendary</label>
                  <input type="number" min="0" value={magicItems.legendaryWild || ''} onChange={e => setMagicItems({...magicItems, legendaryWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                </div>
                <div className="magic-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Champion</label>
                  <input type="number" min="0" value={magicItems.championWild || ''} onChange={e => setMagicItems({...magicItems, championWild: e.target.value === '' ? 0 : parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)' }} />
                </div>
             </div>
          </div>
          
          {profile && (
            <div style={{ width: '100%', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Specific Evo Shards (Non-unlocked)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '0.8rem', padding: '0.5rem 0' }}>
                {Object.values(cardMap).filter(c => hasEvoAvailable(c as unknown as Card) && !isEvoUnlocked(profile.cards.find(uc => uc.id === c.id) as Card)).map(evoCard => (
                   <div key={evoCard.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'var(--surface)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                     <img src={getCardIcon(evoCard as unknown as Card, false, true)} style={{ width: '45px', height: '54px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} alt={evoCard.name} title={evoCard.name} />
                     <input 
                       type="number" min="0" max="5" 
                       value={magicItems.specificEvoShards?.[evoCard.name] || ''}
                       onChange={e => {
                         const val = e.target.value === '' ? '' : parseInt(e.target.value);
                         const newShards = { ...(magicItems.specificEvoShards || {}) };
                         if (val === '' || val === 0) {
                           delete newShards[evoCard.name];
                         } else {
                           newShards[evoCard.name] = Math.min(5, Math.max(0, val));
                         }
                         setMagicItems({ ...magicItems, specificEvoShards: newShards });
                       }}
                       style={{ width: '100%', padding: '0.2rem', textAlign: 'center', borderRadius: '0.25rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', fontSize: '0.7rem' }}
                     />
                   </div>
                ))}
              </div>
            </div>
          )}
          <button 
            className="action-btn" 
            style={{ width: '100%', marginTop: '0.5rem', background: isApplyingMagicItems ? '#10b981' : 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'all 0.3s' }}
            onClick={onApply}
            disabled={isApplyingMagicItems}
          >
            {isApplyingMagicItems ? <><CheckCircle2 size={18} /> Saved!</> : 'Apply'}
          </button>
        </div>
      )}
    </div>
  );
};
