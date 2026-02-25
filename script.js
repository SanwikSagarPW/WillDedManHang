// ============================================
// ANALYTICS SETUP
// ============================================
const analytics = new AnalyticsManager();
let sessionStartTime = 0;
let roundStartTime = 0;
let currentLevelId = null;
let totalGuesses = 0;
let correctGuesses = 0;
let incorrectGuesses = 0;

// Game State
let currentWord = '';
let currentWordData = null;
let guessedLetters = [];
let wrongGuesses = 0;
const maxWrongGuesses = 6;
let gameActive = false;

// Scoring
let currentRound = 0;
let totalScore = 0;
let wordsSolved = 0;
let startTime = null;
let timerInterval = null;
const POINTS_PER_WORD = 10;
const TIME_BONUS = 10;
const TIME_LIMIT_FOR_BONUS = 300; 
const MAX_ROUNDS = 10;

// Audio
const bgMusic = document.getElementById('bgMusic');
let audioEnabled = false;

// Word Bank (Fallback)
let wordBank = [
    { word: 'PYTHON', category: 'Programming', hint: 'Snake-named language', educational: 'Great for data science.' },
    { word: 'GALAXY', category: 'Science', hint: 'System of stars', educational: 'The Milky Way is our galaxy.' }
];

// Hangman body parts
const bodyParts = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];

// DOM Elements
const homeScreen = document.getElementById('homeScreen');
const gameScreen = document.getElementById('gameScreen');
const playBtn = document.getElementById('playBtn');
const backBtn = document.getElementById('backBtn');
const restartBtn = document.getElementById('restartBtn');
const skipBtn = document.getElementById('skipBtn');
const categorySelect = document.getElementById('categorySelect');
const difficultySelect = document.getElementById('difficultySelect');
const wordDisplay = document.getElementById('wordDisplay');
const keyboard = document.getElementById('keyboard');
const livesCount = document.getElementById('livesCount');
const currentScoreDisplay = document.getElementById('currentScore');
const currentRoundDisplay = document.getElementById('currentRound');
const timerDisplay = document.getElementById('timer');
const categoryDisplay = document.getElementById('categoryDisplay');
const hintDisplay = document.getElementById('hintDisplay');
const hintBtn = document.getElementById('hintBtn');
const educationalInfo = document.getElementById('educationalInfo');
const howToPlayModal = document.getElementById('howToPlayModal');
const gameOverModal = document.getElementById('gameOverModal');
const gameCompleteModal = document.getElementById('gameCompleteModal');

// Load words from JSON (Optional)
async function loadWords(category, difficulty) {
    try {
        const fileName = `words/${category}-${difficulty}.json`;
        const response = await fetch(fileName);
        const data = await response.json();
        wordBank = data.words;
        console.log(`Loaded ${fileName}`);
    } catch (error) {
        console.log('Using fallback words');
    }
}

// Initialize Keyboard
function createKeyboard() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    keyboard.innerHTML = '';
    letters.forEach(letter => {
        const key = document.createElement('button');
        key.className = 'key';
        key.textContent = letter;
        key.addEventListener('click', () => handleGuess(letter, key));
        keyboard.appendChild(key);
    });
}

// Start New Game
function startNewGame() {
    currentRound = 0;
    totalScore = 0;
    wordsSolved = 0;
    currentScoreDisplay.textContent = totalScore;
    
    const cat = categorySelect.value;
    const diff = difficultySelect.value;
    
    // Initialize Analytics for this game session
    const sessionId = 'session_' + Date.now();
    analytics.initialize('deadhang_game', sessionId);
    sessionStartTime = Date.now();
    console.log('[Analytics] Game session started:', sessionId);
    
    // Track game metadata
    analytics.addRawMetric('category', cat);
    analytics.addRawMetric('difficulty', diff);
    analytics.addRawMetric('max_rounds', MAX_ROUNDS);
    
    loadWords(cat, diff).then(() => {
        homeScreen.classList.remove('active');
        gameScreen.classList.add('active');
        startNewRound();
    });
}

// Start New Round
function startNewRound() {
    if (currentRound >= MAX_ROUNDS) {
        showGameComplete();
        return;
    }
    
    currentRound++;
    // Cycle through words, loop if not enough
    const index = (currentRound - 1) % wordBank.length;
    currentWordData = wordBank[index];
    currentWord = currentWordData.word.toUpperCase();
    
    guessedLetters = [];
    wrongGuesses = 0;
    gameActive = true;
    
    // Start Analytics Level Tracking
    currentLevelId = 'round_' + currentRound + '_' + currentWord.toLowerCase();
    analytics.startLevel(currentLevelId);
    roundStartTime = Date.now();
    totalGuesses = 0;
    correctGuesses = 0;
    incorrectGuesses = 0;
    
    // Reset Timer
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
    
    // Update UI
    currentRoundDisplay.textContent = currentRound;
    livesCount.textContent = maxWrongGuesses;
    categoryDisplay.textContent = currentWordData.category;
    hintDisplay.textContent = '';
    
    createKeyboard();
    displayWord();
    resetHangman();
}

function updateTimer() {
    if (!gameActive) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function displayWord() {
    wordDisplay.innerHTML = '';
    for (let letter of currentWord) {
        const box = document.createElement('div');
        box.className = 'letter-box';
        box.textContent = guessedLetters.includes(letter) ? letter : '';
        wordDisplay.appendChild(box);
    }
}

function handleGuess(letter, keyElement) {
    if (!gameActive || keyElement.classList.contains('used')) return;
    
    keyElement.classList.add('used');
    guessedLetters.push(letter);
    totalGuesses++;
    
    const isCorrect = currentWord.includes(letter);
    const timeTaken = Date.now() - roundStartTime;
    
    if (isCorrect) {
        keyElement.classList.add('correct');
        correctGuesses++;
        
        // Track correct guess
        analytics.recordTask(
            currentLevelId,
            'guess_' + totalGuesses + '_' + letter,
            'Guessed letter: ' + letter,
            'correct',
            'correct',
            timeTaken,
            1  // Small XP for correct letter
        );
        
        displayWord();
        checkWin();
    } else {
        keyElement.classList.add('wrong');
        wrongGuesses++;
        incorrectGuesses++;
        
        // Track wrong guess
        analytics.recordTask(
            currentLevelId,
            'guess_' + totalGuesses + '_' + letter,
            'Guessed letter: ' + letter,
            'correct',
            'wrong',
            timeTaken,
            0
        );
        
        updateHangman();
        livesCount.textContent = maxWrongGuesses - wrongGuesses;
        if (wrongGuesses >= maxWrongGuesses) endGame(false);
    }
    
    // Track guess metrics
    analytics.addRawMetric('total_guesses_round_' + currentRound, totalGuesses);
    analytics.addRawMetric('correct_guesses_round_' + currentRound, correctGuesses);
    analytics.addRawMetric('wrong_guesses_round_' + currentRound, incorrectGuesses);
}

function updateHangman() {
    if (wrongGuesses <= bodyParts.length) {
        document.getElementById(bodyParts[wrongGuesses - 1]).classList.remove('hidden');
        document.getElementById(bodyParts[wrongGuesses - 1]).classList.add('show');
    }
}

function resetHangman() {
    bodyParts.forEach(id => {
        const part = document.getElementById(id);
        part.classList.remove('show');
        part.classList.add('hidden');
    });
}

function checkWin() {
    const won = currentWord.split('').every(l => guessedLetters.includes(l));
    if (won) endGame(true);
}

function endGame(won) {
    gameActive = false;
    clearInterval(timerInterval);
    const msg = document.getElementById('gameOverMessage');
    const timeTaken = Date.now() - roundStartTime;
    
    // Calculate XP for this round
    let roundXP = 0;
    if (won) {
        totalScore += POINTS_PER_WORD;
        wordsSolved++;
        currentScoreDisplay.textContent = totalScore;
        msg.innerHTML = `<div class="win-message">🎉 Correct! Word: ${currentWord}</div>`;
        
        // XP calculation: base + time bonus + efficiency bonus
        const baseXP = 50;
        const timeBonus = Math.max(0, 30 - Math.floor(timeTaken / 1000));
        const efficiencyBonus = Math.max(0, 20 - (incorrectGuesses * 5));
        roundXP = baseXP + timeBonus + efficiencyBonus;
        
        console.log('[Analytics] Round won!', {
            timeTaken: (timeTaken / 1000).toFixed(2) + 's',
            baseXP: baseXP,
            timeBonus: timeBonus,
            efficiencyBonus: efficiencyBonus,
            totalXP: roundXP
        });
    } else {
        msg.innerHTML = `<div class="lose-message">💀 Failed! Word: ${currentWord}</div>`;
        roundXP = 5;  // Small consolation XP
        
        console.log('[Analytics] Round failed', {
            timeTaken: (timeTaken / 1000).toFixed(2) + 's',
            wrongGuesses: wrongGuesses,
            totalXP: roundXP
        });
    }
    
    // End analytics level tracking
    analytics.endLevel(currentLevelId, won, timeTaken, roundXP);
    
    // Track round metrics
    const accuracy = totalGuesses > 0 ? (correctGuesses / totalGuesses * 100).toFixed(1) : 0;
    analytics.addRawMetric('round_' + currentRound + '_accuracy', accuracy);
    analytics.addRawMetric('round_' + currentRound + '_time_seconds', (timeTaken / 1000).toFixed(2));
    analytics.addRawMetric('round_' + currentRound + '_xp', roundXP);
    analytics.addRawMetric('round_' + currentRound + '_word', currentWord);
    analytics.addRawMetric('round_' + currentRound + '_result', won ? 'won' : 'lost');
    
    educationalInfo.innerHTML = `<strong>Did you know?</strong> ${currentWordData.educational}`;
    gameOverModal.classList.add('active');
}

function showGameComplete() {
    gameScreen.classList.remove('active');
    document.getElementById('finalScore').textContent = totalScore;
    document.getElementById('wordsSolved').textContent = wordsSolved;
    
    // Calculate final game metrics
    const totalTime = Date.now() - sessionStartTime;
    const accuracy = MAX_ROUNDS > 0 ? ((wordsSolved / MAX_ROUNDS) * 100).toFixed(1) : 0;
    
    // Update accuracy display
    document.getElementById('accuracy').textContent = accuracy + '%';
    
    // Track final game metrics
    analytics.addRawMetric('total_score', totalScore);
    analytics.addRawMetric('words_solved', wordsSolved);
    analytics.addRawMetric('words_failed', MAX_ROUNDS - wordsSolved);
    analytics.addRawMetric('overall_accuracy', accuracy);
    analytics.addRawMetric('total_time_seconds', (totalTime / 1000).toFixed(2));
    analytics.addRawMetric('game_completed', true);
    
    console.log('[Analytics] Game Complete!', {
        totalScore: totalScore,
        wordsSolved: wordsSolved,
        accuracy: accuracy + '%',
        totalTime: (totalTime / 1000).toFixed(2) + 's'
    });
    
    // Log full report before submission
    console.log('[Analytics] Full Report:', analytics.getReportData());
    
    // Submit analytics report
    analytics.submitReport();
    
    gameCompleteModal.classList.add('active');
}

// Event Listeners
playBtn.addEventListener('click', startNewGame);
document.getElementById('howToPlayBtn').addEventListener('click', () => howToPlayModal.classList.add('active'));
document.querySelector('.close-btn').addEventListener('click', () => howToPlayModal.classList.remove('active'));
backBtn.addEventListener('click', () => {
    gameScreen.classList.remove('active');
    homeScreen.classList.add('active');
    gameActive = false;
    clearInterval(timerInterval);
});
restartBtn.addEventListener('click', startNewGame);
skipBtn.addEventListener('click', () => { if(gameActive) endGame(false); });
document.getElementById('nextWordBtn').addEventListener('click', () => {
    gameOverModal.classList.remove('active');
    startNewRound();
});
document.getElementById('playNewGameBtn').addEventListener('click', () => {
    gameCompleteModal.classList.remove('active');
    startNewGame();
});
document.getElementById('homeFromCompleteBtn').addEventListener('click', () => {
    gameCompleteModal.classList.remove('active');
    homeScreen.classList.add('active');
});

hintBtn.addEventListener('click', () => {
    if(!gameActive) return;
    hintDisplay.textContent = currentWordData.hint;
});

audioBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    if(audioEnabled) {
        bgMusic.play().catch(e => {});
        audioBtn.classList.remove('muted');
        audioBtn.querySelector('.audio-icon').textContent = '🔊';
    } else {
        bgMusic.pause();
        audioBtn.classList.add('muted');
        audioBtn.querySelector('.audio-icon').textContent = '🔇';
    }
});

// Track incomplete sessions when user leaves
window.addEventListener('beforeunload', () => {
    if (currentLevelId && gameActive) {
        const timeTaken = Date.now() - roundStartTime;
        analytics.endLevel(currentLevelId, false, timeTaken, 0);
        analytics.addRawMetric('session_incomplete', true);
        analytics.submitReport();
        console.log('[Analytics] Session ended (incomplete)');
    }
});