import seasonalPlayers from './seasonalPlayers.json';

// Get all players from static JSON
export const fetchAllPlayers = async () => {
  console.log(`✅ Loaded ${seasonalPlayers.length} seasonal players from database`);
  return seasonalPlayers;
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
export const getDailyPlayer = (players) => {
  if (!players || players.length === 0) return null;

  // Get current ET date
  const etNow = getETDate(new Date());
  const etYear = etNow.getUTCFullYear();
  const etMonth = etNow.getUTCMonth() + 1;
  const etDate = etNow.getUTCDate();

  // Create unique seed from ET date
  const seed = etYear * 10000 + etMonth * 100 + etDate;
  
  // Use Mulberry32 for high quality randomness
  const randomValue = mulberry32(seed);
  const randomIndex = Math.floor(randomValue * players.length);

  console.log(`📅 ET Date: ${etYear}-${etMonth}-${etDate} | Seed: ${seed} | Index: ${randomIndex}`);

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