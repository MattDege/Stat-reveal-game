import seasonalPlayers from './seasonalPlayers.json';

// Get all players from static JSON
export const fetchAllPlayers = async () => {
  console.log(`✅ Loaded ${seasonalPlayers.length} seasonal players from database`);
  return seasonalPlayers;
};

// Seeded random number generator for consistent daily randomness
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Get daily player based on UTC date with RANDOM selection
export const getDailyPlayer = (players) => {
  if (!players || players.length === 0) return null;

  // TEMPORARY OVERRIDE: Force Aaron Judge 2017 (remove tomorrow!)
  const aaronJudge2017 = players.find(p => 
    p.name === "Aaron Judge" && p.year === 2017
  );
  
  if (aaronJudge2017) {
    console.log('🎯 Today\'s player: Aaron Judge 2017 (manual override)');
    return aaronJudge2017;
  }

  // Use Eastern Time (ET) for daily reset at midnight ET
  const now = new Date();
  
  // Convert to ET (UTC-5 standard, UTC-4 daylight)
  const etOffset = -5; // Change to -4 during daylight saving time
  const etNow = new Date(now.getTime() + (etOffset * 60 * 60 * 1000));
  
  const etYear = etNow.getUTCFullYear();
  const etMonth = etNow.getUTCMonth();
  const etDate = etNow.getUTCDate();
  
  const etStart = new Date(Date.UTC(etYear, 0, 0));
  const etToday = new Date(Date.UTC(etYear, etMonth, etDate));
  const diff = etToday - etStart;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const seed = etYear * 10000 + etMonth * 100 + etDate;
  const randomIndex = Math.floor(seededRandom(seed) * players.length);
  
  return players[randomIndex];
};

// Get unique player names for autocomplete
export const getUniquePlayerNames = (players) => {
  const uniqueNames = new Set();
  players.forEach(p => uniqueNames.add(p.name));
  return Array.from(uniqueNames).sort();
};

// Check if a player name matches the mystery player's season
export const checkGuess = (guessedName, mysteryPlayer, allPlayers) => {
  const match = allPlayers.find(p => 
    p.name === guessedName && 
    p.year === mysteryPlayer.year &&
    p.homeRuns === mysteryPlayer.homeRuns &&
    p.avg === mysteryPlayer.avg
  );
  
  return match !== undefined;
};