import axios from 'axios';
import fs from 'fs';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const START_YEAR = 1990;
const END_YEAR = 2025;

// Normalize names - remove accents for deduplication
const normalizeString = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// Team ID to Division mapping
const TEAM_DIVISIONS = {
  110: { league: 'American League', division: 'AL East', team: 'Baltimore Orioles' },
  111: { league: 'American League', division: 'AL East', team: 'Boston Red Sox' },
  147: { league: 'American League', division: 'AL East', team: 'New York Yankees' },
  139: { league: 'American League', division: 'AL East', team: 'Tampa Bay Rays' },
  141: { league: 'American League', division: 'AL East', team: 'Toronto Blue Jays' },
  145: { league: 'American League', division: 'AL Central', team: 'Chicago White Sox' },
  114: { league: 'American League', division: 'AL Central', team: 'Cleveland Guardians' },
  116: { league: 'American League', division: 'AL Central', team: 'Detroit Tigers' },
  118: { league: 'American League', division: 'AL Central', team: 'Kansas City Royals' },
  142: { league: 'American League', division: 'AL Central', team: 'Minnesota Twins' },
  117: { league: 'American League', division: 'AL West', team: 'Houston Astros' },
  108: { league: 'American League', division: 'AL West', team: 'Los Angeles Angels' },
  133: { league: 'American League', division: 'AL West', team: 'Oakland Athletics' },
  136: { league: 'American League', division: 'AL West', team: 'Seattle Mariners' },
  140: { league: 'American League', division: 'AL West', team: 'Texas Rangers' },
  144: { league: 'National League', division: 'NL East', team: 'Atlanta Braves' },
  146: { league: 'National League', division: 'NL East', team: 'Miami Marlins' },
  121: { league: 'National League', division: 'NL East', team: 'New York Mets' },
  143: { league: 'National League', division: 'NL East', team: 'Philadelphia Phillies' },
  120: { league: 'National League', division: 'NL East', team: 'Washington Nationals' },
  112: { league: 'National League', division: 'NL Central', team: 'Chicago Cubs' },
  113: { league: 'National League', division: 'NL Central', team: 'Cincinnati Reds' },
  158: { league: 'National League', division: 'NL Central', team: 'Milwaukee Brewers' },
  134: { league: 'National League', division: 'NL Central', team: 'Pittsburgh Pirates' },
  138: { league: 'National League', division: 'NL Central', team: 'St. Louis Cardinals' },
  109: { league: 'National League', division: 'NL West', team: 'Arizona Diamondbacks' },
  115: { league: 'National League', division: 'NL West', team: 'Colorado Rockies' },
  119: { league: 'National League', division: 'NL West', team: 'Los Angeles Dodgers' },
  135: { league: 'National League', division: 'NL West', team: 'San Diego Padres' },
  137: { league: 'National League', division: 'NL West', team: 'San Francisco Giants' },
};

const getPositionGroup = (position) => {
  const pos = position?.toUpperCase();
  if (['LF', 'CF', 'RF', 'OF'].includes(pos)) return 'OF';
  if (['1B', '2B', '3B', 'SS'].includes(pos)) return 'INF';
  if (pos === 'C') return 'C';
  if (pos === 'DH') return 'DH';
  return 'UTL';
};

// Cache All-Star rosters by year
const allStarCache = {};

// Check if player was an All-Star in given year
const isAllStar = async (playerId, year) => {
  if (!allStarCache[year]) {
    try {
      const response = await axios.get(`${MLB_API_BASE}/schedule`, {
        params: {
          sportId: 1,
          season: year,
          gameType: 'A',
        },
      });

      const allStarGame = response.data.dates?.[0]?.games?.[0];
      
      if (allStarGame) {
        const gameId = allStarGame.gamePk;
        const rosterResponse = await axios.get(`${MLB_API_BASE}/game/${gameId}/boxscore`);
        
        const allStarPlayerIds = new Set();
        const teams = rosterResponse.data.teams;
        
        ['away', 'home'].forEach(side => {
          const players = teams[side]?.players || {};
          Object.values(players).forEach(player => {
            if (player.person?.id) {
              allStarPlayerIds.add(player.person.id);
            }
          });
        });
        
        allStarCache[year] = allStarPlayerIds;
        console.log(`      Cached ${allStarPlayerIds.size} All-Stars for ${year}`);
      } else {
        allStarCache[year] = new Set();
      }
    } catch (error) {
      console.log(`      No All-Star data for ${year}`);
      allStarCache[year] = new Set();
    }
  }
  
  return allStarCache[year].has(playerId);
};

// Fetch season stats for a given year
const fetchSeasonStats = async (year) => {
  try {
    console.log(`  Fetching ${year} season leaders...`);
    
    const response = await axios.get(`${MLB_API_BASE}/stats/leaders`, {
      params: {
        leaderCategories: 'homeRuns',
        season: year,
        sportId: 1,
        limit: 500,
      },
    });

    const leaders = response.data?.leagueLeaders?.[0]?.leaders || [];
    console.log(`    Found ${leaders.length} home run leaders`);

    const players = [];

    for (const leader of leaders) {
      const player = leader.person;
      const teamId = leader.team?.id;
      
      try {
        const playerStatsResponse = await axios.get(`${MLB_API_BASE}/people/${player.id}`, {
          params: {
            hydrate: `stats(group=hitting,type=season,season=${year})`,
          },
        });

        const playerData = playerStatsResponse.data.people[0];
        const stats = playerData.stats?.[0]?.splits?.[0]?.stat;
        
        if (!stats || !stats.plateAppearances || stats.plateAppearances < 300) continue;
        if (!stats.homeRuns || stats.homeRuns < 10) continue;

        const teamInfo = TEAM_DIVISIONS[teamId];
        if (!teamInfo) continue;

        const position = playerData.primaryPosition?.abbreviation || 'DH';
        const positionGroup = getPositionGroup(position);
        const allStar = await isAllStar(player.id, year);

        players.push({
          id: `${player.id}-${year}`,
          playerId: player.id,
          name: player.fullName,
          normalizedName: normalizeString(player.fullName),
          year: year,
          position: position,
          positionGroup: positionGroup,
          avg: parseFloat(stats.avg || 0).toFixed(3).replace(/^0/, ''),
          homeRuns: stats.homeRuns || 0,
          obp: parseFloat(stats.obp || 0).toFixed(3).replace(/^0/, ''),
          rbi: stats.rbi || 0,
          runs: stats.runs || 0,
          stolenBases: stats.stolenBases || 0,
          allStar: allStar,
          league: teamInfo.league,
          division: teamInfo.division,
          team: teamInfo.team,
          plateAppearances: stats.plateAppearances,
          image: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${player.id}/headshot/67/current`,
        });
      } catch (err) {
        continue;
      }
    }

    console.log(`    ✅ Processed ${players.length} quality seasons from ${year}`);
    return players;
  } catch (error) {
    console.error(`    ❌ Error fetching ${year}:`, error.message);
    return [];
  }
};

const generateSeasonalPlayers = async () => {
  console.log(`🔄 Fetching MLB seasons ${START_YEAR}-${END_YEAR}...\n`);
  
  const allPlayers = [];
  
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const yearPlayers = await fetchSeasonStats(year);
    allPlayers.push(...yearPlayers);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Total quality seasons found: ${allPlayers.length}`);
  
  const outputPath = './src/seasonalPlayers.json';
  fs.writeFileSync(outputPath, JSON.stringify(allPlayers, null, 2));
  
  console.log(`💾 Saved to ${outputPath}`);
  console.log(`📊 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  const allStarCount = allPlayers.filter(p => p.allStar).length;
  console.log(`⭐ All-Stars: ${allStarCount} / ${allPlayers.length} (${((allStarCount/allPlayers.length)*100).toFixed(1)}%)`);
  
  // Check for duplicate names
  const nameMap = new Map();
  allPlayers.forEach(p => {
    const normalized = p.normalizedName;
    nameMap.set(normalized, (nameMap.get(normalized) || 0) + 1);
  });
  const uniqueNames = nameMap.size;
  console.log(`👥 Unique players: ${uniqueNames}`);
};

generateSeasonalPlayers();