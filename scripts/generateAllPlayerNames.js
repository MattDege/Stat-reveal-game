const axios = require('axios');
const fs = require('fs');

const START_YEAR = 1990;
const END_YEAR = 2025;

async function getAllPlayerNames() {
  const allNames = new Set();
  
  console.log(`Fetching all MLB teams and rosters from ${START_YEAR} to ${END_YEAR}...`);
  
  try {
    // Get all teams first
    const teamsResponse = await axios.get('https://statsapi.mlb.com/api/v1/teams?sportId=1', {
      timeout: 10000
    });
    const teams = teamsResponse.data.teams;
    
    console.log(`Found ${teams.length} teams\n`);
    
    for (let year = START_YEAR; year <= END_YEAR; year++) {
      console.log(`Fetching ${year}...`);
      let yearTotal = 0;
      let successfulTeams = 0;
      
      for (const team of teams) {
        try {
          // Get roster for this team/year
          const url = `https://statsapi.mlb.com/api/v1/teams/${team.id}/roster?season=${year}`;
          
          const response = await axios.get(url, {
            timeout: 5000,
            headers: {
              'User-Agent': 'StatLineDaily/1.0'
            }
          });
          
          if (response.data && response.data.roster) {
            response.data.roster.forEach(player => {
              if (player.person && player.person.fullName) {
                // Only add position players (not pitchers)
                if (player.position && player.position.abbreviation !== 'P') {
                  allNames.add(player.person.fullName);
                  yearTotal++;
                }
              }
            });
            successfulTeams++;
          }
          
          // Small delay between teams
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          // Team might not have existed that year or API error, skip silently
          continue;
        }
      }
      
      console.log(`  Added ${yearTotal} players from ${year} (${successfulTeams} teams) | Total unique: ${allNames.size}`);
      
      // Delay between years
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Convert Set to sorted array
    const namesArray = Array.from(allNames).sort();
    
    console.log(`\n✅ Total unique players: ${namesArray.length}`);
    
    if (namesArray.length === 0) {
      console.error('❌ No names collected!');
      return;
    }
    
    // Save to JSON
    const output = {
      players: namesArray,
      generated: new Date().toISOString(),
      yearRange: `${START_YEAR}-${END_YEAR}`,
      count: namesArray.length,
      note: 'Position players only (excludes pitchers)'
    };
    
    fs.writeFileSync(
      'src/allPlayerNames.json',
      JSON.stringify(output, null, 2)
    );
    
    console.log('✅ Saved to src/allPlayerNames.json');
    console.log('\nFirst 30 names:');
    console.log(namesArray.slice(0, 30).join(', '));
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

getAllPlayerNames();