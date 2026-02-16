import playersData from './players.json';

// Get all players from static JSON
export const fetchAllPlayers = async () => {
  console.log(`✅ Loaded ${playersData.length} players from static database`);
  return playersData;
};

// Get daily player based on date
export const getDailyPlayer = (players) => {
  if (!players || players.length === 0) return null;
  
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const playerIndex = dayOfYear % players.length;
  return players[playerIndex];
};