import React, { useState, useEffect } from 'react';
import './App.css';
import { fetchAllPlayers, getDailyPlayer, getUniquePlayerNames, checkGuess } from './mlbApi';

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

  // Get today's date string for localStorage key (UTC-based)
  const getTodayKey = () => {
    const today = new Date();
    return `${today.getUTCFullYear()}-${today.getUTCMonth() + 1}-${today.getUTCDate()}`;
  };

  const getYesterdayKey = () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return `${yesterday.getUTCFullYear()}-${yesterday.getUTCMonth() + 1}-${yesterday.getUTCDate()}`;
  };

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
      const players = await fetchAllPlayers();
      setAllPlayers(players);
      
      const names = getUniquePlayerNames(players);
      setUniqueNames(names);
      
      const todaysPlayer = getDailyPlayer(players);
      setMysteryPlayer(todaysPlayer);
      
      // Load current streak
      const currentStreak = parseInt(localStorage.getItem('streak') || '0');
      setStreak(currentStreak);
      
      // Check if already played today
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

    // Check if guess matches the mystery player's season
    const isCorrect = checkGuess(playerName, mysteryPlayer, allPlayers);

    if (isCorrect) {
      setGameWon(true);
      setGameComplete(true);
      updateStreak(true);
      
      // Save to localStorage
      const todayKey = getTodayKey();
      localStorage.setItem(`game_${todayKey}`, JSON.stringify({
        won: true,
        guesses: guesses,
        currentClue: currentClue,
        hintsRemaining: hintsRemaining,
        completed: true
      }));
      
    } else {
      const newGuesses = [...guesses, playerName];
      setGuesses(newGuesses);
      
      // Auto-reveal after 10 wrong guesses
      if (newGuesses.length >= 10) {
        setGameWon(false);
        setGameComplete(true);
        updateStreak(false);
        
        // Save to localStorage
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
    if (!window.confirm('Are you sure you want to give up?')) return;
    
    setGameWon(false);
    setGameComplete(true);
    updateStreak(false);
    
    // Save to localStorage
    const todayKey = getTodayKey();
    localStorage.setItem(`game_${todayKey}`, JSON.stringify({
      won: false,
      guesses: guesses,
      currentClue: currentClue,
      hintsRemaining: hintsRemaining,
      completed: true
    }));
  };

  const handleShare = () => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const emoji = gameWon ? '🟩' : '🟥';
    const wrongGuesses = '⬜'.repeat(guesses.length);
    const totalGuesses = gameWon ? guesses.length : 10;
    const hintsUsed = 2 - hintsRemaining;
    
    const shareText = `⚾ Stat Reveal Game
Day ${dayOfYear} | Streak: ${streak} 🔥

${gameWon ? `✅ Solved in ${totalGuesses}/10` : '❌ Failed'}
${emoji}${wrongGuesses}${'⬜'.repeat(10 - guesses.length - 1)}
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
        <div className="streak-counter">
          Streak: ⚾ × {streak}
        </div>
      </header>

      <main className="game-container">
        {gameComplete && (
          <div className={`score-banner ${!gameWon ? 'game-over' : ''}`}>
            {gameWon ? `🎉 Correct! Solved in ${guesses.length}/10` : '😔 Better luck tomorrow!'}
          </div>
        )}

        {guesses.length > 0 && (
          <div className="strikeout-counter">
            Wrong guesses ({guesses.length}/10): {guesses.map((g, i) => <span key={i}>⚾🚫 {g}</span>)}
          </div>
        )}

        {/* CLUE GRID - 12 TOTAL CLUES */}
        <div className="clue-grid">
          {/* Always visible - 4 clues */}
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

          {/* Progressive reveals - 8 more clues */}
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

            {/* HINT SYSTEM */}
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
      </main>
    </div>
  );
}

export default App;