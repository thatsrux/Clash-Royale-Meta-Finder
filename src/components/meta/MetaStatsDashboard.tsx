import { useState } from 'react';
import { PlayerProfile, isEvoUnlocked, isHeroVariantUnlocked, getDisplayLevel } from '../../types/clashRoyale';
import { CardImage } from '../CardImage';
import { Sparkles, Crown, ArrowUp, ArrowDown, LayoutDashboard, RefreshCw, TrendingUp } from 'lucide-react';

interface Props {
  profile: PlayerProfile | null;
  metaInsightsData: any;
  isMetaLoading: boolean;
  metaProgress: number;
}

const ExpandableRec = ({ featured, others, type }: { featured: any, others: any[], type: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!featured) return null;
  return (
    <div className={`recommendation-group ${isExpanded ? 'is-expanded' : ''}`}>
      <div className={`recommendation-card ${type}`} onClick={() => others.length > 0 && setIsExpanded(!isExpanded)} style={{ cursor: others.length > 0 ? 'pointer' : 'default' }}>
        <div className="rec-header">BEST NEXT {type.toUpperCase()}</div>
        <div className="rec-body">
          <CardImage src={featured.icon} cardName={featured.name} />
          <div className="rec-info">
            <div className="rec-name">{featured.name}</div>
            <div className="rec-reason">{type === 'hero' ? 'Unlocks' : 'Completes'} {featured.count} archetypes</div>
          </div>
          {others.length > 0 && (
            <div className="expand-trigger">
              {isExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </div>
          )}
        </div>
      </div>
      <div className="expand-wrapper">
        <div className="expanded-alternatives">
          {others.map((item: any, idx: number) => (
            <div key={item.name} className="alt-row" style={{ animationDelay: `${idx * 0.1}s` }}>
              <CardImage src={item.icon} cardName={item.name} />
              <div className="alt-info">
                <span className="alt-name">{item.name}</span>
                <span className="alt-stat">{item.count} Archetypes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const UpgradeExpandable = ({ rarity, list }: { rarity: string, list: any[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!list || list.length === 0) return null;
  const featured = list[0];
  const others = list.slice(1, 6);

  return (
    <div className={`recommendation-group rarity-group ${isExpanded ? 'is-expanded' : ''}`}>
      <div className={`recommendation-card upgrade-card`} style={{ borderColor: `var(--rarity-${rarity})` }} onClick={() => others.length > 0 && setIsExpanded(!isExpanded)}>
        <div className="rec-header" style={{ color: `var(--rarity-${rarity})` }}>BEST {rarity.toUpperCase()} UPGRADE</div>
        <div className="rec-body">
          <CardImage src={featured.icon} cardName={featured.name} />
          <div className="rec-info">
            <div className="rec-name">{featured.name}</div>
            <div className="rec-reason">Boosts {featured.count} decks</div>
          </div>
          {others.length > 0 && (
            <div className="expand-trigger" style={{ color: `var(--rarity-${rarity})` }}>
              {isExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </div>
          )}
        </div>
      </div>
      <div className="expand-wrapper">
        <div className="expanded-alternatives rarity-alts">
          {others.map((item: any, idx: number) => (
            <div key={item.name} className="alt-row" style={{ animationDelay: `${idx * 0.1}s` }}>
              <CardImage src={item.icon} cardName={item.name} />
              <div className="alt-info">
                <span className="alt-name">{item.name}</span>
                <span className="alt-stat">{item.count} Decks</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MetaStatsDashboard = ({ profile, metaInsightsData, isMetaLoading, metaProgress }: Props) => {
  const [insightsExpanded, setInsightsExpanded] = useState({ evo: false, hero: false, rarity: false });

  if (isMetaLoading) {
    return (
      <div className="variant-insights-section loading">
        <div className="insights-divider"><RefreshCw size={20} className="spin" /><span>ANALYZING META STRATEGIES...</span></div>
        <div className="insights-loading-body">
          <div className="loading-text">Calculating your next best moves based on Top 200 Pro Decks</div>
          <div className="progress-track-mini"><div className="progress-bar-fill-mini" style={{ width: `${metaProgress}%` }}></div></div>
          <div className="loading-subtext">Scanning battle logs and calculating affinity scores ({metaProgress}%)</div>
        </div>
      </div>
    );
  }

  if (!metaInsightsData || !profile) return null;

  return (
    <div className="variant-insights-section">
      <div className="insights-divider"><TrendingUp size={20} /><span>META PROGRESSION INSIGHTS</span></div>
      <div className="recommendations-row">
        <ExpandableRec featured={metaInsightsData.sortedEvos[0]} others={metaInsightsData.sortedEvos.slice(1, 6).sort((a: any, b: any) => b.count - a.count)} type="evo" />
        <ExpandableRec featured={metaInsightsData.sortedHeroes[0]} others={metaInsightsData.sortedHeroes.slice(1, 6).sort((a: any, b: any) => b.count - a.count)} type="hero" />
      </div>
      <div className="stats-tables-row">
        <div className="stats-column">
          <div className="stats-header clickable" onClick={() => setInsightsExpanded(prev => ({...prev, evo: !prev.evo}))} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Sparkles size={14} /> MISSING EVO USAGE</div>
            {insightsExpanded.evo ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </div>
          {insightsExpanded.evo && (
            <div className="stats-list">
              {Object.values(metaInsightsData.absoluteEvoUsage).filter((evo: any) => { const card = profile.cards.find(c => c.name === evo.name); return !card || !isEvoUnlocked(card); }).sort((a: any, b: any) => b.count - a.count).map((evo: any) => (
                <div key={evo.name} className="stat-row-item"><CardImage src={evo.icon} cardName={evo.name} /><div className="stat-row-details"><span className="name">{evo.name}</span><span className="percent">{Math.round((evo.count / metaInsightsData.totalDecksCount) * 100)}% Usage</span></div><div className="stat-row-bar-bg"><div className="stat-row-bar-fill evo" style={{ width: `${(evo.count / metaInsightsData.totalDecksCount) * 100}%` }}></div></div></div>
              ))}
            </div>
          )}
        </div>
        <div className="stats-column">
          <div className="stats-header clickable" onClick={() => setInsightsExpanded(prev => ({...prev, hero: !prev.hero}))} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Crown size={14} /> MISSING HERO USAGE</div>
            {insightsExpanded.hero ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </div>
          {insightsExpanded.hero && (
            <div className="stats-list">
              {Object.values(metaInsightsData.absoluteHeroUsage).filter((hero: any) => { const card = profile.cards.find(c => c.name === hero.name); return !card || !isHeroVariantUnlocked(card); }).sort((a: any, b: any) => b.count - a.count).map((hero: any) => (
                <div key={hero.name} className="stat-row-item"><CardImage src={hero.icon} cardName={hero.name} /><div className="stat-row-details"><span className="name">{hero.name}</span><span className="percent">{Math.round((hero.count / metaInsightsData.totalDecksCount) * 100)}% Usage</span></div><div className="stat-row-bar-bg"><div className="stat-row-bar-fill hero" style={{ width: `${(hero.count / metaInsightsData.totalDecksCount) * 100}%` }}></div></div></div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="insights-divider" style={{ marginTop: '3rem' }}>
        <ArrowUp size={20} /><span>UPGRADE PRIORITY BY RARITY</span>
      </div>
      <div className="upgrade-rec-grid">
        {metaInsightsData.rarityRecs.map((rec: any) => <UpgradeExpandable key={rec.rarity} rarity={rec.rarity} list={rec.list} />)}
      </div>

      <div className="stats-column" style={{ marginTop: '2rem' }}>
        <div className="stats-header clickable" onClick={() => setInsightsExpanded(prev => ({...prev, rarity: !prev.rarity}))} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LayoutDashboard size={14} /> MISSING UPGRADES USAGE DETAILS</div>
          {insightsExpanded.rarity ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        </div>
        {insightsExpanded.rarity && (
          <div className="stats-tables-grid-3" style={{ marginTop: '1rem' }}>
            {metaInsightsData.rarities.map((r: string) => {
              const list = Object.values(metaInsightsData.absoluteRarityUsage[r] || {}).filter((item: any) => { 
                const cardId = Object.keys(metaInsightsData.absoluteRarityUsage[r]).find(id => metaInsightsData.absoluteRarityUsage[r][Number(id)].name === item.name); 
                const userCard = profile.cards.find(c => Number(c.id) === Number(cardId)); 
                return !userCard || getDisplayLevel(userCard) < 16; 
              }).sort((a: any, b: any) => b.count - a.count);
              if (list.length === 0) return null;
              return (
                <div key={r} className="stats-column"><div className="stats-header rarity-header" style={{ color: `var(--rarity-${r})` }}>{r.toUpperCase()} USAGE</div><div className="stats-list mini">{list.slice(0, 10).map((item: any) => (<div key={item.name} className="stat-row-item compact"><CardImage src={item.icon} cardName={item.name} /><div className="stat-row-details"><span className="name">{item.name}</span><span className="percent">{Math.round((item.count / metaInsightsData.totalDecksCount) * 100)}% Usage</span></div><div className="stat-row-bar-bg"><div className={`stat-row-bar-fill rarity-${r}`} style={{ width: `${(item.count / metaInsightsData.totalDecksCount) * 100}%` }}></div></div></div>))}</div></div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
