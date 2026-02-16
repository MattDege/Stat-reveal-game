import React, { useState, useEffect } from 'react';
import './App.css';
import { fetchAllPlayers, getDailyPlayer } from './mlbApi';

function App() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [mysteryPlayer, setMysteryPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Game state
  const [currentClue, setCurrentClue] = useState(1);
  const [guesses, setGuesses] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [score, setScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [streak, setStreak] = useState(0);

  const scoreMap = {
    1: 100,
    2: 75,
    3: 50,
    4: 25,
    5: 10
  };

  // Get today's date string for localStorage key
  const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  };

  const getYesterdayKey = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
  };

  const updateStreak = (won) => {
    const currentStreak = parseInt(localStorage.getItem('streak') || '0');
    const lastPlayedDate = localStorage.getItem('lastPlayedDate');
    const todayKey = getTodayKey();
    const yesterdayKey = getYesterdayKey();
    
    let newStreak = 0;
    
    if (won) {
      // If last played yesterday, increment streak
      if (lastPlayedDate === yesterdayKey) {
        newStreak = currentStreak + 1;
      } 
      // If first time playing or missed days, start new streak
      else if (!lastPlayedDate || lastPlayedDate !== todayKey) {
        newStreak = 1;
      }
      // If already played today, keep current streak
      else {
        newStreak = currentStreak;
      }
    } else {
      // Lost - reset streak to 0
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
        setGameWon(true);
        setScore(gameData.score);
        setGuesses(gameData.guesses);
        setCurrentClue(gameData.currentClue);
      }
      
      setLoading(false);
    };
    
    loadPlayers();
  }, []);

  // Filter players as user types
  useEffect(() => {
    if (inputValue.length > 0 && allPlayers.length > 0) {
      const matches = allPlayers.filter(player =>
        player.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredPlayers(matches);
      setShowSuggestions(true);
    } else {
      setFilteredPlayers([]);
      setShowSuggestions(false);
    }
  }, [inputValue, allPlayers]);

  const handleGuess = (playerName = inputValue) => {
    if (!playerName || gameWon || !mysteryPlayer || gameComplete) return;

    if (playerName === mysteryPlayer.name) {
      const finalScore = scoreMap[currentClue] || 10;
      setGameWon(true);
      setScore(finalScore);
      setGameComplete(true);
      updateStreak(true);
      
      // Save to localStorage
      const todayKey = getTodayKey();
      localStorage.setItem(`game_${todayKey}`, JSON.stringify({
        score: finalScore,
        guesses: guesses,
        currentClue: currentClue,
        completed: true
      }));
      
    } else {
      const newGuesses = [...guesses, playerName];
      setGuesses(newGuesses);
      
      // Auto-reveal after 6 wrong guesses
      if (newGuesses.length >= 6) {
        setGameWon(true);
        setScore(0);
        setGameComplete(true);
        updateStreak(false);
        
        // Save to localStorage
        const todayKey = getTodayKey();
        localStorage.setItem(`game_${todayKey}`, JSON.stringify({
          score: 0,
          guesses: newGuesses,
          currentClue: currentClue + 1,
          completed: true
        }));
      } else {
        setCurrentClue(currentClue + 1);
      }
      
      setInputValue('');
      setShowSuggestions(false);
    }
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

  const handleShare = () => {
    // Generate share text
    const emoji = score > 0 ? '🟩' : '🟥';
    const wrongGuesses = '⬜'.repeat(guesses.length);
    const shareText = `⚾ Stat Reveal Game ${score}/100
Streak: ${streak} 🔥

${emoji}${wrongGuesses}

Play at: ${window.location.href}`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      // Show success feedback
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
        {gameWon && (
          <div className={`score-banner ${score === 0 ? 'game-over' : ''}`}>
            {score > 0 ? `🎉 Correct! Score: ${score} points` : '😔 Game Over! Better luck tomorrow!'}
          </div>
        )}

        {guesses.length > 0 && (
          <div className="strikeout-counter">
            Wrong guesses: {guesses.map((g, i) => <span key={i}>⚾🚫 {g}</span>)}
          </div>
        )}

        <div className="clue-grid">
          <div className="clue-card">
            <div className="clue-label">Peak Year</div>
            <div className="clue-value">{mysteryPlayer.peakYear}</div>
          </div>

          <div className="clue-card">
            <div className="clue-label">Position</div>
            <div className="clue-value">{mysteryPlayer.position}</div>
          </div>

          <div className="clue-card">
            <div className="clue-label">Peak Home Runs</div>
            <div className="clue-value">{mysteryPlayer.peakHomeRuns} HR</div>
          </div>

          {currentClue >= 2 && (
            <div className="clue-card revealed">
              <div className="clue-label">League</div>
              <div className="clue-value">{mysteryPlayer.league}</div>
            </div>
          )}

          {currentClue >= 3 && (
            <div className="clue-card revealed">
              <div className="clue-label">OPS+</div>
              <div className="clue-value">{mysteryPlayer.opsPlus}</div>
            </div>
          )}

          {currentClue >= 4 && (
            <div className="clue-card revealed">
              <div className="clue-label">Team</div>
              <div className="clue-value">{mysteryPlayer.team}</div>
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
                  {filteredPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="suggestion-item"
                      onClick={() => selectPlayer(player.name)}
                    >
                      {player.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button onClick={() => handleGuess()} className="guess-button">
              Submit Guess
            </button>
          </div>
        )}

        {gameComplete && (
          <div className="win-screen">
            <img src={mysteryPlayer.image} alt={mysteryPlayer.name} className="player-image" />
            <h2>{mysteryPlayer.name}</h2>
            <p>{mysteryPlayer.team} • {mysteryPlayer.position}</p>
            
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