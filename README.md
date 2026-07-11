# 👑 Clash Royale Meta Finder

A premium, data-driven web application designed to bridge the gap between your personal card collection and the professional meta. By analyzing the top 200 players in the world, this tool calculates exactly which pro decks are most compatible with your current levels, taking into account both your immediate collection and your available magic items budget.

---

## 🚀 Key Features

### 📊 Advanced Meta Analysis
- **Top 200 Live Scanning**: Automatically scans Path of Legend and Global rankings to extract the most successful archetypes in the current season.
- **Affinity Scoring (0-100%)**: A surgical algorithm that evaluates deck compatibility based on Card Levels, missing cards, and required Evolutions or Heroes.
- **Play Now vs. Max Potential Mode**: 
  - **Play Now**: See how meta decks perform *exactly* with your current collection.
  - **Max Potential**: Magically apply your available Magic Items (Wildcards, Evo Shards, Hero Coins) to see how far your budget can push your affinity score!

### 🃏 Magic Items & Budgeting
- **Magic Items Dashboard**: Input your exact count of Common, Rare, Epic, Legendary, Champion Wildcards, as well as Evo Shards and Hero Coins.
- **Intelligent Deck Costing**: Every meta deck displays a precise breakdown of the virtual budget required to max it out, showing exactly how many Wildcards (🃏 by rarity color), Evo Shards (💎), Hero Coins (🪙), and Gold (💰) are needed.
- **Card-Level Costing**: Hover over individual cards in a deck to see a dedicated badge showing the specific amount of wildcards injected into that single card to raise its level.

### 🧠 Intelligence & Progression Insights
- **Background Auto-Analysis**: Recommendations are calculated silently as soon as you load your profile.
- **Best Next Unlock**: Identifies the single most impactful **Evolution** and **Hero** to unlock based on their presence in high-affinity meta decks.
- **Upgrade Priority by Rarity**: Uses a *Net Affinity Gain* simulation to suggest which card will provide the biggest performance boost across the entire meta, intelligently considering your available wildcards to recommend only feasible upgrades first.
- **Meta Usage Statistics**: Detailed tables showing the percentage of usage for all variants and rarities in the current pro meta.

### 🗃️ Collection Management
- **Pure Style Grid**: A clean, borderless card interface matching the in-game aesthetic.
- **Dynamic Filtering**: Instantly isolate your collection with "ONLY HEROES" or "ONLY EVOS" views.
- **Smart Sorting**: Order your cards by Level, Elixir Cost, Rarity, or Variant status.
- **Symmetric Information**: Quick-glance badges for Elixir cost, Level, and compact variant indicators.

---

## 🛠️ Technical Stack
- **Frontend**: React 18 + TypeScript (Vite)
- **Styling**: Modern CSS with Glass-morphism and premium gradients.
- **Data Source**: RoyaleAPI (Official Supercell API integration).
- **Icons**: Lucide React.

---

## 🧪 The "Affinity" Formula
The 100% score is the "Holy Grail" — it means you have every card at maximum level (Level 16) with the correct variants, or your budget can reach it.

The exact calculation starts from the maximum level threshold (128 total levels in a deck) and applies the following penalties:

1. **📈 Base Level Score**: `(Total Deck Levels / 128) * 100`
   - *Boost*: A fractional percentage bonus is added based on the partial card progress you have towards the next level.
2. **🚫 Missing Card Penalty**: `-10%` for every base card missing from your collection (if not covered by wildcards).
3. **💎 Missing Variant Penalty**: `-5%` for every required Evolution or Hero you haven't unlocked (and can't afford).
4. **👑 Missing Max Level Penalty**: `-2%` for every card in the deck that does not reach Level 16.
5. **⚖️ Tie-Breaker**: A microscopic fractional addition based on how often the top 200 pros use the deck and their maximum rating, ensuring perfect 100% decks are sorted by meta strength.

*Formula: `Base Score - Missing Card Penalty - Missing Variant Penalty - Missing Max Level Penalty` (capped between 0 and 100).*

---

*Built for players who want to stop guessing and start upgrading with data.* ⚔️
