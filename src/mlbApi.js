import seasonalPlayers from './seasonalPlayers.json';
import allPlayerNames from './allPlayerNames.json';

// Get all players from static JSON
export const fetchAllPlayers = async () => {
  console.log(`✅ Loaded ${seasonalPlayers.length} seasonal players from database`);
  return seasonalPlayers;
};

// Get ALL player names for autocomplete (no filters)
export const getAllPlayerNames = () => {
  return allPlayerNames.players;
};

// Filter players by mode
export const filterPlayersByMode = (players, mode) => {
  if (mode === 'hard') {
    // Hard mode: All qualified players (1990-2025)
    return players.filter(p => p.year >= 1990 && p.year <= 2025);
  } else {
    // Normal mode: Recent regulars (2010-2025, 400+ PA)
    return players.filter(p => {
      const isRecent = p.year >= 2010 && p.year <= 2025;
      const wasRegular = p.plateAppearances >= 400;
      return isRecent && wasRegular;
    });
  }
};

// Mulberry32 - high quality seeded random number generator
const mulberry32 = (seed) => {
  let t = seed + 0x6D2B79F5;
  t = Math.imul((t ^ (t >>> 15)), (t | 1));
  t ^= t + Math.imul((t ^ (t >>> 7)), (t | 61));
  return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
};

// Convert any date to ET (handles DST automatically)
const getETDate = (date) => {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const isDST = date.getTimezoneOffset() < stdOffset;
  const etOffset = isDST ? -4 : -5;
  return new Date(date.getTime() + (etOffset * 60 * 60 * 1000));
};

// Get daily player - resets at midnight ET
export const getDailyPlayer = (players, mode = 'normal') => {
  if (!players || players.length === 0) return null;

  // Filter by mode first
  const filteredPlayers = filterPlayersByMode(players, mode);

  // Get current ET date
  const etNow = getETDate(new Date());
  const etYear = etNow.getUTCFullYear();
  const etMonth = etNow.getUTCMonth() + 1;
  const etDate = etNow.getUTCDate();

  // Create unique seed from ET date + mode offset
  // Different seed for each mode so they get different players
  const modeOffset = mode === 'hard' ? 5000000 : 0;
  const seed = etYear * 10000 + etMonth * 100 + etDate + modeOffset;
  
  // Use Mulberry32 for high quality randomness
  const randomValue = mulberry32(seed);
  const randomIndex = Math.floor(randomValue * filteredPlayers.length);

  console.log(`📅 ${mode.toUpperCase()} Mode | ET Date: ${etYear}-${etMonth}-${etDate} | Seed: ${seed} | Index: ${randomIndex}`);

  return filteredPlayers[randomIndex];
};

// Normalize string - remove accents
const normalizeString = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// Check if a player name matches the mystery player's season
export const checkGuess = (guessedName, mysteryPlayer, allPlayers) => {
  const normalizedGuess = normalizeString(guessedName);
  
  const match = allPlayers.find(p => {
    const normalizedPlayer = normalizeString(p.name);
    return normalizedPlayer === normalizedGuess &&
           p.year === mysteryPlayer.year &&
           p.homeRuns === mysteryPlayer.homeRuns &&
           p.avg === mysteryPlayer.avg;
  });
  
  return match !== undefined;
};