import { useState, useEffect } from 'react';
import './App.css';
import { fetchAllPlayers, getDailyPlayer, getUniquePlayerNames, checkGuess } from './mlbApi';

// ET date utilities - outside component to avoid dependency issues
const getETDate = (date) => {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const isDST = date.getTimezoneOffset() < stdOffset;
  const etOffset = isDST ? -4 : -5;
  return new Date(date.getTime() + (etOffset * 60 * 60 * 1000));
};

const getTodayKey = () => {
  const etDate = getETDate(new Date());
  return `${etDate.getUTCFullYear()}-${etDate.getUTCMonth() + 1}-${etDate.getUTCDate()}`;
};

const getYesterdayKey = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const etDate = getETDate(yesterday);
  return `${etDate.getUTCFullYear()}-${etDate.getUTCMonth() + 1}-${etDate.getUTCDate()}`;
};

const cleanOldKeys = () => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('game_')) {
      localStorage.removeItem(key);
    }
  });
};

function App() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [uniqueNames, setUniqueNames] = useState([]);
  const [mysteryPlayer, setMysteryPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Game state
  const [currentClue, setCurrentClue] = useState(1);
  const [guesses, setGuesses] = useState([]);
  const [hintsRemaining, setHintsRemaining] = useState(2);
  const [inputValue, setInputValue] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [duplicateError, setDuplicateError] = useState(false);
  const [showGiveUpModal, setShowGiveUpModal] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const updateStreak = (won) => {
    const currentStreak = parseInt(localStorage.getItem('streak') || '0');
    const lastPlayedDate = localStorage.getItem('lastPlayedDate');
    const todayKey = getTodayKey();
    const yesterdayKey = getYesterdayKey();
    
    let newStreak = 0;
    
    if (won) {
      if (lastPlayedDate === yesterdayKey) {
        newStreak = currentStreak + 1;
      } else if (!lastPlayedDate || lastPlayedDate !== todayKey) {
        newStreak = 1;
      } else {
        newStreak = currentStreak;
      }
    } else {
      newStreak = 0;
    }
    
    localStorage.setItem('streak', newStreak.toString());
    localStorage.setItem('lastPlayedDate', todayKey);
    setStreak(newStreak);
  };

  // Load players and check if today's puzzle is already completed
  useEffect(() => {
    const loadPlayers = async () => {
      setLoading(true);

      // Clean up old UTC-based keys once per user
      if (!localStorage.getItem('cleanedV2')) {
        cleanOldKeys();
        localStorage.setItem('cleanedV2', 'true');
      }

      const players = await fetchAllPlayers();
      setAllPlayers(players);
      
      const names = getUniquePlayerNames(players);
      setUniqueNames(names);
      
      const todaysPlayer = getDailyPlayer(players);
      setMysteryPlayer(todaysPlayer);
      
      const currentStreak = parseInt(localStorage.getItem('streak') || '0');
      setStreak(currentStreak);
      
      const todayKey = getTodayKey();
      const savedGame = localStorage.getItem(`game_${todayKey}`);
      
      if (savedGame) {
        const gameData = JSON.parse(savedGame);
        setGameComplete(true);
        setGameWon(gameData.won);
        setGuesses(gameData.guesses);
        setCurrentClue(gameData.currentClue);
        setHintsRemaining(gameData.hintsRemaining || 0);
      }
      
      setLoading(false);
    };
    
    loadPlayers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show How to Play on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setShowHowToPlay(true);
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  // Filter players as user types
  useEffect(() => {
    if (inputValue.length > 0 && uniqueNames.length > 0) {
      const matches = uniqueNames.filter(name =>
        name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredPlayers(matches);
      setShowSuggestions(true);
    } else {
      setFilteredPlayers([]);
      setShowSuggestions(false);
    }
  }, [inputValue, uniqueNames]);

  const handleGuess = (playerName = inputValue) => {
    if (!playerName || gameComplete || !mysteryPlayer) return;

    // Check if already guessed this player
    if (guesses.includes(playerName)) {
      setDuplicateError(true);
      setTimeout(() => setDuplicateError(false), 2000);
      setInputValue('');
      return;
    }

    setDuplicateError(false);

    const isCorrect = checkGuess(playerName, mysteryPlayer, allPlayers);

    if (isCorrect) {
      const winningGuesses = [...guesses, playerName];
      setGuesses(winningGuesses);
      setGameWon(true);
      setGameComplete(true);
      updateStreak(true);
      
      const todayKey = getTodayKey();
      localStorage.setItem(`game_${todayKey}`, JSON.stringify({
        won: true,
        guesses: winningGuesses,
        currentClue: currentClue,
        hintsRemaining: hintsRemaining,
        completed: true
      }));
      
    } else {
      const newGuesses = [...guesses, playerName];
      setGuesses(newGuesses);
      
      if (newGuesses.length >= 10) {
        setGameWon(false);
        setGameComplete(true);
        updateStreak(false);
        
        const todayKey = getTodayKey();
        localStorage.setItem(`game_${todayKey}`, JSON.stringify({
          won: false,
          guesses: newGuesses,
          currentClue: currentClue + 1,
          hintsRemaining: hintsRemaining,
          completed: true
        }));
      } else {
        setCurrentClue(currentClue + 1);
      }
      
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleUseHint = () => {
    if (hintsRemaining <= 0 || gameComplete || currentClue >= 9) return;
    setCurrentClue(currentClue + 1);
    setHintsRemaining(hintsRemaining - 1);
  };

  const selectPlayer = (playerName) => {
    setInputValue(playerName);
    setShowSuggestions(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleGuess();
    }
  };

  const handleForfeit = () => {
    setShowGiveUpModal(true);
  };

  const confirmGiveUp = () => {
    setShowGiveUpModal(false);
    setGameWon(false);
    setGameComplete(true);
    updateStreak(false);
    
    const todayKey = getTodayKey();
    localStorage.setItem(`game_${todayKey}`, JSON.stringify({
      won: false,
      guesses: guesses,
      currentClue: currentClue,
      hintsRemaining: hintsRemaining,
      completed: true
    }));
  };

  const cancelGiveUp = () => {
    setShowGiveUpModal(false);
  };

  const handleShare = () => {
    const etNow = getETDate(new Date());
    const etStart = new Date(Date.UTC(etNow.getUTCFullYear(), 0, 0));
    const dayOfYear = Math.floor((etNow - etStart) / (1000 * 60 * 60 * 24));
    const emoji = gameWon ? '🟩' : '🟥';
    const hintsUsed = 2 - hintsRemaining;

    const shareText = `⚾ Stat Reveal Game
Day ${dayOfYear} | Streak: ${streak} 🔥

${gameWon ? `✅ Solved in ${guesses.length}/10` : '❌ Failed'}
${emoji}${'⬜'.repeat(Math.max(0, guesses.length - 1))}${'⬜'.repeat(Math.max(0, 9 - guesses.length))}
${hintsUsed > 0 ? `💡 Hints used: ${hintsUsed}` : ''}

Play at: ${window.location.href}`;

    navigator.clipboard.writeText(shareText).then(() => {
      const button = document.querySelector('.share-button');
      const originalText = button.textContent;
      button.textContent = '✅ Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading-screen">
          <h2>⚾ Loading today's player...</h2>
        </div>
      </div>
    );
  }

  if (!mysteryPlayer) {
    return (
      <div className="App">
        <div className="error-screen">
          <h2>Error loading player data. Please refresh.</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="game-header">
        <h1>⚾ Stat Reveal Game</h1>
        <div className="header-right">
          <button className="how-to-button" onClick={() => setShowHowToPlay(true)}>
            ?
          </button>
          <div className="streak-counter">
            Streak: ⚾ × {streak}
          </div>
        </div>
      </header>

      <main className="game-container">
        {gameComplete && (
          <div className={`score-banner ${!gameWon ? 'game-over' : ''}`}>
            {gameWon ? `🎉 Correct! Solved in ${guesses.length}/10` : '😔 Better luck tomorrow!'}
          </div>
        )}

        {guesses.length > 0 && !gameWon && (
          <div className="strikeout-counter">
            Wrong guesses ({guesses.length}/10): {guesses.map((g, i) => <span key={i}>⚾🚫 {g}</span>)}
          </div>
        )}

        {guesses.length > 0 && gameWon && (
          <div className="strikeout-counter">
            Wrong guesses ({guesses.length - 1}/10): {guesses.slice(0, -1).map((g, i) => <span key={i}>⚾🚫 {g}</span>)}
          </div>
        )}

        {duplicateError && (
          <div className="duplicate-error">
            ⚠️ You already guessed this player!
          </div>
        )}

        {/* CLUE GRID - 12 TOTAL CLUES */}
        <div className="clue-grid">
          <div className="clue-card">
            <div className="clue-label">Year</div>
            <div className="clue-value">{mysteryPlayer.year}</div>
          </div>

          <div className="clue-card">
            <div className="clue-label">Position Group</div>
            <div className="clue-value">{mysteryPlayer.positionGroup}</div>
          </div>

          <div className="clue-card">
            <div className="clue-label">Batting Average</div>
            <div className="clue-value">{mysteryPlayer.avg}</div>
          </div>

          <div className="clue-card">
            <div className="clue-label">Home Runs</div>
            <div className="clue-value">{mysteryPlayer.homeRuns} HR</div>
          </div>

          {currentClue >= 2 && (
            <div className="clue-card revealed">
              <div className="clue-label">League</div>
              <div className="clue-value">{mysteryPlayer.league}</div>
            </div>
          )}

          {currentClue >= 3 && (
            <div className="clue-card revealed">
              <div className="clue-label">Division</div>
              <div className="clue-value">{mysteryPlayer.division}</div>
            </div>
          )}

          {currentClue >= 4 && (
            <div className="clue-card revealed">
              <div className="clue-label">All-Star</div>
              <div className="clue-value">{mysteryPlayer.allStar ? 'Yes ⭐' : 'No'}</div>
            </div>
          )}

          {currentClue >= 5 && (
            <div className="clue-card revealed">
              <div className="clue-label">Team</div>
              <div className="clue-value">{mysteryPlayer.team}</div>
            </div>
          )}

          {currentClue >= 6 && (
            <div className="clue-card revealed">
              <div className="clue-label">OBP</div>
              <div className="clue-value">{mysteryPlayer.obp}</div>
            </div>
          )}

          {currentClue >= 7 && (
            <div className="clue-card revealed">
              <div className="clue-label">RBI</div>
              <div className="clue-value">{mysteryPlayer.rbi}</div>
            </div>
          )}

          {currentClue >= 8 && (
            <div className="clue-card revealed">
              <div className="clue-label">Position</div>
              <div className="clue-value">{mysteryPlayer.position}</div>
            </div>
          )}

          {currentClue >= 9 && (
            <div className="clue-card revealed">
              <div className="clue-label">Runs Scored</div>
              <div className="clue-value">{mysteryPlayer.runs} R</div>
            </div>
          )}
        </div>

        {!gameComplete && (
          <div className="guess-section">
            <div className="autocomplete-wrapper">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type player name..."
                className="player-input"
              />
              
              {showSuggestions && filteredPlayers.length > 0 && (
                <div className="suggestions-dropdown">
                  {filteredPlayers.slice(0, 10).map((name, idx) => (
                    <div
                      key={idx}
                      className="suggestion-item"
                      onClick={() => selectPlayer(name)}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="button-group">
              <button onClick={() => handleGuess()} className="guess-button">
                Submit ({10 - guesses.length} left)
              </button>
              
              <button onClick={handleForfeit} className="forfeit-button">
                Give Up
              </button>
            </div>

            <div className="hint-section">
              <div className="hint-counter">
                💡 Hints: {hintsRemaining} remaining
              </div>
              <button 
                onClick={handleUseHint} 
                className="hint-button"
                disabled={hintsRemaining <= 0 || currentClue >= 9}
              >
                Get Hint
              </button>
            </div>
          </div>
        )}

        {gameComplete && (
          <div className="win-screen">
            <img src={mysteryPlayer.image} alt={mysteryPlayer.name} className="player-image" />
            <h2>{mysteryPlayer.name}</h2>
            <p>{mysteryPlayer.year} • {mysteryPlayer.team} • {mysteryPlayer.position}</p>
            <p className="season-stats">{mysteryPlayer.avg} / {mysteryPlayer.homeRuns} HR / {mysteryPlayer.rbi} RBI / {mysteryPlayer.runs} R</p>
            
            <div className="share-section">
              <button onClick={handleShare} className="share-button">
                📋 Share Result
              </button>
              <p className="next-game-text">Come back tomorrow for a new player!</p>
            </div>
          </div>
        )}

        {/* GIVE UP CONFIRMATION MODAL */}
        {showGiveUpModal && (
          <div className="modal-overlay" onClick={cancelGiveUp}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Give Up?</h3>
              <p>Are you sure you want to give up? This will end your streak and reveal the answer.</p>
              <div className="modal-buttons">
                <button onClick={confirmGiveUp} className="modal-button confirm">
                  Yes, Give Up
                </button>
                <button onClick={cancelGiveUp} className="modal-button cancel">
                  Keep Playing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HOW TO PLAY MODAL */}
        {showHowToPlay && (
          <div className="modal-overlay" onClick={() => setShowHowToPlay(false)}>
            <div className="modal-content how-to-play" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowHowToPlay(false)}>×</button>
              <h2>⚾ How to Play</h2>
              
              <div className="how-to-section">
                <h3>🎯 Goal</h3>
                <p>Guess the MLB player's season in 10 tries or less!</p>
              </div>

              <div className="how-to-section">
                <h3>📊 Clues</h3>
                <p>You start with 4 clues:</p>
                <ul>
                  <li><strong>Year</strong> - The season</li>
                  <li><strong>Position Group</strong> - OF, INF, C, or DH</li>
                  <li><strong>Batting Average</strong></li>
                  <li><strong>Home Runs</strong></li>
                </ul>
                <p>Each wrong guess reveals a new clue!</p>
              </div>

              <div className="how-to-section">
                <h3>💡 Hints</h3>
                <p>You get <strong>2 hints</strong> per game. Use them to reveal the next clue without using a guess!</p>
              </div>

              <div className="how-to-section">
                <h3>✅ Guessing</h3>
                <p>Type the player's name - you don't need to specify the year. Just "Aaron Judge" works!</p>
              </div>

              <div className="how-to-section">
                <h3>🔥 Streaks</h3>
                <p>Win consecutive days to build your streak!</p>
              </div>

              <button className="modal-button primary" onClick={() => setShowHowToPlay(false)}>
                Let's Play!
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;