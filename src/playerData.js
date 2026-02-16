// playerData.js - Our curated baseball players

export const players = [
  {
    id: 1,
    name: "Aaron Judge",
    yearRange: "2017-2021",
    position: "RF",
    homeRuns: 52,
    war: 8.2,
    team: "Yankees",
    secondaryStat: "OPS+ 173",
    image: "https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/33192.png"
  },
  {
    id: 2,
    name: "Mike Trout",
    yearRange: "2017-2021",
    position: "CF",
    homeRuns: 45,
    war: 7.8,
    team: "Angels",
    secondaryStat: "OPS+ 176",
    image: "https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/30836.png"
  },
  {
    id: 3,
    name: "Mookie Betts",
    yearRange: "2017-2021",
    position: "RF",
    homeRuns: 32,
    war: 8.6,
    team: "Dodgers",
    secondaryStat: "OPS+ 149",
    image: "https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/33039.png"
  },
  {
    id: 4,
    name: "Ronald Acuña Jr.",
    yearRange: "2018-2022",
    position: "RF",
    homeRuns: 41,
    war: 6.8,
    team: "Braves",
    secondaryStat: "SB 37",
    image: "https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/35119.png"
  },
  {
    id: 5,
    name: "Bryce Harper",
    yearRange: "2017-2021",
    position: "RF",
    homeRuns: 35,
    war: 6.2,
    team: "Phillies",
    secondaryStat: "OPS+ 147",
    image: "https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/30951.png"
  }
];

// Get today's player (cycles through the list based on date)
export const getTodaysPlayer = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const playerIndex = dayOfYear % players.length;
  return players[playerIndex];
};