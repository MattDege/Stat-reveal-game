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
  
  
  // Fallback to random if not found
  const today = new Date();
  const utcYear = today.getUTCFullYear();
  const utcMonth = today.getUTCMonth();
  const utcDate = today.getUTCDate();
  const seed = utcYear * 10000 + utcMonth * 100 + utcDate;
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