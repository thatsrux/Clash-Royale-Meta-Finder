import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { CardImage } from '../CardImage';

export const ExpandableEvoRec = ({ featured, others }: { featured: any, others: any[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!featured) return null;
  return (
    <div className={`recommendation-group ${isExpanded ? 'is-expanded' : ''}`}>
      <div className={`recommendation-card evo`} onClick={() => others.length > 0 && setIsExpanded(!isExpanded)} style={{ cursor: others.length > 0 ? 'pointer' : 'default' }}>
        <div className="rec-header">BEST NEXT EVO UNLOCKS</div>
        <div className="rec-body" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
             {featured.items.map((item: any, idx: number) => (
                <React.Fragment key={item.name}>
                   {idx > 0 && <span style={{fontSize: '2rem', color: '#94a3b8', fontWeight: 600}}>+</span>}
                   <CardImage src={item.icon} cardName={item.name} style={{ width: '80px' }} />
                </React.Fragment>
             ))}
          </div>
          <div className="rec-info" style={{ textAlign: 'center' }}>
            <div className="rec-reason" style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>💎 {featured.totalCost} Shards</div>
          </div>
          {others.length > 0 && (
            <div className="expand-trigger" style={{ marginTop: 'auto' }}>
              {isExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </div>
          )}
        </div>
      </div>
      <div className="expand-wrapper">
        <div className="expanded-alternatives">
          {others.map((combo: any, idx: number) => (
            <div key={idx} className="alt-row" style={{ animationDelay: `${idx * 0.1}s`, padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                 {combo.items.map((item: any, iIdx: number) => (
                    <React.Fragment key={item.name}>
                       {iIdx > 0 && <span style={{fontSize: '1.5rem', color: '#64748b', fontWeight: 600}}>+</span>}
                       <CardImage src={item.icon} cardName={item.name} style={{ width: '60px' }} />
                    </React.Fragment>
                 ))}
              </div>
              <div className="alt-info" style={{ textAlign: 'center', flex: 'none', marginLeft: '0.5rem' }}>
                <span className="alt-stat" style={{ color: '#fbbf24', fontWeight: 600, fontSize: '1rem' }}>💎 {combo.totalCost} Shards</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ExpandableRec = ({ featured, others, type }: { featured: any, others: any[], type: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!featured) return null;
  return (
    <div className={`recommendation-group ${isExpanded ? 'is-expanded' : ''}`}>
      <div className={`recommendation-card ${type}`} onClick={() => others.length > 0 && setIsExpanded(!isExpanded)} style={{ cursor: others.length > 0 ? 'pointer' : 'default' }}>
        <div className="rec-header">BEST NEXT {type.toUpperCase()}</div>
        <div className="rec-body" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '0.5rem 0' }}>
          <CardImage src={featured.icon} cardName={featured.name} style={{ width: '80px' }} />
          <div className="rec-info" style={{ textAlign: 'center' }}>
            <div className="rec-reason" style={{ fontSize: '1.2rem', fontWeight: 600, color: type === 'hero' ? '#fbbf24' : '#60a5fa', margin: 0 }}>
              {type === 'hero' ? 'Unlocks' : 'Completes'} {featured.count} archetypes
            </div>
          </div>
          {others.length > 0 && (
            <div className="expand-trigger" style={{ marginTop: 'auto' }}>
              {isExpanded ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </div>
          )}
        </div>
      </div>
      <div className="expand-wrapper">
        <div className="expanded-alternatives">
          {others.map((item: any, idx: number) => (
            <div key={item.name} className="alt-row" style={{ animationDelay: `${idx * 0.1}s`, padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <CardImage src={item.icon} cardName={item.name} style={{ width: '60px' }} />
              <div className="alt-info" style={{ textAlign: 'center', flex: 'none' }}>
                <span className="alt-stat" style={{ fontSize: '1rem', fontWeight: 600, color: type === 'hero' ? '#fbbf24' : '#60a5fa' }}>{item.count} Archetypes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const UpgradeExpandable = ({ rarity, list, availableWilds }: { rarity: string, list: any[], availableWilds: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (list.length === 0) return null;
  const featured = list[0];
  const othersFeasible = list.slice(1, 10);

  const featuredFeasible = featured.cardsNeeded <= availableWilds;
  const featuredWildsUsed = featuredFeasible ? featured.cardsNeeded : availableWilds;
  const featuredRemainingNeed = featured.cardsNeeded - featuredWildsUsed;

  return (
    <div className={`recommendation-group ${isExpanded ? 'is-expanded' : ''}`}>
      <div className={`upgrade-rec-card ${rarity}`} onClick={() => othersFeasible.length > 0 && setIsExpanded(!isExpanded)} style={{ cursor: othersFeasible.length > 0 ? 'pointer' : 'default' }}>
        <div className="rec-header">BEST NEXT {rarity.toUpperCase()}</div>
        <div className="rec-body-mini">
          <CardImage src={featured.icon} cardName={featured.name} />
          <div className="rec-mini-info">
            <div className="name">{featured.name}</div>
            <div className="meta-stats" style={{ color: featuredFeasible ? '#22c55e' : '#94a3b8', fontWeight: featuredFeasible ? 600 : 'normal', display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
              <span>{featuredFeasible ? 'Ready (✓)' : `Needs ${featuredRemainingNeed} cards`}</span>
              {featuredWildsUsed > 0 && <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>( {featuredWildsUsed} 🃏 )</span>}
            </div>
          </div>
          {othersFeasible.length > 0 && (
            <div className="expand-trigger mini">
              {isExpanded ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            </div>
          )}
        </div>
      </div>
      <div className="expand-wrapper">
        <div className="expanded-alternatives mini">
          {othersFeasible.map((item: any, idx: number) => {
            const itemFeasible = item.cardsNeeded <= availableWilds;
            const itemWildsUsed = itemFeasible ? item.cardsNeeded : availableWilds;
            const itemRemainingNeed = item.cardsNeeded - itemWildsUsed;
            return (
              <div key={item.name} className="alt-row mini" style={{ animationDelay: `${idx * 0.08}s` }}>
                <CardImage src={item.icon} cardName={item.name} />
                <div className="alt-info">
                  <span className="alt-name">{item.name}</span>
                  <span className="alt-stat" style={{ color: itemFeasible ? '#22c55e' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <span>{itemFeasible ? 'Ready (✓)' : `Needs ${itemRemainingNeed} cards`}</span>
                    {itemWildsUsed > 0 && <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>( {itemWildsUsed} 🃏 )</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
