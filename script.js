'use strict';

// --- Web Audio API Setup ---
let audioContext;
let audioBuffers = {};
let isAudioContextResumed = false;
let soundsLoaded = false;
let isLoadingSounds = false;
// Variável userHasBeenInstructedToDownload REMOVIDA

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
const activateSoundsButton = document.getElementById('activate-sounds-button');
const soundStatus = document.getElementById('sound-status');
const soundActivationArea = document.getElementById('sound-activation-area');
// const downloadInstructionsDiv REMOVIDO

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
function initAudioContext() {
    // Tenta criar ou retornar o contexto existente
     if (audioContext && audioContext.state !== 'closed') {
         if (audioContext.state === 'suspended') {
             console.log("AudioContext exists but is suspended.");
             // Não tenta resumir aqui, espera interação
             return Promise.resolve(true);
         } else {
             isAudioContextResumed = true; // Já está rodando
             console.log("AudioContext already running.");
             return Promise.resolve(true);
         }
     }
     try {
         window.AudioContext = window.AudioContext || window.webkitAudioContext;
         audioContext = new AudioContext();
         console.log("AudioContext created.");
         if (audioContext.state === 'suspended') {
             console.log("AudioContext created in suspended state.");
         } else {
             isAudioContextResumed = true; // Se iniciar rodando
             console.log("AudioContext created in running state.");
         }
         return Promise.resolve(true);
     } catch (e) {
         console.error("Web Audio API is not supported.", e);
         if(soundStatus) soundStatus.textContent = "API de Áudio não suportada.";
         if(activateSoundsButton) activateSoundsButton.disabled = true;
         return Promise.resolve(false);
     }
}

async function fetchAndDecodeAudio(url) {
    // Busca e decodifica áudio de uma URL (agora absoluta)
    if (!audioContext) { console.warn("AudioContext not ready."); return null; }
    // Requer contexto rodando para decodeAudioData
    if (audioContext.state !== 'running') {
        console.warn(`AudioContext not running ('${audioContext.state}'), cannot decode: ${url}`);
        return null;
    }
    console.log(`Attempting to fetch: ${url}`);
    let response;
    try {
        response = await fetch(url); // Busca URL http(s)
        console.log(`Fetch response status for ${url}: ${response.status}`);
        if (!response.ok) {
            console.error(`Fetch failed for ${url}. Status: ${response.status}.`);
            throw new Error(`Fetch Error ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        console.log(`Fetched ${url} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB), decoding...`);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`Decoded ${url} successfully.`);
        return audioBuffer;
    } catch (e) {
        console.error(`Error processing audio from ${url}:`, e);
        return null; // Retorna null em caso de erro
    }
}

// --- loadSoundsFromUrls (Carrega de URLs ABSOLUTAS) ---
async function loadSoundsFromUrls() {
    if (!audioContext || !isAudioContextResumed || soundsLoaded || isLoadingSounds) {
        console.warn("loadSoundsFromUrls called prematurely or redundantly.");
        if (!isAudioContextResumed && soundStatus) {
             soundStatus.textContent = "Erro: Áudio não ativado.";
        }
        return false;
    }
    isLoadingSounds = true;
    if(activateSoundsButton) activateSoundsButton.disabled = true;
    if(soundStatus) soundStatus.textContent = "Carregando sons...";
    console.log("Attempting to load sounds from ABSOLUTE URLs...");

    let successCount = 0;
    const keys = Object.keys(soundUrls); // Usa as URLs absolutas
    const validKeys = keys.filter(k => soundUrls[k]);
    const results = {};
    let firstFailedUrl = null;

    for (const key of validKeys) {
        results[key] = await fetchAndDecodeAudio(soundUrls[key]); // Passa URL completa
        if (results[key]) {
            audioBuffers[key] = results[key];
            successCount++;
        } else {
            console.warn(`Failed to load sound from URL: ${soundUrls[key]}.`);
            if (!firstFailedUrl) firstFailedUrl = soundUrls[key]; // Anota a primeira falha
        }
    }

    isLoadingSounds = false;

    if (successCount === validKeys.length && successCount > 0) {
        console.log("All sounds loaded successfully from URLs.");
        soundsLoaded = true; // SUCESSO!
        if(soundStatus) soundStatus.textContent = "Sons ativados!";
        if(activateSoundsButton) activateSoundsButton.textContent = "Sons OK";
        // Mantém botão desabilitado após sucesso
        if(activateSoundsButton) activateSoundsButton.disabled = true;
        // Esconde a área de ativação
        setTimeout(() => { if (soundActivationArea) soundActivationArea.style.display = 'none'; }, 1500);
        return true;
    } else {
        console.warn(`Failed to load ${validKeys.length - successCount} sound(s) from URLs.`);
        // Mostra erro mais específico
        if (firstFailedUrl) {
            if(soundStatus) soundStatus.textContent = `Erro ao carregar: ${firstFailedUrl.split('/').pop()}. Verifique a conexão/URL.`;
        } else {
            if(soundStatus) soundStatus.textContent = "Falha geral ao carregar sons. Tente novamente.";
        }
        // Reabilita o botão para nova tentativa
        if(activateSoundsButton) activateSoundsButton.disabled = false;
        if(activateSoundsButton) activateSoundsButton.textContent = "🔊 Tentar Ativar Sons";
        soundsLoaded = false; // Garante que não está marcado como carregado
        audioBuffers = {}; // Limpa buffers parciais
        return false;
    }
}

function playSound(bufferKey) {
    // Toca o som se carregado e contexto pronto
    if (!soundsLoaded) return;
    if (!isAudioContextResumed) { console.warn("AudioContext not resumed, cannot play sound:", bufferKey); return; }
    if (!audioContext || audioContext.state !== 'running') { console.warn(`AudioContext not running (state: ${audioContext?.state}), cannot play sound:`, bufferKey); return; }

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
        console.warn(`Sound buffer '${bufferKey}' not found or invalid.`);
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

    // Lógica da Área de Ativação de Som no Start
     if (soundActivationArea) {
         if (soundsLoaded) {
             soundActivationArea.style.display = 'none'; // Mantém escondido se já carregou
         } else {
             soundActivationArea.style.display = 'block'; // Mostra se ainda não carregou
             if(activateSoundsButton) {
                 activateSoundsButton.disabled = isLoadingSounds;
                 activateSoundsButton.textContent = "🔊 Ativar Sons";
             }
             if(soundStatus) soundStatus.textContent = ""; // Limpa status
         }
     }

    console.log("Jogo pronto.");
    nextProblemTimeout = setTimeout(nextProblem, 150);
}

function handleBalloonFallTimeout() {
    console.log("Fallback JS Timeout: Balloon Fall time ended.");
    if (currentAnimationHandler === handleBalloonFallTimeout && problemBalloon) { problemBalloon.removeEventListener('animationend', currentAnimationHandler); currentAnimationHandler = null; }
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
     if (popAnimationHandler === handlePopAnimationEnd && problemBalloon) { problemBalloon.removeEventListener('animationend', popAnimationHandler); popAnimationHandler = null; }
     console.log("Pop animation ended.");
}

function advanceToNextProblemOrTable(wasCorrect) {
    clearTimeout(nextProblemTimeout); currentMultiplier++; updateProgressBar();
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
    } else { const delay = wasCorrect ? nextProblemDelayAfterCorrectMs : nextProblemDelayAfterRevealMs; nextProblemTimeout = setTimeout(nextProblem, delay); }
}

function nextProblem() {
    if (isGameOver || isGamePaused) return;
    console.log(`--- Próximo Problema: Tabuada ${currentTable}, Multiplicador ${currentMultiplier} ---`);
    cleanUpProblemState(); isRevealingAnswer = false;
    const configIndex = Math.min(currentTable - 2, balloonConfigs.length - 1);
    if(problemBalloon) { problemBalloon.style.backgroundColor = balloonConfigs[configIndex].bg; problemBalloon.style.color = balloonConfigs[configIndex].text; }
    correctAnswer = currentTable * currentMultiplier;
    if(problemBalloon) problemBalloon.textContent = `${currentTable} x ${currentMultiplier} = ?`;
    if(problemBalloon) { problemBalloon.style.top = `${balloonStartYPercent}%`; problemBalloon.style.display = 'block'; problemBalloon.style.opacity = 1; problemBalloon.style.transform = 'translateX(-50%) scale(1)'; void problemBalloon.offsetWidth; }
    spawnPowerUp();
    const currentFallDuration = fallDurationSeconds * nextFallDurationModifier;
    if(problemBalloon) { problemBalloon.style.animation = `fall ${currentFallDuration}s linear forwards`; problemBalloon.classList.add('falling'); }
    nextFallDurationModifier = 1;
     const startTime = performance.now(); balloonFallEndTime = startTime + (currentFallDuration * 1000);
     if(problemBalloon){ if(currentAnimationHandler) { problemBalloon.removeEventListener('animationend', currentAnimationHandler); } currentAnimationHandler = handleBalloonFallTimeout; problemBalloon.addEventListener('animationend', currentAnimationHandler, { once: true }); }
     clearTimeout(currentFallTimeoutId); currentFallTimeoutId = setTimeout(handleBalloonFallTimeout, (currentFallDuration * 1000) + 100);
     if(answerInput) answerInput.value = ''; setFeedback(''); if(answerInput) answerInput.disabled = false; updateStarDisplay(); if(ingameRestartButton) ingameRestartButton.disabled = false; if(showRulesButton) showRulesButton.disabled = false;
     console.log(`Balão ${(problemBalloon ? problemBalloon.textContent : '?')} lançado. Correta: ${correctAnswer}. Duração: ${currentFallDuration.toFixed(1)}s. Vidas: ${lives}. Fim Teórico: ${balloonFallEndTime.toFixed(0)}`);
}

function checkAnswerInternal() {
    if (isGameOver || isRevealingAnswer || isGamePaused || (problemBalloon && problemBalloon.classList.contains('pop-animation'))) return;
    const userAnswerText = answerInput?.value.trim(); if (userAnswerText === '') { setFeedback("Digite um número!", '🤔', 'incorrect'); return; }
    const userAnswer = parseInt(userAnswerText, 10); if (isNaN(userAnswer)) { setFeedback("Número inválido.", '😬', 'incorrect'); if(answerInput) answerInput.value = ''; return; }
    if(problemBalloon) problemBalloon.style.animationPlayState = 'paused'; clearTimeout(currentFallTimeoutId); if(currentAnimationHandler && problemBalloon) { problemBalloon.removeEventListener('animationend', currentAnimationHandler); currentAnimationHandler = null; }
    isRevealingAnswer = true; if(answerInput) answerInput.disabled = true; if(useStarButton) useStarButton.disabled = true; if(ingameRestartButton) ingameRestartButton.disabled = true; if(showRulesButton) showRulesButton.disabled = true;
    if (userAnswer === correctAnswer) {
        consecutiveCorrectAnswers++; console.log(`CORRETO! ${consecutiveCorrectAnswers} seguidas.`); let pointsToAdd = pointsPerCorrectAnswer; let specificFeedbackShown = false; let collectedPowerUpType = null;
        if (activePowerUpElement) { collectedPowerUpType = activePowerUpType; removePowerUp(true); console.log(`Power-up ${collectedPowerUpType} coletado.`); if (collectedPowerUpType === 'double_points') { pointsToAdd *= 2; setFeedback("Dobro de Pontos!", '⚡', 'correct'); specificFeedbackShown = true; console.log(`Pontos dobrados! +${pointsToAdd}`); } else if (collectedPowerUpType === 'slow_fall') { applyPowerUpBonus(collectedPowerUpType); setFeedback("Próximo balão mais lento!", '⏳', 'correct'); specificFeedbackShown = true; } }
        updateScore(score + pointsToAdd);
         if (collectedPowerUpType === 'star_collect') { collectedStars++; updateStarDisplay(); if (!specificFeedbackShown) { setFeedback("Estrela coletada!", '⭐', 'correct'); specificFeedbackShown = true; } else console.log("Estrela também coletada."); }
        if (!specificFeedbackShown) { const randomMsg = encouragements[Math.floor(Math.random() * encouragements.length)]; setFeedback(`Correto! ${randomMsg}`, '🎉', 'correct'); }
         checkAndUnlockAchievements({ consecutiveCorrect: consecutiveCorrectAnswers, score: score, initialHighScore: initialHighScore, prevTable: currentTable, newMultiplier: currentMultiplier + 1 });
        if(problemBalloon) { problemBalloon.classList.remove('falling'); problemBalloon.classList.add('pop-animation'); playSound('pop'); playSound('correct'); if(popAnimationHandler) problemBalloon.removeEventListener('animationend', popAnimationHandler); popAnimationHandler = handlePopAnimationEnd; problemBalloon.addEventListener('animationend', popAnimationHandler, { once: true }); }
        advanceToNextProblemOrTable(true);
    } else {
        playSound('incorrect'); console.log("INCORRETO!"); setFeedback(`Ops! A resposta era ${correctAnswer}.`, '🤔', 'incorrect'); if(answerInput) answerInput.value = ''; consecutiveCorrectAnswers = 0; lives--; updateLivesDisplay(); console.log(`Vida perdida. Vidas restantes: ${lives}`); checkAndUnlockAchievements({ score: score });
        if(gameContainer) gameContainer.animate([{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(0px)' }], { duration: 300, iterations: 1 });
        removePowerUp(false); clearTimeout(currentPowerUpFallTimeoutId);
        if (lives <= 0) { nextProblemTimeout = setTimeout(() => { gameOver("Sem vidas! 💔 Tente novamente!", false); }, 500); } else { advanceToNextProblemOrTable(false); }
    }
     clearTimeout(currentPowerUpFallTimeoutId);
}

function useStarPower() {
    if (collectedStars <= 0 || isGameOver || isRevealingAnswer || isGamePaused || (problemBalloon && problemBalloon.style.display === 'none') || (problemBalloon && problemBalloon.classList.contains('pop-animation'))) return;
    console.log("Usando Poder da Estrela! 🌟");
     if(problemBalloon) problemBalloon.style.animationPlayState = 'paused'; clearTimeout(currentFallTimeoutId); if(currentAnimationHandler && problemBalloon) { problemBalloon.removeEventListener('animationend', currentAnimationHandler); currentAnimationHandler = null; } clearTimeout(currentPowerUpFallTimeoutId); removePowerUp(false);
    isRevealingAnswer = true; if(answerInput) answerInput.disabled = true; if(useStarButton) useStarButton.disabled = true; if(ingameRestartButton) ingameRestartButton.disabled = true; if(showRulesButton) showRulesButton.disabled = true;
    collectedStars--; updateStarDisplay(); setFeedback(`Estrela usada! ✨ ${currentTable} x ${currentMultiplier} = ${correctAnswer}.`, '🌟', 'correct');
    if(problemBalloon) { problemBalloon.classList.remove('falling'); problemBalloon.classList.add('pop-animation'); playSound('pop'); playSound('correct'); if(popAnimationHandler) problemBalloon.removeEventListener('animationend', popAnimationHandler); popAnimationHandler = handlePopAnimationEnd; problemBalloon.addEventListener('animationend', popAnimationHandler, { once: true }); } else { console.warn("useStarPower chamado sem problemBalloon visível?"); }
     advanceToNextProblemOrTable(true);
}

function gameOver(message, isVictory = false) {
    if (isGameOver) return; console.log(`--- FIM DE JOGO --- ${isVictory ? 'Vitória' : 'Derrota'}. Mensagem: ${message}`);
    isGameOver = true; isRevealingAnswer = false; isGamePaused = false; cleanUpProblemState(); clearTimeout(notificationTimeout);
    if(problemBalloon) problemBalloon.style.display = 'none'; removePowerUp(); if(phaseOverlay) phaseOverlay.style.display = 'none';
    if(answerInput) { answerInput.disabled = true; answerInput.placeholder = "Fim"; answerInput.value = ''; }
    if(keypadControlsContainer) keypadControlsContainer.style.display = 'none'; if(ingameRestartButton) ingameRestartButton.style.display = 'none';
     setFeedback(message + ` Pontuação final: ${score}.`, isVictory ? '🏆' : '😕', isVictory ? 'correct' : 'incorrect');
     if(currentTableInfo) currentTableInfo.textContent = isVictory ? "Mandou bem!" : "Tente de novo!";
     if(restartButton) { restartButton.style.display = 'block'; restartButton.focus(); } if(showRulesButton) showRulesButton.disabled = false;
     updateStarDisplay(); checkAndUnlockAchievements({ isVictory: isVictory, score: score });
}


// --- Event Listeners ---

// Listener do Teclado Virtual
 if(keypadArea) {
     keypadArea.addEventListener('click', (event) => {
         // Tenta resumir contexto em qualquer clique de tecla
         if (audioContext && audioContext.state === 'suspended') {
             audioContext.resume().then(() => { isAudioContextResumed = true; }).catch(e => console.error("Error resuming AudioContext via keypad:", e));
         }
         if (isGameOver || isRevealingAnswer || isGamePaused || (answerInput && answerInput.disabled)) return;
         const target = event.target.closest('.keypad-button');
         if (target) {
             playSound('click'); // Toca som de clique
             if (feedback && (feedback.classList.contains('correct') || feedback.classList.contains('incorrect') || feedback.classList.contains('transition'))) { setFeedback(''); }
             if (target.classList.contains('digit')) { if (answerInput && answerInput.value.length < 4) { answerInput.value += target.textContent; } }
             else if (target.classList.contains('backspace')) { if(answerInput) answerInput.value = answerInput.value.slice(0, -1); }
             else if (target.classList.contains('enter')) { checkAnswerInternal(); }
         }
     });
 }
// Listener do Botão Usar Estrela
 if(useStarButton) {
     useStarButton.addEventListener('click', () => {
         // Tenta resumir antes de usar
         if (audioContext && audioContext.state === 'suspended') {
             audioContext.resume().then(() => { isAudioContextResumed = true; useStarPower(); }).catch(e => console.error("Error resuming context for star power:", e));
         } else if (isAudioContextResumed || !audioContext){ // Procede se já resumido ou se não houver contexto (sem som)
              useStarPower();
         }
     });
 }
// Listener do Botão Reiniciar In-Game
 if(ingameRestartButton) {
     ingameRestartButton.addEventListener('click', () => {
         playSound('click');
         startGame();
     });
 }
// Listener do Botão Mostrar Regras
 if(showRulesButton) {
     showRulesButton.addEventListener('click', () => {
         playSound('click');
         pauseGame();
         if(rulesModal) rulesModal.style.display = 'flex';
         if(rulesModal) void rulesModal.offsetWidth;
         if(rulesModal) rulesModal.classList.add('visible');
         if(closeRulesButton) closeRulesButton.focus();
     });
 }
// Listener do Botão Fechar Regras
 if(closeRulesButton) {
     closeRulesButton.addEventListener('click', () => {
         playSound('click');
         if(rulesModal) rulesModal.classList.remove('visible');
         setTimeout(() => { if(rulesModal) rulesModal.style.display = 'none'; resumeGame(); }, 300);
     });
 }
// Listener para fechar Modal clicando fora
 if(rulesModal) {
     rulesModal.addEventListener('click', (event) => {
         if (event.target === rulesModal) {
             playSound('click');
             rulesModal.classList.remove('visible');
             setTimeout(() => { rulesModal.style.display = 'none'; resumeGame(); }, 300);
         }
     });
 }


// --- SIMPLIFICADO: Event Listener do Botão Ativar Sons ---
 if(activateSoundsButton) {
    activateSoundsButton.addEventListener('click', async () => {
        if (isLoadingSounds || soundsLoaded) return; // Ignora se já carregou/está carregando

        console.log("Activate sounds button clicked.");

        // 1. Garante que o contexto exista
        const contextExists = await initAudioContext();
        if (!contextExists) {
            if(soundStatus) soundStatus.textContent = "Erro crítico: Áudio não suportado.";
            if(activateSoundsButton) activateSoundsButton.disabled = true;
            return;
        }

        // 2. Tenta Resumir o Contexto se suspenso (essencial!)
        if (audioContext && audioContext.state === 'suspended') {
             try {
                 await audioContext.resume();
                 console.log("AudioContext resumed successfully on click.");
                 isAudioContextResumed = true;
             } catch (e) {
                 console.error("Failed to resume AudioContext:", e);
                 if(soundStatus) soundStatus.textContent = "Erro ao ativar áudio. Clique de novo?";
                 // Não desativa, permite nova tentativa
                 return; // Não prossegue para carregar se falhou ao resumir
             }
         } else if (audioContext && audioContext.state === 'running') {
             isAudioContextResumed = true; // Já estava rodando
             console.log("AudioContext was already running.");
         }

         // 3. Tenta Carregar os Sons (APENAS SE o contexto estiver rodando)
         if (isAudioContextResumed && audioContext.state === 'running') {
             loadSoundsFromUrls(); // Chama o carregamento das URLs ABSOLUTAS
         } else {
             // Se não conseguiu resumir ou algo deu errado
             console.error("Cannot load sounds, AudioContext is not running.");
             if(soundStatus && !soundStatus.textContent.startsWith("Erro")) { // Evita sobrescrever erro anterior
                 soundStatus.textContent = "Erro: Áudio não pôde ser iniciado.";
             }
         }
    });
 }


// Inicialização do Jogo
document.addEventListener('DOMContentLoaded', () => {
     // Tenta inicializar o contexto cedo, mas pode ficar 'suspended'
     initAudioContext();
     startGame(); // Inicia a lógica do jogo
});
// --- Fim do JavaScript ---
