# 👑 Clash Royale Meta Finder

A premium, data-driven web application designed to bridge the gap between your personal card collection and the professional meta. By analyzing the top 200 players in the world, this tool calculates exactly which pro decks are most compatible with your current levels and provides strategic insights for your next upgrades.

---

## 🚀 Key Features

### 📊 Advanced Meta Analysis
- **Top 200 Live Scanning**: Automatically scans Path of Legend and Global rankings to extract the most successful archetypes in the current season.
- **Affinity Scoring (0-100%)**: A surgical algorithm that evaluates deck compatibility based on:
  - **Card Levels**: Mathematical average vs. max level 16.
  - **Elite Weight**: Heavy penalties for non-maxed cards to prioritize competitive readiness.
  - **Variant Matching**: Strict verification of unlocked Evolutions and Hero versions.

### 🧠 Intelligence & Progression Insights
- **Background Auto-Analysis**: Recommendations are calculated silently as soon as you load your profile.
- **Best Next Unlock**: Identifies the single most impactful **Evolution** and **Hero** to unlock based on their presence in high-affinity meta decks.
- **Upgrade Priority by Rarity**: Uses a *Net Affinity Gain* simulation to suggest which card (Common, Rare, Epic, Legendary, Champion) will provide the biggest performance boost across the entire meta.
- **Meta Usage Statistics**: Detailed tables showing the percentage of usage for all variants and rarities in the current pro meta.

### card_index: Collection Management
- **Pure Style Grid**: A clean, borderless card interface matching the in-game aesthetic.
- **Dynamic Filtering**: Instantly isolate your collection with "ONLY HEROES" or "ONLY EVOS" views.
- **Smart Sorting**: Order your cards by Level, Elixir Cost, Rarity, or Variant status.
- **Symmetric Information**: Quick-glance badges for Elixir cost (bottom-left), Level (bottom-right), and compact variant indicators.

---

## 🛠️ Technical Stack
- **Frontend**: React 18 + TypeScript (Vite)
- **Styling**: Modern CSS with Glass-morphism and premium gradients.
- **Data Source**: RoyaleAPI (Official Supercell API integration).
- **Icons**: Lucide React.

---

## 🧪 The "Affinity" Formula
The 100% score is the "Holy Grail" — it means you have every card at level 16 with the correct variants.
- **Base**: `(Total Levels / 128) * 100`
- **Elite Penalty**: `-2%` for every card not at level 16.
- **Variant Penalty**: `-5%` for every missing required Evolution or Hero.
- **Ownership Penalty**: `-10%` if a base card is missing.

---

*Built for players who want to stop guessing and start upgrading with data.* ⚔️
