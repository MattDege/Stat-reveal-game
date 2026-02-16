const axios = require('axios');
const fs = require('fs');

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

const ALL_TEAM_IDS = [
  109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
  119, 120, 121, 133, 134, 135, 136, 137, 138, 139,
  140, 141, 142, 143, 144, 145, 146, 147, 158
];

const getLeague = (teamId) => {
  const AL_TEAMS = [110, 111, 116, 117, 118, 133, 136, 139, 140, 141, 142, 145, 147];
  const NL_TEAMS = [109, 112, 113, 115, 119, 120, 121, 134, 135, 137, 138, 143, 144, 146, 158];
  
  if (AL_TEAMS.includes(teamId)) return 'American League';
  if (NL_TEAMS.includes(teamId)) return 'National League';
  return 'Unknown';
};

const fetchPlayerData = async (playerId) => {
  try {
    const response = await axios.get(`${MLB_API_BASE}/people/${playerId}`, {
      params: {
        hydrate: 'stats(group=[hitting],type=[career,yearByYear]),currentTeam',
      },
    });

    const player = response.data.people[0];
    
    if (player.primaryPosition?.code === '1') return null;

    const careerStats = player.stats?.find(
      (stat) => stat.group?.displayName === 'hitting' && stat.type?.displayName === 'career'
    )?.splits?.[0]?.stat;

    const yearByYear = player.stats?.find(
      (stat) => stat.group?.displayName === 'hitting' && stat.type?.displayName === 'yearByYear'
    )?.splits || [];

    if (!careerStats || yearByYear.length === 0) return null;

    const bestSeason = yearByYear.reduce((best, current) => {
      const currentHR = current.stat?.homeRuns || 0;
      const bestHR = best.stat?.homeRuns || 0;
      return currentHR > bestHR ? current : best;
    }, yearByYear[0]);

    const peakYear = bestSeason.season;
    const peakHR = bestSeason.stat?.homeRuns || 0;

    if (peakHR < 10) return null;

    const teamId = player.currentTeam?.id;
    const league = getLeague(teamId);

    const ops = parseFloat(careerStats.ops) || 0;
    const opsPlus = ops > 0 ? Math.round((ops - 0.700) * 400 + 100) : 100;

    return {
      id: player.id,
      name: player.fullName,
      position: player.primaryPosition?.abbreviation || 'DH',
      peakYear: peakYear,
      peakHomeRuns: peakHR,
      league: league,
      opsPlus: opsPlus,
      team: player.currentTeam?.name || 'Free Agent',
      image: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${player.id}/headshot/67/current`,
    };
  } catch (error) {
    return null;
  }
};

const generatePlayerDatabase = async () => {
  console.log('🔄 Fetching ALL active MLB players...');
  
  const allPlayers = [];
  
  for (const teamId of ALL_TEAM_IDS) {
    try {
      const rosterResponse = await axios.get(`${MLB_API_BASE}/teams/${teamId}/roster`, {
        params: {
          rosterType: 'active',
        },
      });

      const roster = rosterResponse.data.roster || [];
      const playerIds = roster.map(p => p.person.id);
      
      console.log(`  Fetching ${playerIds.length} players from team ${teamId}...`);
      
      const playerPromises = playerIds.map(id => fetchPlayerData(id));
      const players = await Promise.all(playerPromises);
      
      const validPlayers = players.filter(p => p !== null);
      allPlayers.push(...validPlayers);
      
    } catch (error) {
      console.error(`Error fetching team ${teamId}`);
    }
  }

  console.log(`\n✅ Loaded ${allPlayers.length} valid MLB players!`);
  
  // Save to JSON file
  const outputPath = './src/players.json';
  fs.writeFileSync(outputPath, JSON.stringify(allPlayers, null, 2));
  
  console.log(`💾 Saved to ${outputPath}`);
  console.log(`\n📊 Stats:`);
  console.log(`   Total players: ${allPlayers.length}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
};

generatePlayerDatabase();