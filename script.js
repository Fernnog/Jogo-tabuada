'use strict';

// --- Web Audio API Setup ---
let audioContext;
let audioBuffers = {};
let isAudioContextResumed = false; // Mantém para saber o estado
let soundsLoaded = false;
let isLoadingSounds = false;
let needsAudioResume = false; // Flag para indicar se precisa de interação
let firstInteractionListenerAdded = false; // Para garantir que o listener seja adicionado apenas uma vez

// --- DOM Elements ---
const gameArea = document.getElementById('game-area');
const problemBalloon = document.getElementById('problem-balloon');
const answerInput = document.getElementById('answer-input');
const feedback = document.getElementById('feedback');
const currentTableInfo = document.getElementById('current-table-info');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const livesDisplay = document.getElementById('lives-display');
const progressBar = document.getElementById('progress-bar');
const restartButton = document.getElementById('restart-button');
const keypadArea = document.getElementById('keypad-area');
const gameContainer = document.getElementById('game-container');
const phaseOverlay = document.getElementById('phase-transition-overlay');
const phaseNumber = document.getElementById('phase-transition-number');
const achievementNotification = document.getElementById('achievement-notification');
const powerUpContainer = document.getElementById('power-up-container');
const starPowerDisplay = document.getElementById('star-power-display');
const useStarButton = document.getElementById('use-star-button');
const keypadControlsContainer = document.getElementById('keypad-controls-container');
const ingameRestartButton = document.getElementById('ingame-restart-button');
const rulesModal = document.getElementById('rules-modal');
const showRulesButton = document.getElementById('show-rules-button');
const closeRulesButton = document.getElementById('close-rules-button');
// Elementos relacionados ao botão de ativar som foram REMOVIDOS

// --- URLs COMPLETAS dos sons no GitHub Pages ---
const soundUrls = {
    correct:   'https://fernnog.github.io/Jogo-tabuada/correct-choice-43861.mp3',
    incorrect: 'https://fernnog.github.io/Jogo-tabuada/error-2-36058.mp3',
    click:     'https://fernnog.github.io/Jogo-tabuada/pop-94319.mp3',
    pop:       'https://fernnog.github.io/Jogo-tabuada/bubble-pop-4-323580.mp3'
};
// --- Fim URLs ---


// --- Game State Variables, Timeouts, Config, Texts, Achievements, Power-ups ---
let currentTable = 2; let currentMultiplier = 1; let correctAnswer = 0;
let score = 0; let initialHighScore = 0; let highScore = 0; let lives = 3;
const maxLives = 3; let isGameOver = false; let isRevealingAnswer = false;
let consecutiveCorrectAnswers = 0; let collectedStars = 0; let starSpawnMultipliers = [];
const numStarsPerTable = 2;
let isGamePaused = false;
let pauseStartTime = 0;
let balloonFallEndTime = 0; let powerUpFallEndTime = 0;
let balloonRemainingTime = 0; let powerUpRemainingTime = 0;
let animationTimeout; let revealAnswerTimeout; let nextProblemTimeout;
let notificationTimeout;
let currentAnimationHandler = null; let popAnimationHandler = null;
let currentFallTimeoutId = null;
let currentPowerUpFallTimeoutId = null;
const fallDurationSeconds = 10.5;
const pointsPerCorrectAnswer = 10; const revealAnswerDelayMs = 1500;
const nextProblemDelayAfterRevealMs = 1800; const nextProblemDelayAfterCorrectMs = 400;
const phaseTransitionVisualDuration = 1900; const achievementNotificationDurationMs = 3000;
const powerUpFallDurationSeconds = 3.8;
const hourglassSpawnChance = 0.35;
const doublePointsChanceWithinBonus = 0.4;
const doublePointsFallSpeedMultiplier = 0.75;
const balloonStartYPercent = 15;
const encouragements = ["Legal!", "Show!", "Mandou bem!", "É isso aí!", "Boa!", "Demais!", "Continue assim!", "Você consegue!"];
const skyColors = ['#87CEFA', '#7bcdf5', '#6fcbf0', '#63c8eb', '#57c6e6', '#4bc4e1', '#3fc1dc', '#33c0d7'];
const balloonConfigs = [ { bg: '#ffadad', text: '#5c1e1e' }, { bg: '#a0e7ff', text: '#0d47a1' }, { bg: '#b9ffb0', text: '#1b5e20' }, { bg: '#fff59d', text: '#f57f17' }, { bg: '#ffcc80', text: '#e65100' }, { bg: '#b39ddb', text: '#311b92' }, { bg: '#f48fb1', text: '#880e4f' }, { bg: '#80cbc4', text: '#004d40' } ];
const achievements = [ { id: 'table3', name: "Tabuada do 3 Completa!", unlocked: false, check: state => state.prevTable === 3 && state.newMultiplier === 1 }, { id: 'table5', name: "Tabuada do 5 Completa!", unlocked: false, check: state => state.prevTable === 5 && state.newMultiplier === 1 }, { id: 'table7', name: "Tabuada do 7 Completa!", unlocked: false, check: state => state.prevTable === 7 && state.newMultiplier === 1 }, { id: 'consecutive5', name: "5 Respostas Seguidas!", unlocked: false, check: state => state.consecutiveCorrect >= 5 }, { id: 'consecutive10', name: "10 Respostas Seguidas!", unlocked: false, check: state => state.consecutiveCorrect >= 10 }, { id: 'score100', name: "100 Pontos!", unlocked: false, check: state => state.score >= 100 }, { id: 'score250', name: "250 Pontos!", unlocked: false, check: state => state.score >= 250 }, { id: 'score500', name: "500 Pontos!", unlocked: false, check: state => state.score >= 500 }, { id: 'beatHighScore', name: "Novo Recorde!", unlocked: false, check: state => state.score > state.initialHighScore && state.initialHighScore > 0 }, { id: 'finishGame', name: "Mestre da Tabuada!", unlocked: false, check: state => state.isVictory } ];
let unlockedAchievements = new Set();
function loadAchievements() { try { const saved = localStorage.getItem('tabuadaAchievements'); if (saved) { unlockedAchievements = new Set(JSON.parse(saved)); achievements.forEach(ach => { if (unlockedAchievements.has(ach.id)) { ach.unlocked = true; } }); console.log("Conquistas carregadas:", unlockedAchievements); } } catch (e) { console.error("Erro ao carregar conquistas:", e); unlockedAchievements = new Set(); } }
function saveAchievements() { try { localStorage.setItem('tabuadaAchievements', JSON.stringify(Array.from(unlockedAchievements))); } catch (e) { console.error("Erro ao salvar conquistas:", e); } }
function showAchievementNotification(name) { if(!achievementNotification) return; clearTimeout(notificationTimeout); achievementNotification.textContent = `🏆 ${name}`; achievementNotification.classList.add('show'); notificationTimeout = setTimeout(() => { achievementNotification.classList.remove('show'); }, achievementNotificationDurationMs); }
function checkAndUnlockAchievements(checkState) { achievements.forEach(ach => { if (!ach.unlocked && ach.check(checkState)) { ach.unlocked = true; unlockedAchievements.add(ach.id); showAchievementNotification(ach.name); saveAchievements(); console.log("Conquista desbloqueada:", ach.name); } }); }
const powerUpTypes = [ { type: 'star_collect', symbol: '⭐', color: 'var(--power-up-star)' }, { type: 'slow_fall', symbol: '⏳', value: 1.25, color: '#3d5afe' }, { type: 'double_points', symbol: '⚡', color: '#ffea00' } ];
let activePowerUpElement = null; let activePowerUpType = null; let nextFallDurationModifier = 1;
function removePowerUp(collected = false) { if (activePowerUpElement) { console.log(`Removendo Power-up ${collected ? `(${activePowerUpElement.textContent} Coletado)` : `(${activePowerUpElement.textContent} Não coletado)`}`); clearTimeout(currentPowerUpFallTimeoutId); activePowerUpElement.remove(); activePowerUpElement = null; activePowerUpType = null; powerUpRemainingTime = 0; } }
function applyPowerUpBonus(type) { const powerUp = powerUpTypes.find(p => p.type === type); if (!powerUp) return; console.log("Aplicando bônus:", powerUp.symbol, powerUp.type); if (powerUp.type === 'slow_fall') { nextFallDurationModifier = powerUp.value; } }
function setStarMultipliersForTable() { const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; for (let i = numbers.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [numbers[i], numbers[j]] = [numbers[j], numbers[i]]; } starSpawnMultipliers = numbers.slice(0, numStarsPerTable); console.log(`Multiplicadores da Estrela para Tabuada ${currentTable}: ${starSpawnMultipliers.join(', ')}`); }
function spawnPowerUp() { if(!powerUpContainer || !problemBalloon) return; if (activePowerUpElement) removePowerUp(false); if (isGameOver || isRevealingAnswer || isGamePaused || problemBalloon.style.display === 'none') return; let powerUpToSpawn = null; if (starSpawnMultipliers.includes(currentMultiplier)) { powerUpToSpawn = powerUpTypes.find(p => p.type === 'star_collect'); console.log(`Gerando Power-up: ${powerUpToSpawn.symbol} (Multiplicador ${currentMultiplier} designado)`); starSpawnMultipliers = starSpawnMultipliers.filter(m => m !== currentMultiplier); } else if (Math.random() < hourglassSpawnChance) { powerUpToSpawn = (Math.random() < doublePointsChanceWithinBonus) ? powerUpTypes.find(p => p.type === 'double_points') : powerUpTypes.find(p => p.type === 'slow_fall'); console.log("Gerando Power-up Bônus:", powerUpToSpawn.symbol); } if (!powerUpToSpawn) return; activePowerUpType = powerUpToSpawn.type; const powerUpElement = document.createElement('div'); powerUpElement.classList.add('power-up-item'); powerUpElement.textContent = powerUpToSpawn.symbol; powerUpElement.style.color = powerUpToSpawn.color || '#ffffff'; powerUpElement.style.left = `${15 + Math.random() * 70}%`; const currentPowerUpFallDuration = (activePowerUpType === 'double_points') ? powerUpFallDurationSeconds * doublePointsFallSpeedMultiplier : powerUpFallDurationSeconds; powerUpElement.style.animationDuration = `${currentPowerUpFallDuration}s`; powerUpContainer.appendChild(powerUpElement); activePowerUpElement = powerUpElement; const spawnTime = performance.now(); powerUpFallEndTime = spawnTime + (currentPowerUpFallDuration * 1000); clearTimeout(currentPowerUpFallTimeoutId); currentPowerUpFallTimeoutId = setTimeout(() => { if (activePowerUpElement === powerUpElement) removePowerUp(false); }, currentPowerUpFallDuration * 1000); console.log(`Power-up ${activePowerUpElement.textContent} spawned. Fall duration: ${currentPowerUpFallDuration.toFixed(1)}s. Fim Teórico: ${powerUpFallEndTime.toFixed(0)}`); }
function updateStarDisplay() { if(!starPowerDisplay || !useStarButton) return; starPowerDisplay.textContent = `🌟 x ${collectedStars}`; useStarButton.disabled = (collectedStars <= 0 || isGameOver || isRevealingAnswer || isGamePaused || (problemBalloon && problemBalloon.style.display === 'none')); }


// --- Funções de Pausa e Retomada ---
function pauseGame() { if (isGameOver || isRevealingAnswer || isGamePaused || (problemBalloon && problemBalloon.style.display === 'none') || (problemBalloon && problemBalloon.classList.contains('pop-animation'))) return; console.log("Pausando o jogo..."); isGamePaused = true; pauseStartTime = performance.now(); if(problemBalloon) problemBalloon.style.animationPlayState = 'paused'; clearTimeout(currentFallTimeoutId); balloonRemainingTime = Math.max(0, balloonFallEndTime - pauseStartTime); if (activePowerUpElement) { activePowerUpElement.style.animationPlayState = 'paused'; clearTimeout(currentPowerUpFallTimeoutId); powerUpRemainingTime = Math.max(0, powerUpFallEndTime - pauseStartTime); } if(keypadArea) keypadArea.style.pointerEvents = 'none'; if(useStarButton) useStarButton.disabled = true; if(ingameRestartButton) ingameRestartButton.disabled = true; if(showRulesButton) showRulesButton.disabled = true; console.log(`Pausado. Balão restante: ${balloonRemainingTime.toFixed(0)}ms, Power-up restante: ${powerUpRemainingTime.toFixed(0)}ms`); }
function resumeGame() { if (!isGamePaused || isGameOver) return; console.log("Retomando o jogo..."); if(problemBalloon) problemBalloon.style.animationPlayState = 'running'; currentFallTimeoutId = setTimeout(handleBalloonFallTimeout, balloonRemainingTime); balloonFallEndTime = performance.now() + balloonRemainingTime; if (activePowerUpElement) { activePowerUpElement.style.animationPlayState = 'running'; currentPowerUpFallTimeoutId = setTimeout(() => { if (activePowerUpElement) removePowerUp(false); }, powerUpRemainingTime); powerUpFallEndTime = performance.now() + powerUpRemainingTime; } if(keypadArea) keypadArea.style.pointerEvents = 'auto'; updateStarDisplay(); if(ingameRestartButton) ingameRestartButton.disabled = isRevealingAnswer; if(showRulesButton) showRulesButton.disabled = false; isGamePaused = false; pauseStartTime = 0; console.log("Retomado."); }


// --- Web Audio API Logic ---

// Função para tentar resumir o contexto (chamada pela interação do usuário)
async function resumeAudioContextIfNeeded() {
    if (audioContext && audioContext.state === 'suspended') {
        try {
            console.log("Attempting to resume AudioContext due to user interaction...");
            await audioContext.resume();
            console.log("AudioContext resumed successfully.");
            isAudioContextResumed = true;
            needsAudioResume = false; // Não precisa mais de interação
            // Agora que está resumido, TENTA carregar os sons se ainda não foram
            if (!soundsLoaded && !isLoadingSounds) {
                console.log("Audio resumed, now trying to load sounds...");
                loadSoundsFromUrls(); // Tenta carregar após resumir
            }
        } catch (e) {
            console.error("Failed to resume AudioContext on interaction:", e);
            // Não define isAudioContextResumed como true se falhar
        }
    } else if (audioContext && audioContext.state === 'running') {
        // Se já estava rodando, apenas certifica que o estado está correto
        // e tenta carregar os sons se não foram carregados (caso raro).
        if (!isAudioContextResumed) console.log("AudioContext already running, updating state.");
        isAudioContextResumed = true;
        needsAudioResume = false;
         if (!soundsLoaded && !isLoadingSounds) {
            console.log("AudioContext running, but sounds not loaded. Attempting load.");
            loadSoundsFromUrls();
        }
    }
}

// Listener de interação ÚNICO para resumir o áudio
function addFirstInteractionListener() {
    if (!firstInteractionListenerAdded && gameContainer) {
        const handleFirstInteraction = async (event) => {
            console.log(`First interaction detected: ${event.type} on ${event.target.id || event.target.tagName}`);
            await resumeAudioContextIfNeeded();
            // O listener é removido automaticamente com `once: true`
            firstInteractionListenerAdded = false; // Reseta para o próximo jogo
            console.log("First interaction listener was triggered and automatically removed.");
        };

        // Adiciona listeners para clique ou toque usando 'once: true'
        gameContainer.addEventListener('click', handleFirstInteraction, { once: true, capture: true });
        gameContainer.addEventListener('touchstart', handleFirstInteraction, { once: true, capture: true });
        firstInteractionListenerAdded = true;
        console.log("First interaction listener added to game container.");
    }
}


function initAudioContext() {
    // Tenta criar o contexto
    if (audioContext && audioContext.state !== 'closed') {
        console.log(`AudioContext already exists in state: ${audioContext.state}.`);
        // Verifica o estado atual
        if (audioContext.state === 'running') {
            isAudioContextResumed = true;
            needsAudioResume = false;
        } else if (audioContext.state === 'suspended') {
            isAudioContextResumed = false;
            needsAudioResume = true; // Precisa de interação
            console.log("AudioContext is suspended. Needs user interaction.");
            addFirstInteractionListener(); // Adiciona o listener que tentará resumir
        }
        return Promise.resolve(true);
    }
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        console.log("AudioContext created.");
        if (audioContext.state === 'suspended') {
            console.log("AudioContext created in suspended state. Needs user interaction.");
            isAudioContextResumed = false;
            needsAudioResume = true;
            addFirstInteractionListener(); // Adiciona o listener
        } else {
            console.log("AudioContext created in running state.");
            isAudioContextResumed = true; // Já está rodando
            needsAudioResume = false;
        }
        return Promise.resolve(true);
    } catch (e) {
        console.error("Web Audio API is not supported.", e);
        return Promise.resolve(false);
    }
}

async function fetchAndDecodeAudio(url) {
    if (!audioContext) { console.warn("AudioContext not ready for fetch/decode."); return null; }

    console.log(`Attempting to fetch: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Fetch failed for ${url}. Status: ${response.status}.`);
            throw new Error(`Fetch Error ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        // Verifica se o contexto está rodando ANTES de decodificar
        if (audioContext.state !== 'running') {
            console.warn(`AudioContext not running ('${audioContext.state}'), cannot decode: ${url}. Will retry after resume?`);
            // Retorna null, loadSoundsFromUrls pode tentar de novo mais tarde
            return null;
        }
        console.log(`Fetched ${url} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB), decoding...`);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`Decoded ${url} successfully.`);
        return audioBuffer;
    } catch (e) {
        console.error(`Error processing audio from ${url}:`, e);
        return null;
    }
}


// --- loadSoundsFromUrls ---
async function loadSoundsFromUrls() {
    // Só prossegue se o contexto existir E estiver RODANDO
    if (!audioContext || audioContext.state !== 'running' || soundsLoaded || isLoadingSounds) {
        if (!audioContext) console.warn("loadSounds called but AudioContext doesn't exist.");
        else if (audioContext.state !== 'running') console.warn(`loadSounds called but AudioContext is '${audioContext.state}'. Waiting for resume.`);
        else if (soundsLoaded) console.log("loadSounds called but sounds already loaded.");
        else if (isLoadingSounds) console.log("loadSounds called but already loading.");
        return false;
    }

    isLoadingSounds = true;
    console.log("Attempting to load sounds from URLs (Context is running)...");

    let successCount = 0;
    const keys = Object.keys(soundUrls);
    const validKeys = keys.filter(k => soundUrls[k]);
    let firstFailedUrl = null;

    // Usamos Promise.all para carregar em paralelo
    const loadPromises = validKeys.map(async (key) => {
        const buffer = await fetchAndDecodeAudio(soundUrls[key]);
        if (buffer) {
            audioBuffers[key] = buffer;
            return true; // Sucesso para esta chave
        } else {
            if (!firstFailedUrl) firstFailedUrl = soundUrls[key];
            console.warn(`Failed to load or decode sound from URL: ${soundUrls[key]}.`);
            return false; // Falha para esta chave
        }
    });

    try {
        const loadResults = await Promise.all(loadPromises);
        successCount = loadResults.filter(result => result === true).length;
    } catch (error) {
        console.error("Error during Promise.all for sound loading:", error);
        // Considera falha geral se Promise.all rejeitar
        successCount = 0;
    }


    isLoadingSounds = false;

    if (successCount === validKeys.length && successCount > 0) {
        console.log("All sounds loaded successfully from URLs.");
        soundsLoaded = true;
        return true;
    } else {
        console.warn(`Failed to load ${validKeys.length - successCount} out of ${validKeys.length} sound(s) from URLs.`);
        if (firstFailedUrl) console.error(`First failure example: ${firstFailedUrl}`);
        soundsLoaded = false;
        audioBuffers = {}; // Limpa buffers parciais
        // Não reabilita botão, pois não existe mais. Apenas loga.
        return false;
    }
}

function playSound(bufferKey) {
    // Verifica se os sons estão carregados E se o contexto está rodando
    if (!soundsLoaded || !audioContext || audioContext.state !== 'running') {
         if (!soundsLoaded && audioContext?.state === 'running') console.warn(`playSound(${bufferKey}) ignored: Sounds not loaded yet.`);
         else if (!soundsLoaded) console.warn(`playSound(${bufferKey}) ignored: Sounds not loaded and context state is ${audioContext?.state}.`);
         else console.warn(`playSound(${bufferKey}) ignored: AudioContext not running (${audioContext?.state}).`);
        return;
    }

    const buffer = audioBuffers[bufferKey];
    if (buffer) {
        try {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
        } catch (e) {
            console.error(`Error playing sound '${bufferKey}':`, e);
        }
    } else {
        // Isso pode acontecer se o carregamento falhou para este som específico
        console.warn(`Sound buffer '${bufferKey}' not found or invalid. Load failed?`);
    }
}


// --- Core Game Logic Functions ---
function setFeedback(text, emoji = '', type = '') { if(feedback) { feedback.innerHTML = `<span class="feedback-content">${emoji} ${text}</span>`; feedback.className = type; }}
function updateLivesDisplay() { if(livesDisplay) { livesDisplay.innerHTML = ''; for (let i = 0; i < maxLives; i++) livesDisplay.innerHTML += (i < lives) ? '💖' : '🖤'; }}
function updateScore(newScore) { if(!scoreDisplay || !highScoreDisplay) return; console.log(`Atualizando score: ${score} -> ${newScore}`); const previousScore = score; score = newScore; const scoreElement = scoreDisplay.querySelector('.score-value'); if(scoreElement) { scoreElement.textContent = score; if (newScore > previousScore) { scoreElement.classList.add('score-pulse-animation'); scoreElement.addEventListener('animationend', () => { scoreElement.classList.remove('score-pulse-animation'); }, { once: true }); } } else { console.error("Elemento .score-value não encontrado em #score!"); } if (score > highScore) { const wasHighScoreBeaten = highScore > 0 && initialHighScore > 0; highScore = score; const highScoreElement = highScoreDisplay.querySelector('.score-value'); if(highScoreElement) highScoreElement.textContent = highScore; try { localStorage.setItem('tabuadaHighScore', highScore); } catch (e) { console.error("Erro localStorage:", e); } if (wasHighScoreBeaten) { checkAndUnlockAchievements({ score: score, initialHighScore: initialHighScore, isVictory: isGameOver && lives > 0 }); } } checkAndUnlockAchievements({ score: score, consecutiveCorrect: consecutiveCorrectAnswers, isVictory: isGameOver && lives > 0 }); }
function updateProgressBar() { if(!progressBar) return; const progressPercent = ((currentMultiplier -1) / 10) * 100; progressBar.style.width = `${progressPercent}%`; }
function showPhaseTransition(tableNumber) { if(!phaseNumber || !phaseOverlay) return; phaseNumber.textContent = tableNumber; phaseOverlay.style.display = 'flex'; phaseOverlay.style.animation = 'none'; phaseNumber.style.animation = 'none'; void phaseOverlay.offsetWidth; phaseOverlay.style.animation = 'fadeOverlay 1.8s ease-in-out forwards'; phaseNumber.style.animation = 'popNumber 1.6s ease-out 0.1s forwards'; setTimeout(() => { if(phaseOverlay) phaseOverlay.style.display = 'none'; }, phaseTransitionVisualDuration); }
function cleanUpProblemState() { clearTimeout(currentFallTimeoutId); clearTimeout(revealAnswerTimeout); clearTimeout(nextProblemTimeout); clearTimeout(currentPowerUpFallTimeoutId); if(problemBalloon) { problemBalloon.style.animation = 'none'; problemBalloon.classList.remove('falling', 'pop-animation'); } if (currentAnimationHandler && problemBalloon) { problemBalloon.removeEventListener('animationend', currentAnimationHandler); currentAnimationHandler = null; } if (popAnimationHandler && problemBalloon) { problemBalloon.removeEventListener('animationend', popAnimationHandler); popAnimationHandler = null; } isGamePaused = false; pauseStartTime = 0; balloonRemainingTime = 0; powerUpRemainingTime = 0; if(keypadArea) keypadArea.style.pointerEvents = 'auto'; if(showRulesButton) showRulesButton.disabled = false; }

function startGame() {
    console.log("Iniciando novo jogo...");
    cleanUpProblemState();
    clearTimeout(notificationTimeout);
    isGameOver = false; isRevealingAnswer = false;
    currentTable = 2; currentMultiplier = 1; lives = maxLives; updateLivesDisplay();
    consecutiveCorrectAnswers = 0; nextFallDurationModifier = 1; collectedStars = 0;
    setStarMultipliersForTable(); updateStarDisplay();
    try { highScore = parseInt(localStorage.getItem('tabuadaHighScore') || '0'); initialHighScore = highScore; } catch (e) { console.warn("Could not parse high score:", e); highScore = 0; initialHighScore = 0; }
    loadAchievements();
    updateScore(0); // Reseta e atualiza score
    if(highScoreDisplay) highScoreDisplay.querySelector('.score-value').textContent = highScore;
    updateProgressBar();
    if(currentTableInfo) currentTableInfo.textContent = `Tabuada do: ${currentTable}`;
    setFeedback(''); // Limpa feedback inicial
    if(answerInput) { answerInput.value = ''; answerInput.disabled = false; answerInput.placeholder = "---"; }
    if(keypadControlsContainer) keypadControlsContainer.style.display = 'flex';
    if(keypadArea) { keypadArea.style.display = 'flex'; keypadArea.style.pointerEvents = 'auto'; }
    if(restartButton) restartButton.style.display = 'none';
    if(ingameRestartButton) { ingameRestartButton.style.display = 'block'; ingameRestartButton.disabled = false; }
    if(problemBalloon) problemBalloon.style.display = 'none';
    if(achievementNotification) achievementNotification.classList.remove('show');
    removePowerUp();
    if(powerUpContainer) powerUpContainer.innerHTML = '';
    if(gameArea) gameArea.style.backgroundColor = skyColors[0];
    if(phaseOverlay) phaseOverlay.style.display = 'none';
    isGamePaused = false;
    if(rulesModal) rulesModal.classList.remove('visible');
    if(rulesModal) rulesModal.style.display = 'none';
    if(showRulesButton) showRulesButton.disabled = false;
    firstInteractionListenerAdded = false; // Reseta o controle do listener de interação

    // --- LÓGICA DE SOM NO START ---
    // 1. Garante que o contexto de áudio foi inicializado (ou tenta inicializar)
    initAudioContext().then(contextExists => {
        if (contextExists) {
            // 2. Se o contexto já estiver rodando, tenta carregar os sons imediatamente
            if (audioContext.state === 'running' && !soundsLoaded && !isLoadingSounds) {
                console.log("startGame: Context running, attempting to load sounds immediately.");
                loadSoundsFromUrls();
            } else if (audioContext.state === 'suspended') {
                 console.log("startGame: Context suspended. Waiting for first interaction to load sounds.");
                 // O listener já foi adicionado por initAudioContext, se necessário
            }
        } else {
             console.warn("startGame: AudioContext could not be initialized. Sounds will not play.");
        }
    });
     // --- FIM DA LÓGICA DE SOM ---

    console.log("Jogo pronto.");
    nextProblemTimeout = setTimeout(nextProblem, 150);
}

function handleBalloonFallTimeout() {
    console.log("Fallback JS Timeout: Balloon Fall time ended.");
    // Verifica se o handler ainda é o esperado (prevenção de race condition)
    if (currentAnimationHandler === handleBalloonFallTimeout && problemBalloon) {
        problemBalloon.removeEventListener('animationend', currentAnimationHandler);
        currentAnimationHandler = null;
    }
    if (!isGameOver && !isRevealingAnswer && !isGamePaused && problemBalloon && problemBalloon.style.display !== 'none' && !problemBalloon.classList.contains('pop-animation')) {
        console.log("Timeout não respondido. Processando como erro.");
        isRevealingAnswer = true;
        if(answerInput) answerInput.disabled = true;
        if(useStarButton) useStarButton.disabled = true;
        if(ingameRestartButton) ingameRestartButton.disabled = true;
        if(showRulesButton) showRulesButton.disabled = true;
        setFeedback(`Tempo esgotado! ⏱️ A resposta era ${correctAnswer}.`, '💡', 'incorrect');
        playSound('incorrect'); lives--; updateLivesDisplay();
        console.log(`Vida perdida por timeout. Vidas restantes: ${lives}`);
        consecutiveCorrectAnswers = 0;
        if(gameContainer) gameContainer.animate([{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(0px)' }], { duration: 300, iterations: 1 });
        removePowerUp(false); clearTimeout(nextProblemTimeout);
        nextProblemTimeout = setTimeout(() => {
            if(ingameRestartButton) ingameRestartButton.disabled = false; if(showRulesButton) showRulesButton.disabled = false;
            if (lives <= 0) { gameOver("Sem vidas! 💔 Tente novamente!", false); } else { console.log("Avançando após feedback de timeout..."); advanceToNextProblemOrTable(false); }
        }, nextProblemDelayAfterRevealMs);
    } else { console.log(`Timeout ignorado (estado: isGameOver=${isGameOver}, isRevealing=${isRevealingAnswer}, isPaused=${isGamePaused}, balloonVisible=${problemBalloon?.style.display}, pop=${problemBalloon?.classList.contains('pop-animation')}).`); }
}

function handlePopAnimationEnd() {
     if(problemBalloon) { problemBalloon.style.display = 'none'; problemBalloon.classList.remove('pop-animation'); }
     // Verifica se o handler ainda é o esperado
     if (popAnimationHandler === handlePopAnimationEnd && problemBalloon) {
        problemBalloon.removeEventListener('animationend', popAnimationHandler);
        popAnimationHandler = null;
     }
     console.log("Pop animation ended.");
}

function advanceToNextProblemOrTable(wasCorrect) {
    cleanUpProblemState(); // Limpa timeouts e listeners do problema anterior ANTES de avançar
    currentMultiplier++; updateProgressBar();
    if (currentMultiplier > 10) {
        const previousTable = currentTable; currentMultiplier = 1; currentTable++; setStarMultipliersForTable();
        console.log(`Fim tabuada ${previousTable}. Iniciando transição para ${currentTable}`);
        checkAndUnlockAchievements({ prevTable: previousTable, newMultiplier: currentMultiplier, score: score, consecutiveCorrect: consecutiveCorrectAnswers, initialHighScore: initialHighScore, isVictory: false });
        if (currentTable <= 9) {
            showPhaseTransition(currentTable);
            nextProblemTimeout = setTimeout(() => {
                if(currentTableInfo) currentTableInfo.textContent = `Tabuada do: ${currentTable}`;
                if(gameArea) gameArea.style.backgroundColor = skyColors[Math.min(currentTable - 2, skyColors.length - 1)];
                if(progressBar) progressBar.style.width = `0%`;
                setFeedback(`Tabuada do ${currentTable}!`, '🚀', 'transition');
                nextProblem();
            }, phaseTransitionVisualDuration);
        } else {
             checkAndUnlockAchievements({ isVictory: true, score: score, consecutiveCorrect: consecutiveCorrectAnswers, initialHighScore: initialHighScore, prevTable: previousTable, newMultiplier: currentMultiplier });
            gameOver("Parabéns! ✨ Você completou todas as tabuadas!", true);
        }
    } else {
        const delay = wasCorrect ? nextProblemDelayAfterCorrectMs : nextProblemDelayAfterRevealMs;
        nextProblemTimeout = setTimeout(nextProblem, delay);
    }
}

function nextProblem() {
    if (isGameOver || isGamePaused) return;
    console.log(`--- Próximo Problema: Tabuada ${currentTable}, Multiplicador ${currentMultiplier} ---`);
    cleanUpProblemState(); // Garante limpeza antes de configurar o novo problema
    isRevealingAnswer = false;
    const configIndex = Math.min(currentTable - 2, balloonConfigs.length - 1);
    if(problemBalloon) { problemBalloon.style.backgroundColor = balloonConfigs[configIndex].bg; problemBalloon.style.color = balloonConfigs[configIndex].text; }
    correctAnswer = currentTable * currentMultiplier;
    if(problemBalloon) problemBalloon.textContent = `${currentTable} x ${currentMultiplier} = ?`;
    if(problemBalloon) { problemBalloon.style.top = `${balloonStartYPercent}%`; problemBalloon.style.display = 'block'; problemBalloon.style.opacity = 1; problemBalloon.style.transform = 'translateX(-50%) scale(1)'; void problemBalloon.offsetWidth; } // Força reflow

    spawnPowerUp(); // Pode gerar power-up

    const currentFallDuration = fallDurationSeconds * nextFallDurationModifier;
    if(problemBalloon) { problemBalloon.style.animation = `fall ${currentFallDuration}s linear forwards`; problemBalloon.classList.add('falling'); }
    nextFallDurationModifier = 1; // Reseta modificador para o próximo

     const startTime = performance.now();
     balloonFallEndTime = startTime + (currentFallDuration * 1000);

     // Adiciona o listener de fim de animação CSS
     if(problemBalloon){
         if(currentAnimationHandler) { problemBalloon.removeEventListener('animationend', currentAnimationHandler); }
         currentAnimationHandler = handleBalloonFallTimeout;
         problemBalloon.addEventListener('animationend', currentAnimationHandler, { once: true });
     }
     // Configura o timeout JS como fallback
     clearTimeout(currentFallTimeoutId);
     // Pequena folga no timeout JS (100ms) para garantir que a animação CSS termine primeiro se possível
     currentFallTimeoutId = setTimeout(handleBalloonFallTimeout, (currentFallDuration * 1000) + 100);

     if(answerInput) answerInput.value = '';
     setFeedback('');
     if(answerInput) answerInput.disabled = false;
     updateStarDisplay(); // Habilita/desabilita botão estrela
     if(ingameRestartButton) ingameRestartButton.disabled = false;
     if(showRulesButton) showRulesButton.disabled = false;

     console.log(`Balão ${(problemBalloon ? problemBalloon.textContent : '?')} lançado. Correta: ${correctAnswer}. Duração: ${currentFallDuration.toFixed(1)}s. Vidas: ${lives}. Fim Teórico: ${balloonFallEndTime.toFixed(0)}`);
}

function checkAnswerInternal() {
    if (isGameOver || isRevealingAnswer || isGamePaused || (problemBalloon && problemBalloon.classList.contains('pop-animation'))) return;
    const userAnswerText = answerInput?.value.trim(); if (userAnswerText === '') { setFeedback("Digite um número!", '🤔', 'incorrect'); return; }
    const userAnswer = parseInt(userAnswerText, 10); if (isNaN(userAnswer)) { setFeedback("Número inválido.", '😬', 'incorrect'); if(answerInput) answerInput.value = ''; return; }

    // PAUSA a animação e limpa timeouts imediatamente
    if(problemBalloon) problemBalloon.style.animationPlayState = 'paused';
    clearTimeout(currentFallTimeoutId);
    if(currentAnimationHandler && problemBalloon) {
        problemBalloon.removeEventListener('animationend', currentAnimationHandler);
        currentAnimationHandler = null;
    }
    clearTimeout(currentPowerUpFallTimeoutId); // Limpa timeout do power-up também

    isRevealingAnswer = true;
    if(answerInput) answerInput.disabled = true;
    if(useStarButton) useStarButton.disabled = true;
    if(ingameRestartButton) ingameRestartButton.disabled = true;
    if(showRulesButton) showRulesButton.disabled = true;

    if (userAnswer === correctAnswer) {
        consecutiveCorrectAnswers++;
        console.log(`CORRETO! ${consecutiveCorrectAnswers} seguidas.`);
        let pointsToAdd = pointsPerCorrectAnswer;
        let specificFeedbackShown = false;
        let collectedPowerUpType = null;

        // Verifica se coletou power-up que estava caindo
        if (activePowerUpElement) {
             collectedPowerUpType = activePowerUpType;
             removePowerUp(true); // Remove o power-up visualmente
             console.log(`Power-up ${collectedPowerUpType} coletado.`);
             if (collectedPowerUpType === 'double_points') {
                 pointsToAdd *= 2;
                 setFeedback("Dobro de Pontos!", '⚡', 'correct');
                 specificFeedbackShown = true;
                 console.log(`Pontos dobrados! +${pointsToAdd}`);
             } else if (collectedPowerUpType === 'slow_fall') {
                 applyPowerUpBonus(collectedPowerUpType);
                 setFeedback("Próximo balão mais lento!", '⏳', 'correct');
                 specificFeedbackShown = true;
             } else if (collectedPowerUpType === 'star_collect') {
                 collectedStars++;
                 updateStarDisplay();
                 // Mostra feedback da estrela se nenhum outro foi mostrado
                 if (!specificFeedbackShown) {
                     setFeedback("Estrela coletada!", '⭐', 'correct');
                     specificFeedbackShown = true;
                 }
             }
        }

        updateScore(score + pointsToAdd); // Atualiza pontuação

        // Mostra feedback genérico se nenhum específico foi dado
        if (!specificFeedbackShown) {
            const randomMsg = encouragements[Math.floor(Math.random() * encouragements.length)];
            setFeedback(`Correto! ${randomMsg}`, '🎉', 'correct');
        }

        checkAndUnlockAchievements({ consecutiveCorrect: consecutiveCorrectAnswers, score: score, initialHighScore: initialHighScore, prevTable: currentTable, newMultiplier: currentMultiplier + 1 });

        // Inicia animação de "pop"
        if(problemBalloon) {
             problemBalloon.classList.remove('falling');
             problemBalloon.classList.add('pop-animation');
             playSound('pop'); playSound('correct');
             // Adiciona listener para o fim do pop
             if(popAnimationHandler) problemBalloon.removeEventListener('animationend', popAnimationHandler);
             popAnimationHandler = handlePopAnimationEnd;
             problemBalloon.addEventListener('animationend', popAnimationHandler, { once: true });
        }

        // Avança para o próximo problema
        advanceToNextProblemOrTable(true);

    } else { // Resposta incorreta
        playSound('incorrect');
        console.log("INCORRETO!");
        setFeedback(`Ops! A resposta era ${correctAnswer}.`, '🤔', 'incorrect');
        if(answerInput) answerInput.value = '';
        consecutiveCorrectAnswers = 0;
        lives--;
        updateLivesDisplay();
        console.log(`Vida perdida. Vidas restantes: ${lives}`);
        checkAndUnlockAchievements({ score: score }); // Verifica achievements de score mesmo errando

        // Animação de "tremor"
        if(gameContainer) gameContainer.animate([{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(0px)' }], { duration: 300, iterations: 1 });

        removePowerUp(false); // Remove power-up se houver, sem coletar

        if (lives <= 0) {
            // Adia o fim de jogo ligeiramente para o feedback ser visível
            nextProblemTimeout = setTimeout(() => {
                gameOver("Sem vidas! 💔 Tente novamente!", false);
            }, revealAnswerDelayMs); // Usa o mesmo delay do feedback
        } else {
            // Avança para o próximo problema após o delay do feedback
            advanceToNextProblemOrTable(false);
        }
    }
}

function useStarPower() {
    if (collectedStars <= 0 || isGameOver || isRevealingAnswer || isGamePaused || (problemBalloon && problemBalloon.style.display === 'none') || (problemBalloon && problemBalloon.classList.contains('pop-animation'))) return;
    console.log("Usando Poder da Estrela! 🌟");

    // PAUSA animação e limpa timeouts
    if(problemBalloon) problemBalloon.style.animationPlayState = 'paused';
    clearTimeout(currentFallTimeoutId);
    if(currentAnimationHandler && problemBalloon) {
        problemBalloon.removeEventListener('animationend', currentAnimationHandler);
        currentAnimationHandler = null;
    }
    clearTimeout(currentPowerUpFallTimeoutId);
    removePowerUp(false); // Remove power-up visualmente se houver

    isRevealingAnswer = true;
    if(answerInput) answerInput.disabled = true;
    if(useStarButton) useStarButton.disabled = true;
    if(ingameRestartButton) ingameRestartButton.disabled = true;
    if(showRulesButton) showRulesButton.disabled = true;

    collectedStars--;
    updateStarDisplay();
    setFeedback(`Estrela usada! ✨ ${currentTable} x ${currentMultiplier} = ${correctAnswer}.`, '🌟', 'correct');

    // Inicia animação de "pop"
    if(problemBalloon) {
        problemBalloon.classList.remove('falling');
        problemBalloon.classList.add('pop-animation');
        playSound('pop'); playSound('correct');
        // Adiciona listener para o fim do pop
        if(popAnimationHandler) problemBalloon.removeEventListener('animationend', popAnimationHandler);
        popAnimationHandler = handlePopAnimationEnd;
        problemBalloon.addEventListener('animationend', popAnimationHandler, { once: true });
    } else {
        console.warn("useStarPower chamado sem problemBalloon visível?");
    }

     // Avança para o próximo problema (considerado como acerto)
     advanceToNextProblemOrTable(true);
}

function gameOver(message, isVictory = false) {
    if (isGameOver) return;
    console.log(`--- FIM DE JOGO --- ${isVictory ? 'Vitória' : 'Derrota'}. Mensagem: ${message}`);
    isGameOver = true; isRevealingAnswer = false; isGamePaused = false;
    cleanUpProblemState(); // Limpa tudo
    clearTimeout(notificationTimeout);
    if(problemBalloon) problemBalloon.style.display = 'none';
    removePowerUp(); // Garante remoção de power-ups
    if(phaseOverlay) phaseOverlay.style.display = 'none';
    if(answerInput) { answerInput.disabled = true; answerInput.placeholder = "Fim"; answerInput.value = ''; }
    if(keypadControlsContainer) keypadControlsContainer.style.display = 'none';
    if(ingameRestartButton) ingameRestartButton.style.display = 'none';

     setFeedback(message + ` Pontuação final: ${score}.`, isVictory ? '🏆' : '😕', isVictory ? 'correct' : 'incorrect');
     if(currentTableInfo) currentTableInfo.textContent = isVictory ? "Mandou bem!" : "Tente de novo!";
     if(restartButton) { restartButton.style.display = 'block'; restartButton.focus(); }
     if(showRulesButton) showRulesButton.disabled = false; // Reabilita botão de regras

     updateStarDisplay(); // Atualiza display da estrela (mostra 0 se usou todas)
     checkAndUnlockAchievements({ isVictory: isVictory, score: score }); // Verifica achievement de fim de jogo/recorde
}


// --- Event Listeners ---

// Listener do Teclado Virtual
 if(keypadArea) {
     keypadArea.addEventListener('click', async (event) => {
         // Tenta resumir o contexto em CADA clique SE AINDA FOR NECESSÁRIO
         await resumeAudioContextIfNeeded();

         if (isGameOver || isRevealingAnswer || isGamePaused || (answerInput && answerInput.disabled)) return;
         const target = event.target.closest('.keypad-button');
         if (target) {
             playSound('click'); // Tenta tocar o som de clique
             if (feedback && (feedback.classList.contains('correct') || feedback.classList.contains('incorrect') || feedback.classList.contains('transition'))) { setFeedback(''); }
             if (target.classList.contains('digit')) { if (answerInput && answerInput.value.length < 4) { answerInput.value += target.textContent; } }
             else if (target.classList.contains('backspace')) { if(answerInput) answerInput.value = answerInput.value.slice(0, -1); }
             else if (target.classList.contains('enter')) { checkAnswerInternal(); }
         }
     });
 }

// Listener do Botão Usar Estrela
 if(useStarButton) {
     useStarButton.addEventListener('click', async () => {
         await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
         useStarPower();
     });
 }
// Listener do Botão Reiniciar In-Game
 if(ingameRestartButton) {
     ingameRestartButton.addEventListener('click', async () => {
         await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
         playSound('click');
         startGame();
     });
 }
// Listener do Botão Mostrar Regras
 if(showRulesButton) {
     showRulesButton.addEventListener('click', async () => {
         await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
         playSound('click');
         pauseGame(); // Pausa ANTES de mostrar o modal
         if(rulesModal) rulesModal.style.display = 'flex';
         if(rulesModal) void rulesModal.offsetWidth; // Força reflow para transição
         if(rulesModal) rulesModal.classList.add('visible');
         if(closeRulesButton) closeRulesButton.focus();
     });
 }
// Listener do Botão Fechar Regras
 if(closeRulesButton) {
     closeRulesButton.addEventListener('click', async () => {
         await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
         playSound('click');
         if(rulesModal) rulesModal.classList.remove('visible');
         // Espera a transição do modal antes de resumir
         setTimeout(() => {
            if(rulesModal) rulesModal.style.display = 'none';
            resumeGame(); // Só retoma DEPOIS de fechar visualmente
        }, 300); // Tempo da transição CSS (opacity)
     });
 }
// Listener para fechar Modal clicando fora
 if(rulesModal) {
     rulesModal.addEventListener('click', async (event) => {
         if (event.target === rulesModal) { // Clicou no overlay, não no conteúdo
             await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
             playSound('click');
             rulesModal.classList.remove('visible');
             setTimeout(() => {
                rulesModal.style.display = 'none';
                resumeGame();
            }, 300);
         }
     });
 }

// Listener do Botão de Ativar Som REMOVIDO


// Inicialização do Jogo
document.addEventListener('DOMContentLoaded', () => {
     // startGame agora cuida da inicialização do áudio e do jogo.
     startGame();
});
// --- Fim do JavaScript ---