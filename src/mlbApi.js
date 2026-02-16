import playersData from './players.json';

// Get all players from static JSON
export const fetchAllPlayers = async () => {
  console.log(`✅ Loaded ${playersData.length} players from static database`);
  return playersData;
};

// Get daily player based on UTC date (resets at midnight UTC)
export const getDailyPlayer = (players) => {
  if (!players || players.length === 0) return null;
  
  // Use UTC date instead of local date
  const today = new Date();
  const utcYear = today.getUTCFullYear();
  const utcStart = new Date(Date.UTC(utcYear, 0, 0));
  const utcToday = new Date(Date.UTC(utcYear, today.getUTCMonth(), today.getUTCDate()));
  const diff = utcToday - utcStart;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const playerIndex = dayOfYear % players.length;
  return players[playerIndex];
};