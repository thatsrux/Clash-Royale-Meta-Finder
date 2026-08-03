const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');

// Line 1: import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Remove useMemo
lines[0] = lines[0].replace(', useMemo', '');

// Line 2: import { Search, Trophy, Shield, LayoutDashboard, UserCircle2, Sparkles, Crown, ArrowDownAZ, ArrowUpAZ, Clock, RefreshCw, X as CloseIcon, TrendingUp, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';
// Remove Trophy, Shield, CheckCircle2
lines[1] = lines[1].replace('Trophy, ', '').replace('Shield, ', '').replace(', CheckCircle2', '');

// Line 3: import { getPlayerProfile, getAllCards, fetchRankings, getBattleLog, getPlayerDeck, getPathOfLegendSeasons } from './services/royaleApi';
// Remove fetchRankings, getBattleLog, getPlayerDeck, getPathOfLegendSeasons
lines[2] = lines[2].replace(', fetchRankings, getBattleLog, getPlayerDeck, getPathOfLegendSeasons', '');

// Line 6: import { registerCardIcons, isEvoUnlocked, isHeroVariantUnlocked, isAnyHeroUnlocked, getCardIcon, hasHeroAvailable, hasEvoAvailable, isChampion, getDeckAverageElixir, getCardsToNextLevel, getVirtualLevelAndGold } from './types/clashRoyale';
// Remove registerCardIcons
lines[5] = lines[5].replace('registerCardIcons, ', '');

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('Fixed imports');
