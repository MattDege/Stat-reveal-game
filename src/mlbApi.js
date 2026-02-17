import seasonalPlayers from './seasonalPlayers.json';

// Get all players from static JSON
export const fetchAllPlayers = async () => {
  console.log(`✅ Loaded ${seasonalPlayers.length} seasonal players from database`);
  return seasonalPlayers;
};

// Seeded random number generator
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Convert any date to ET
const getETDate = (date) => {
  const etOffset = -5; // -4 during daylight saving
  return new Date(date.getTime() + (etOffset * 60 * 60 * 1000));
};

// Get daily player - resets at midnight ET
export const getDailyPlayer = (players) => {
  if (!players || players.length === 0) return null;

  // Get current ET date
  const etNow = getETDate(new Date());
  const etYear = etNow.getUTCFullYear();
  const etMonth = etNow.getUTCMonth();
  const etDate = etNow.getUTCDate();

  // Create seed from ET date - same for everyone on same ET day
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