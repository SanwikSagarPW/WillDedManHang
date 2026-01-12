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
    
    if (currentWord.includes(letter)) {
        keyElement.classList.add('correct');
        displayWord();
        checkWin();
    } else {
        keyElement.classList.add('wrong');
        wrongGuesses++;
        updateHangman();
        livesCount.textContent = maxWrongGuesses - wrongGuesses;
        if (wrongGuesses >= maxWrongGuesses) endGame(false);
    }
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
    
    if (won) {
        totalScore += POINTS_PER_WORD;
        wordsSolved++;
        currentScoreDisplay.textContent = totalScore;
        msg.innerHTML = `<div class="win-message">🎉 Correct! Word: ${currentWord}</div>`;
    } else {
        msg.innerHTML = `<div class="lose-message">💀 Failed! Word: ${currentWord}</div>`;
    }
    
    educationalInfo.innerHTML = `<strong>Did you know?</strong> ${currentWordData.educational}`;
    gameOverModal.classList.add('active');
}

function showGameComplete() {
    gameScreen.classList.remove('active');
    document.getElementById('finalScore').textContent = totalScore;
    document.getElementById('wordsSolved').textContent = wordsSolved;
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