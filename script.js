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
    pop:       'https://fernnog.github.io/Jogo-tabuada/bubble-pop-4-323580.mp3' // Som para o estouro do balão
};
// --- Fim URLs ---


// --- Game State Variables, Timeouts, Config, Texts, Achievements, Power-ups ---
let currentTable = 2; let currentMultiplier = 1; let correctAnswer = 0;
let score = 0; let initialHighScore = 0; let highScore = 0; let lives = 3;
const maxLives = 3; let isGameOver = false; let isRevealingAnswer = false;
let consecutiveCorrectAnswers = 0; let collectedStars = 0; let starSpawnMultipliers = [];
const numStarsPerTable = 2; // Quantas estrelas aparecem por tabuada
let isGamePaused = false;
let pauseStartTime = 0;
let balloonFallEndTime = 0; let powerUpFallEndTime = 0; // Timestamps para fim das animações
let balloonRemainingTime = 0; let powerUpRemainingTime = 0; // Tempo restante ao pausar
let animationTimeout; let revealAnswerTimeout; let nextProblemTimeout;
let notificationTimeout; // Para a notificação de conquista
let currentAnimationHandler = null; // Referência ao listener 'animationend' do balão
let popAnimationHandler = null; // Referência ao listener 'animationend' do pop
let currentFallTimeoutId = null; // ID do setTimeout de fallback da queda do balão
let currentPowerUpFallTimeoutId = null; // ID do setTimeout de fallback da queda do power-up
const fallDurationSeconds = 10.5; // Duração base da queda do balão
const pointsPerCorrectAnswer = 10; const revealAnswerDelayMs = 1500; // Tempo para mostrar resposta errada
const nextProblemDelayAfterRevealMs = 1800; // Tempo para próx. problema após erro/timeout
const nextProblemDelayAfterCorrectMs = 400; // Tempo para próx. problema após acerto
const phaseTransitionVisualDuration = 1900; // Duração VISUAL da transição de fase
const achievementNotificationDurationMs = 3000; // Duração da notificação de conquista
const powerUpFallDurationSeconds = 3.8; // Duração base da queda do power-up
const hourglassSpawnChance = 0.35; // Chance de aparecer ampulheta ou raio (se não for estrela)
const doublePointsChanceWithinBonus = 0.4; // Dentro da chance de bônus, chance de ser raio (vs ampulheta)
const doublePointsFallSpeedMultiplier = 0.75; // Multiplicador de velocidade para o raio (mais rápido)
const balloonStartYPercent = 15; // Posição inicial Y do balão (%)
const encouragements = ["Legal!", "Show!", "Mandou bem!", "É isso aí!", "Boa!", "Demais!", "Continue assim!", "Você consegue!"];
const skyColors = ['#87CEFA', '#7bcdf5', '#6fcbf0', '#63c8eb', '#57c6e6', '#4bc4e1', '#3fc1dc', '#33c0d7']; // Cores do céu por tabuada
const balloonConfigs = [ // Cores do balão/texto por tabuada
    { bg: '#ffadad', text: '#5c1e1e' }, { bg: '#a0e7ff', text: '#0d47a1' },
    { bg: '#b9ffb0', text: '#1b5e20' }, { bg: '#fff59d', text: '#f57f17' },
    { bg: '#ffcc80', text: '#e65100' }, { bg: '#b39ddb', text: '#311b92' },
    { bg: '#f48fb1', text: '#880e4f' }, { bg: '#80cbc4', text: '#004d40' }
];
// Definição das Conquistas
const achievements = [
    { id: 'table3', name: "Tabuada do 3 Completa!", unlocked: false, check: state => state.prevTable === 3 && state.newMultiplier === 1 },
    { id: 'table5', name: "Tabuada do 5 Completa!", unlocked: false, check: state => state.prevTable === 5 && state.newMultiplier === 1 },
    { id: 'table7', name: "Tabuada do 7 Completa!", unlocked: false, check: state => state.prevTable === 7 && state.newMultiplier === 1 },
    { id: 'consecutive5', name: "5 Respostas Seguidas!", unlocked: false, check: state => state.consecutiveCorrect >= 5 },
    { id: 'consecutive10', name: "10 Respostas Seguidas!", unlocked: false, check: state => state.consecutiveCorrect >= 10 },
    { id: 'score100', name: "100 Pontos!", unlocked: false, check: state => state.score >= 100 },
    { id: 'score250', name: "250 Pontos!", unlocked: false, check: state => state.score >= 250 },
    { id: 'score500', name: "500 Pontos!", unlocked: false, check: state => state.score >= 500 },
    { id: 'beatHighScore', name: "Novo Recorde!", unlocked: false, check: state => state.score > state.initialHighScore && state.initialHighScore > 0 },
    { id: 'finishGame', name: "Mestre da Tabuada!", unlocked: false, check: state => state.isVictory }
];
let unlockedAchievements = new Set(); // Conjunto para armazenar IDs das conquistas desbloqueadas
// Funções de Carregamento e Salvamento de Conquistas
function loadAchievements() { try { const saved = localStorage.getItem('tabuadaAchievements'); if (saved) { unlockedAchievements = new Set(JSON.parse(saved)); achievements.forEach(ach => { if (unlockedAchievements.has(ach.id)) { ach.unlocked = true; } }); console.log("Conquistas carregadas:", unlockedAchievements); } } catch (e) { console.error("Erro ao carregar conquistas:", e); unlockedAchievements = new Set(); } }
function saveAchievements() { try { localStorage.setItem('tabuadaAchievements', JSON.stringify(Array.from(unlockedAchievements))); } catch (e) { console.error("Erro ao salvar conquistas:", e); } }
// Função para Mostrar Notificação de Conquista
function showAchievementNotification(name) { if(!achievementNotification) return; clearTimeout(notificationTimeout); achievementNotification.textContent = `🏆 ${name}`; achievementNotification.classList.add('show'); notificationTimeout = setTimeout(() => { achievementNotification.classList.remove('show'); }, achievementNotificationDurationMs); }
// Função para Verificar e Desbloquear Conquistas
function checkAndUnlockAchievements(checkState) { achievements.forEach(ach => { if (!ach.unlocked && ach.check(checkState)) { ach.unlocked = true; unlockedAchievements.add(ach.id); showAchievementNotification(ach.name); saveAchievements(); console.log("Conquista desbloqueada:", ach.name); } }); }
// Definição dos Tipos de Power-ups
const powerUpTypes = [
    { type: 'star_collect', symbol: '⭐', color: 'var(--power-up-star)' }, // Coleta estrela
    { type: 'slow_fall', symbol: '⏳', value: 1.25, color: '#3d5afe' }, // Próximo balão mais lento
    { type: 'double_points', symbol: '⚡', color: '#ffea00' } // Dobro de pontos na questão atual
];
let activePowerUpElement = null; // Elemento DOM do power-up ativo
let activePowerUpType = null; // Tipo ('star_collect', 'slow_fall', 'double_points') do power-up ativo
let nextFallDurationModifier = 1; // Modificador para a duração da queda do PRÓXIMO balão (afetado pela ampulheta)
// Função para Remover o Power-up Visualmente
function removePowerUp(collected = false) { if (activePowerUpElement) { console.log(`Removendo Power-up ${collected ? `(${activePowerUpElement.textContent} Coletado)` : `(${activePowerUpElement.textContent} Não coletado)`}`); clearTimeout(currentPowerUpFallTimeoutId); activePowerUpElement.remove(); activePowerUpElement = null; activePowerUpType = null; powerUpRemainingTime = 0; } }
// Função para Aplicar o Bônus do Power-up Coletado
function applyPowerUpBonus(type) { const powerUp = powerUpTypes.find(p => p.type === type); if (!powerUp) return; console.log("Aplicando bônus:", powerUp.symbol, powerUp.type); if (powerUp.type === 'slow_fall') { nextFallDurationModifier = powerUp.value; } }
// Função para Definir Quais Multiplicadores Terão Estrelas na Tabuada Atual
function setStarMultipliersForTable() { const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; for (let i = numbers.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [numbers[i], numbers[j]] = [numbers[j], numbers[i]]; } starSpawnMultipliers = numbers.slice(0, numStarsPerTable); console.log(`Multiplicadores da Estrela para Tabuada ${currentTable}: ${starSpawnMultipliers.join(', ')}`); }
// Função para Gerar um Power-up
function spawnPowerUp() { if(!powerUpContainer || !problemBalloon) return; if (activePowerUpElement) removePowerUp(false); if (isGameOver || isRevealingAnswer || isGamePaused || problemBalloon.style.display === 'none') return; let powerUpToSpawn = null; if (starSpawnMultipliers.includes(currentMultiplier)) { powerUpToSpawn = powerUpTypes.find(p => p.type === 'star_collect'); console.log(`Gerando Power-up: ${powerUpToSpawn.symbol} (Multiplicador ${currentMultiplier} designado)`); starSpawnMultipliers = starSpawnMultipliers.filter(m => m !== currentMultiplier); } else if (Math.random() < hourglassSpawnChance) { powerUpToSpawn = (Math.random() < doublePointsChanceWithinBonus) ? powerUpTypes.find(p => p.type === 'double_points') : powerUpTypes.find(p => p.type === 'slow_fall'); console.log("Gerando Power-up Bônus:", powerUpToSpawn.symbol); } if (!powerUpToSpawn) return; activePowerUpType = powerUpToSpawn.type; const powerUpElement = document.createElement('div'); powerUpElement.classList.add('power-up-item'); powerUpElement.textContent = powerUpToSpawn.symbol; powerUpElement.style.color = powerUpToSpawn.color || '#ffffff'; powerUpElement.style.left = `${15 + Math.random() * 70}%`; const currentPowerUpFallDuration = (activePowerUpType === 'double_points') ? powerUpFallDurationSeconds * doublePointsFallSpeedMultiplier : powerUpFallDurationSeconds; powerUpElement.style.animationDuration = `${currentPowerUpFallDuration}s`; powerUpContainer.appendChild(powerUpElement); activePowerUpElement = powerUpElement; const spawnTime = performance.now(); powerUpFallEndTime = spawnTime + (currentPowerUpFallDuration * 1000); clearTimeout(currentPowerUpFallTimeoutId); currentPowerUpFallTimeoutId = setTimeout(() => { if (activePowerUpElement === powerUpElement) removePowerUp(false); }, currentPowerUpFallDuration * 1000); console.log(`Power-up ${activePowerUpElement.textContent} spawned. Fall duration: ${currentPowerUpFallDuration.toFixed(1)}s. Fim Teórico: ${powerUpFallEndTime.toFixed(0)}`); }
// Função para Atualizar o Display de Estrelas Coletadas e o Botão
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

// --- Função showPhaseTransition - ALTERADA ---
function showPhaseTransition(tableNumber) {
    if(!phaseNumber || !phaseOverlay) return;
    phaseNumber.textContent = `${tableNumber} x`; // ADICIONADO o ' x' aqui
    phaseOverlay.style.display = 'flex';
    // Force reflow/repaint to ensure animation restarts correctly
    phaseOverlay.style.animation = 'none';
    phaseNumber.style.animation = 'none';
    void phaseOverlay.offsetWidth; // Trigger reflow
    // Reapply animations
    phaseOverlay.style.animation = 'fadeOverlay 1.8s ease-in-out forwards';
    phaseNumber.style.animation = 'popNumber 1.6s ease-out 0.1s forwards';

    // Hide overlay after animation finishes
    setTimeout(() => {
        if(phaseOverlay) phaseOverlay.style.display = 'none';
    }, phaseTransitionVisualDuration); // Use the visual duration
}


function cleanUpProblemState() {
    // Limpa timeouts
    clearTimeout(currentFallTimeoutId);
    clearTimeout(revealAnswerTimeout);
    clearTimeout(nextProblemTimeout);
    clearTimeout(currentPowerUpFallTimeoutId);

    // Reseta animação e estado do balão
    if (problemBalloon) {
        problemBalloon.style.animation = 'none';
        problemBalloon.classList.remove('falling', 'pop-animation');
        // Remove listeners de animação antigos se existirem
        if (currentAnimationHandler) {
            problemBalloon.removeEventListener('animationend', currentAnimationHandler);
            currentAnimationHandler = null;
        }
        if (popAnimationHandler) {
            problemBalloon.removeEventListener('animationend', popAnimationHandler);
            popAnimationHandler = null;
        }
    }
    // Reseta estado de pausa e tempos
    isGamePaused = false;
    pauseStartTime = 0;
    balloonRemainingTime = 0;
    powerUpRemainingTime = 0;

    // Reabilita interações
    if (keypadArea) keypadArea.style.pointerEvents = 'auto';
    if (showRulesButton) showRulesButton.disabled = false;

    // console.log("Problem state cleaned up."); // Debug log
}

function startGame() {
    console.log("Iniciando novo jogo...");
    cleanUpProblemState(); // Limpa estado do problema anterior
    clearTimeout(notificationTimeout); // Limpa notificação de conquista anterior

    // Reseta variáveis de estado do jogo
    isGameOver = false; isRevealingAnswer = false;
    currentTable = 2; currentMultiplier = 1; lives = maxLives; updateLivesDisplay();
    consecutiveCorrectAnswers = 0; nextFallDurationModifier = 1; collectedStars = 0;
    setStarMultipliersForTable(); updateStarDisplay();

    // Carrega high score e conquistas
    try { highScore = parseInt(localStorage.getItem('tabuadaHighScore') || '0'); initialHighScore = highScore; } catch (e) { console.warn("Could not parse high score:", e); highScore = 0; initialHighScore = 0; }
    loadAchievements();

    // Atualiza UI inicial
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
    removePowerUp(); // Garante que não haja power-ups do jogo anterior
    if(powerUpContainer) powerUpContainer.innerHTML = ''; // Limpa container de power-ups
    if(gameArea) gameArea.style.backgroundColor = skyColors[0]; // Define cor inicial do céu
    if(phaseOverlay) phaseOverlay.style.display = 'none'; // Esconde overlay de transição
    isGamePaused = false; // Garante que não comece pausado
    if(rulesModal) rulesModal.classList.remove('visible'); // Esconde modal de regras
    if(rulesModal) rulesModal.style.display = 'none';
    if(showRulesButton) showRulesButton.disabled = false; // Habilita botão de regras
    firstInteractionListenerAdded = false; // Reseta o controle do listener de interação

    // --- LÓGICA DE SOM NO START ---
    initAudioContext().then(contextExists => {
        if (contextExists) {
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
    // Inicia o primeiro problema após um pequeno delay
    nextProblemTimeout = setTimeout(nextProblem, 150);
}

function handleBalloonFallTimeout() {
    console.log("Fallback JS Timeout or CSS Animation End: Balloon Fall time ended.");
    // Remove o listener de animação CSS se ainda existir (evita chamadas duplas)
    if (currentAnimationHandler && problemBalloon) {
        problemBalloon.removeEventListener('animationend', currentAnimationHandler);
        currentAnimationHandler = null; // Limpa a referência
    }
    // Verifica se o jogo deve processar o timeout (não pausado, não game over, etc.)
    if (!isGameOver && !isRevealingAnswer && !isGamePaused && problemBalloon && problemBalloon.style.display !== 'none' && !problemBalloon.classList.contains('pop-animation')) {
        console.log("Balloon fall timeout triggered. Processing as incorrect.");
        isRevealingAnswer = true; // Marca que estamos revelando a resposta
        // Desabilita interações
        if(answerInput) answerInput.disabled = true;
        if(useStarButton) useStarButton.disabled = true;
        if(ingameRestartButton) ingameRestartButton.disabled = true;
        if(showRulesButton) showRulesButton.disabled = true;

        // Mostra feedback de erro
        setFeedback(`Tempo esgotado! ⏱️ A resposta era ${correctAnswer}.`, '💡', 'incorrect');
        playSound('incorrect'); // Toca som de erro
        lives--; // Perde uma vida
        updateLivesDisplay(); // Atualiza display de vidas
        console.log(`Vida perdida por timeout. Vidas restantes: ${lives}`);
        consecutiveCorrectAnswers = 0; // Reseta acertos consecutivos

        // Efeito visual de tremor
        if(gameContainer) gameContainer.animate([{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(0px)' }], { duration: 300, iterations: 1 });

        removePowerUp(false); // Remove power-up se houver, sem coletar
        clearTimeout(nextProblemTimeout); // Cancela qualquer timeout de próximo problema pendente

        // Agenda a próxima ação após o delay de feedback
        nextProblemTimeout = setTimeout(() => {
             // Reabilita botões não relacionados à resposta atual
            if(ingameRestartButton) ingameRestartButton.disabled = false;
            if(showRulesButton) showRulesButton.disabled = false;
            // Verifica se é game over
            if (lives <= 0) {
                gameOver("Sem vidas! 💔 Tente novamente!", false);
            } else {
                console.log("Avançando para o próximo problema após feedback de timeout...");
                advanceToNextProblemOrTable(false); // Avança para o próximo problema (considerado como erro)
            }
        }, nextProblemDelayAfterRevealMs); // Usa o delay definido
    } else {
        // Log caso o timeout seja ignorado por algum motivo (jogo já acabou, pausado, etc.)
        console.log(`Balloon fall timeout ignored (state: isGameOver=${isGameOver}, isRevealing=${isRevealingAnswer}, isPaused=${isGamePaused}, balloonVisible=${problemBalloon?.style.display}, pop=${problemBalloon?.classList.contains('pop-animation')}).`);
    }
}


function handlePopAnimationEnd() {
     // Esconde o balão e remove a classe de animação pop
     if(problemBalloon) {
         problemBalloon.style.display = 'none';
         problemBalloon.classList.remove('pop-animation');
     }
     // Remove o listener de fim de animação pop se ainda existir
     if (popAnimationHandler && problemBalloon) {
        problemBalloon.removeEventListener('animationend', popAnimationHandler);
        popAnimationHandler = null; // Limpa a referência
     }
     console.log("Pop animation ended.");
     // A lógica de avançar para o próximo problema já foi chamada antes,
     // aqui apenas limpamos o estado visual da animação.
}


function advanceToNextProblemOrTable(wasCorrect) {
    cleanUpProblemState(); // Limpa timeouts e listeners do problema anterior ANTES de avançar
    currentMultiplier++; // Avança para o próximo multiplicador
    updateProgressBar(); // Atualiza a barra de progresso

    // Verifica se completou a tabuada atual
    if (currentMultiplier > 10) {
        const previousTable = currentTable; // Guarda a tabuada anterior para verificação de conquista
        currentMultiplier = 1; // Reseta multiplicador
        currentTable++; // Avança para a próxima tabuada
        setStarMultipliersForTable(); // Define novos multiplicadores para estrelas
        console.log(`Fim tabuada ${previousTable}. Iniciando transição para ${currentTable}`);

        // Verifica conquista de completar tabuada
        checkAndUnlockAchievements({ prevTable: previousTable, newMultiplier: currentMultiplier, score: score, consecutiveCorrect: consecutiveCorrectAnswers, initialHighScore: initialHighScore, isVictory: false });

        // Verifica se ainda há tabuadas a fazer
        if (currentTable <= 9) {
            showPhaseTransition(currentTable); // Mostra animação de transição
            // Agenda o próximo problema após a duração da animação de transição
            nextProblemTimeout = setTimeout(() => {
                if(currentTableInfo) currentTableInfo.textContent = `Tabuada do: ${currentTable}`; // Atualiza info da tabuada
                if(gameArea) gameArea.style.backgroundColor = skyColors[Math.min(currentTable - 2, skyColors.length - 1)]; // Muda cor do céu
                if(progressBar) progressBar.style.width = `0%`; // Reseta barra de progresso
                setFeedback(`Tabuada do ${currentTable}!`, '🚀', 'transition'); // Feedback de nova tabuada
                nextProblem(); // Chama o próximo problema da nova tabuada
            }, phaseTransitionVisualDuration);
        } else { // Completou todas as tabuadas (do 2 ao 9)
             // Verifica conquista de fim de jogo
             checkAndUnlockAchievements({ isVictory: true, score: score, consecutiveCorrect: consecutiveCorrectAnswers, initialHighScore: initialHighScore, prevTable: previousTable, newMultiplier: currentMultiplier });
            gameOver("Parabéns! ✨ Você completou todas as tabuadas!", true); // Chama game over com mensagem de vitória
        }
    } else { // Ainda na mesma tabuada, apenas avança o multiplicador
        // Define o delay para o próximo problema baseado se acertou ou errou
        const delay = wasCorrect ? nextProblemDelayAfterCorrectMs : nextProblemDelayAfterRevealMs;
        // Agenda o próximo problema
        nextProblemTimeout = setTimeout(nextProblem, delay);
    }
}


function nextProblem() {
    if (isGameOver || isGamePaused) return; // Não faz nada se o jogo acabou ou está pausado
    console.log(`--- Próximo Problema: Tabuada ${currentTable}, Multiplicador ${currentMultiplier} ---`);
    cleanUpProblemState(); // Garante limpeza antes de configurar o novo problema
    isRevealingAnswer = false; // Reseta flag de revelação

    // Configura cores do balão baseado na tabuada atual
    const configIndex = Math.min(currentTable - 2, balloonConfigs.length - 1);
    if(problemBalloon) {
        problemBalloon.style.backgroundColor = balloonConfigs[configIndex].bg;
        problemBalloon.style.color = balloonConfigs[configIndex].text;
    }
    correctAnswer = currentTable * currentMultiplier; // Calcula a resposta correta
    if(problemBalloon) problemBalloon.textContent = `${currentTable} x ${currentMultiplier} = ?`; // Define o texto do problema

    // Prepara o balão para a animação de queda
    if(problemBalloon) {
        problemBalloon.style.top = `${balloonStartYPercent}%`; // Posição inicial Y
        problemBalloon.style.display = 'block'; // Torna visível
        problemBalloon.style.opacity = 1; // Garante opacidade total
        problemBalloon.style.transform = 'translateX(-50%) scale(1)'; // Reseta transformações
        void problemBalloon.offsetWidth; // Força reflow para garantir que a animação CSS comece corretamente
    }

    spawnPowerUp(); // Tenta gerar um power-up para este problema

    // Calcula a duração da queda (considerando modificador da ampulheta)
    const currentFallDuration = fallDurationSeconds * nextFallDurationModifier;
    if(problemBalloon) {
        // Aplica a animação de queda
        problemBalloon.style.animation = `fall ${currentFallDuration}s linear forwards`;
        problemBalloon.classList.add('falling'); // Adiciona classe para indicar queda
    }
    nextFallDurationModifier = 1; // Reseta o modificador para o próximo problema

     const startTime = performance.now(); // Tempo de início da queda
     balloonFallEndTime = startTime + (currentFallDuration * 1000); // Calcula o tempo teórico de fim

     // Adiciona o listener de fim de animação CSS
     if(problemBalloon){
         // Remove listener antigo, se houver, para evitar acúmulo
         if(currentAnimationHandler) {
            problemBalloon.removeEventListener('animationend', currentAnimationHandler);
         }
         currentAnimationHandler = handleBalloonFallTimeout; // Define a função de callback
         // Adiciona o novo listener que será chamado uma vez
         problemBalloon.addEventListener('animationend', currentAnimationHandler, { once: true });
     }

     // Configura o timeout JS como fallback (caso a animação CSS falhe ou não dispare o evento)
     clearTimeout(currentFallTimeoutId); // Limpa timeout anterior
     // Adiciona uma pequena folga (ex: 100ms) ao timeout JS para dar preferência ao evento CSS
     currentFallTimeoutId = setTimeout(handleBalloonFallTimeout, (currentFallDuration * 1000) + 100);

     // Reseta input e feedback
     if(answerInput) answerInput.value = '';
     setFeedback('');
     // Habilita interações
     if(answerInput) answerInput.disabled = false;
     updateStarDisplay(); // Atualiza estado do botão estrela
     if(ingameRestartButton) ingameRestartButton.disabled = false;
     if(showRulesButton) showRulesButton.disabled = false;

     console.log(`Balão ${(problemBalloon ? problemBalloon.textContent : '?')} lançado. Correta: ${correctAnswer}. Duração: ${currentFallDuration.toFixed(1)}s. Vidas: ${lives}. Fim Teórico: ${balloonFallEndTime.toFixed(0)}`);
}


function checkAnswerInternal() {
    // Ignora se o jogo acabou, já está revelando resposta, pausado ou balão estourando
    if (isGameOver || isRevealingAnswer || isGamePaused || (problemBalloon && problemBalloon.classList.contains('pop-animation'))) return;

    const userAnswerText = answerInput?.value.trim(); // Pega a resposta do input
    if (userAnswerText === '') { // Verifica se está vazio
        setFeedback("Digite um número!", '🤔', 'incorrect');
        return;
    }
    const userAnswer = parseInt(userAnswerText, 10); // Converte para número
    if (isNaN(userAnswer)) { // Verifica se é um número válido
        setFeedback("Número inválido.", '😬', 'incorrect');
        if(answerInput) answerInput.value = ''; // Limpa input inválido
        return;
    }

    // PAUSA a animação e limpa timeouts imediatamente ao checar
    if(problemBalloon) problemBalloon.style.animationPlayState = 'paused';
    clearTimeout(currentFallTimeoutId); // Limpa timeout de queda do balão
    // Remove listener de fim de animação CSS para evitar que dispare depois
    if(currentAnimationHandler && problemBalloon) {
        problemBalloon.removeEventListener('animationend', currentAnimationHandler);
        currentAnimationHandler = null;
    }
    clearTimeout(currentPowerUpFallTimeoutId); // Limpa timeout de queda do power-up

    isRevealingAnswer = true; // Marca que estamos processando a resposta
    // Desabilita interações durante o processamento
    if(answerInput) answerInput.disabled = true;
    if(useStarButton) useStarButton.disabled = true;
    if(ingameRestartButton) ingameRestartButton.disabled = true;
    if(showRulesButton) showRulesButton.disabled = true;

    // --- Resposta Correta ---
    if (userAnswer === correctAnswer) {
        consecutiveCorrectAnswers++; // Incrementa acertos consecutivos
        console.log(`CORRETO! ${consecutiveCorrectAnswers} seguidas.`);
        let pointsToAdd = pointsPerCorrectAnswer; // Pontuação base
        let specificFeedbackShown = false; // Flag para controlar feedback
        let collectedPowerUpType = null; // Guarda o tipo de power-up coletado

        // Verifica se coletou power-up que estava caindo
        if (activePowerUpElement) {
             collectedPowerUpType = activePowerUpType; // Guarda o tipo antes de remover
             removePowerUp(true); // Remove o power-up visualmente (marcando como coletado)
             console.log(`Power-up ${collectedPowerUpType} coletado.`);

             // Aplica efeitos do power-up coletado
             if (collectedPowerUpType === 'double_points') {
                 pointsToAdd *= 2; // Dobra os pontos
                 setFeedback("Dobro de Pontos!", '⚡', 'correct'); // Feedback específico
                 specificFeedbackShown = true;
                 console.log(`Pontos dobrados! +${pointsToAdd}`);
             } else if (collectedPowerUpType === 'slow_fall') {
                 applyPowerUpBonus(collectedPowerUpType); // Aplica lentidão no próximo balão
                 setFeedback("Próximo balão mais lento!", '⏳', 'correct'); // Feedback específico
                 specificFeedbackShown = true;
             } else if (collectedPowerUpType === 'star_collect') {
                 collectedStars++; // Adiciona estrela coletada
                 updateStarDisplay(); // Atualiza display
                 // Mostra feedback da estrela apenas se nenhum outro (raio/ampulheta) foi mostrado
                 if (!specificFeedbackShown) {
                     setFeedback("Estrela coletada!", '⭐', 'correct');
                     specificFeedbackShown = true;
                 }
             }
        }

        updateScore(score + pointsToAdd); // Atualiza a pontuação

        // Mostra feedback genérico de acerto se nenhum específico foi dado
        if (!specificFeedbackShown) {
            const randomMsg = encouragements[Math.floor(Math.random() * encouragements.length)];
            setFeedback(`Correto! ${randomMsg}`, '🎉', 'correct');
        }

        // Verifica conquistas relacionadas a acertos/score
        checkAndUnlockAchievements({ consecutiveCorrect: consecutiveCorrectAnswers, score: score, initialHighScore: initialHighScore, prevTable: currentTable, newMultiplier: currentMultiplier + 1 });

        // Inicia animação de "pop" no balão
        if(problemBalloon) {
             problemBalloon.classList.remove('falling'); // Remove classe de queda
             problemBalloon.classList.add('pop-animation'); // Adiciona classe de pop
             playSound('pop'); // Toca som de pop
             playSound('correct'); // Toca som de acerto
             // Adiciona listener para limpar visualmente após o pop
             if(popAnimationHandler) problemBalloon.removeEventListener('animationend', popAnimationHandler);
             popAnimationHandler = handlePopAnimationEnd;
             problemBalloon.addEventListener('animationend', popAnimationHandler, { once: true });
        }

        // Avança para o próximo problema (considerado acerto)
        advanceToNextProblemOrTable(true);

    // --- Resposta Incorreta ---
    } else {
        playSound('incorrect'); // Toca som de erro
        console.log("INCORRETO!");
        setFeedback(`Ops! A resposta era ${correctAnswer}.`, '🤔', 'incorrect'); // Mostra resposta correta
        if(answerInput) answerInput.value = ''; // Limpa input
        consecutiveCorrectAnswers = 0; // Reseta acertos consecutivos
        lives--; // Perde vida
        updateLivesDisplay(); // Atualiza display de vidas
        console.log(`Vida perdida. Vidas restantes: ${lives}`);

        // Verifica conquistas de score mesmo errando
        checkAndUnlockAchievements({ score: score });

        // Animação de "tremor" na interface
        if(gameContainer) gameContainer.animate([{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(-4px)' },{ transform: 'translateX(4px)' },{ transform: 'translateX(0px)' }], { duration: 300, iterations: 1 });

        removePowerUp(false); // Remove power-up se houver, sem coletar

        // Verifica se é game over
        if (lives <= 0) {
            // Adia o fim de jogo ligeiramente para o feedback ser visível
            nextProblemTimeout = setTimeout(() => {
                gameOver("Sem vidas! 💔 Tente novamente!", false);
            }, revealAnswerDelayMs); // Usa o mesmo delay do feedback
        } else {
            // Avança para o próximo problema após o delay do feedback
            advanceToNextProblemOrTable(false); // Considerado erro
        }
    }
}


function useStarPower() {
    // Ignora se não tem estrelas, jogo acabou, processando resposta, pausado ou balão invisível/estourando
    if (collectedStars <= 0 || isGameOver || isRevealingAnswer || isGamePaused || (problemBalloon && problemBalloon.style.display === 'none') || (problemBalloon && problemBalloon.classList.contains('pop-animation'))) return;

    console.log("Usando Poder da Estrela! 🌟");

    // PAUSA animação e limpa timeouts
    if(problemBalloon) problemBalloon.style.animationPlayState = 'paused';
    clearTimeout(currentFallTimeoutId); // Limpa timeout de queda do balão
    // Remove listener de fim de animação CSS
    if(currentAnimationHandler && problemBalloon) {
        problemBalloon.removeEventListener('animationend', currentAnimationHandler);
        currentAnimationHandler = null;
    }
    clearTimeout(currentPowerUpFallTimeoutId); // Limpa timeout de power-up
    removePowerUp(false); // Remove power-up visualmente se houver (não é coletado)

    isRevealingAnswer = true; // Marca que estamos processando
    // Desabilita interações
    if(answerInput) answerInput.disabled = true;
    if(useStarButton) useStarButton.disabled = true;
    if(ingameRestartButton) ingameRestartButton.disabled = true;
    if(showRulesButton) showRulesButton.disabled = true;

    collectedStars--; // Gasta uma estrela
    updateStarDisplay(); // Atualiza display
    setFeedback(`Estrela usada! ✨ ${currentTable} x ${currentMultiplier} = ${correctAnswer}.`, '🌟', 'correct'); // Feedback da estrela

    // Inicia animação de "pop"
    if(problemBalloon) {
        problemBalloon.classList.remove('falling'); // Remove classe de queda
        problemBalloon.classList.add('pop-animation'); // Adiciona classe de pop
        playSound('pop'); // Toca som de pop
        playSound('correct'); // Toca som de acerto (pois a estrela acerta)
        // Adiciona listener para limpar visualmente após o pop
        if(popAnimationHandler) problemBalloon.removeEventListener('animationend', popAnimationHandler);
        popAnimationHandler = handlePopAnimationEnd;
        problemBalloon.addEventListener('animationend', popAnimationHandler, { once: true });
    } else {
        // Aviso caso seja chamada sem balão visível (improvável, mas seguro)
        console.warn("useStarPower chamado sem problemBalloon visível?");
    }

     // Avança para o próximo problema (considerado como acerto, pois a estrela resolveu)
     advanceToNextProblemOrTable(true);
}


function gameOver(message, isVictory = false) {
    if (isGameOver) return; // Evita chamadas múltiplas
    console.log(`--- FIM DE JOGO --- ${isVictory ? 'Vitória' : 'Derrota'}. Mensagem: ${message}`);
    isGameOver = true; // Marca o fim do jogo
    isRevealingAnswer = false; // Reseta flags
    isGamePaused = false;
    cleanUpProblemState(); // Limpa timeouts, listeners e estado do problema
    clearTimeout(notificationTimeout); // Limpa notificação de conquista se estiver visível

    // Esconde elementos do jogo ativo
    if(problemBalloon) problemBalloon.style.display = 'none';
    removePowerUp(); // Garante remoção de power-ups
    if(phaseOverlay) phaseOverlay.style.display = 'none'; // Esconde overlay de transição
    if(answerInput) { answerInput.disabled = true; answerInput.placeholder = "Fim"; answerInput.value = ''; } // Desabilita e limpa input
    if(keypadControlsContainer) keypadControlsContainer.style.display = 'none'; // Esconde teclado e controles
    if(ingameRestartButton) ingameRestartButton.style.display = 'none'; // Esconde botão de reiniciar in-game

     // Mostra feedback final
     setFeedback(message + ` Pontuação final: ${score}.`, isVictory ? '🏆' : '😕', isVictory ? 'correct' : 'incorrect');
     if(currentTableInfo) currentTableInfo.textContent = isVictory ? "Mandou bem!" : "Tente de novo!"; // Mensagem na barra de info
     // Mostra botão "Jogar Novamente"
     if(restartButton) {
         restartButton.style.display = 'block';
         restartButton.focus(); // Coloca foco no botão
     }
     if(showRulesButton) showRulesButton.disabled = false; // Reabilita botão de regras

     updateStarDisplay(); // Atualiza display da estrela (mostra 0 se usou todas)
     // Verifica conquista de fim de jogo/recorde
     checkAndUnlockAchievements({ isVictory: isVictory, score: score, initialHighScore: initialHighScore });
}


// --- Event Listeners ---

// Listener do Teclado Virtual (delegação de eventos)
 if(keypadArea) {
     keypadArea.addEventListener('click', async (event) => {
         // Tenta resumir o contexto em CADA clique SE AINDA FOR NECESSÁRIO
         // A função resumeAudioContextIfNeeded() verifica internamente se precisa fazer algo.
         await resumeAudioContextIfNeeded();

         // Ignora cliques se o jogo acabou, está processando resposta, pausado ou input desabilitado
         if (isGameOver || isRevealingAnswer || isGamePaused || (answerInput && answerInput.disabled)) return;

         const target = event.target.closest('.keypad-button'); // Encontra o botão clicado
         if (target) {
             playSound('click'); // Tenta tocar o som de clique

             // Limpa feedback anterior ao digitar algo novo
             if (feedback && (feedback.classList.contains('correct') || feedback.classList.contains('incorrect') || feedback.classList.contains('transition'))) {
                 setFeedback('');
             }

             // Ações baseadas no botão clicado
             if (target.classList.contains('digit')) { // Se for um dígito
                 if (answerInput && answerInput.value.length < 4) { // Limita a 4 dígitos
                     answerInput.value += target.textContent;
                 }
             }
             else if (target.classList.contains('backspace')) { // Se for apagar
                 if(answerInput) answerInput.value = answerInput.value.slice(0, -1); // Remove último caractere
             }
             else if (target.classList.contains('enter')) { // Se for confirmar
                 checkAnswerInternal(); // Chama a função para verificar a resposta
             }
         }
     });
 }

// Listener do Botão Usar Estrela
 if(useStarButton) {
     useStarButton.addEventListener('click', async () => {
         await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
         useStarPower(); // Chama a função para usar a estrela
     });
 }
// Listener do Botão Reiniciar In-Game
 if(ingameRestartButton) {
     ingameRestartButton.addEventListener('click', async () => {
         await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
         playSound('click'); // Toca som de clique
         startGame(); // Reinicia o jogo
     });
 }
// Listener do Botão Mostrar Regras
 if(showRulesButton) {
     showRulesButton.addEventListener('click', async () => {
         await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
         playSound('click');
         pauseGame(); // Pausa o jogo ANTES de mostrar o modal
         if(rulesModal) rulesModal.style.display = 'flex'; // Mostra o overlay
         if(rulesModal) void rulesModal.offsetWidth; // Força reflow para transição CSS
         if(rulesModal) rulesModal.classList.add('visible'); // Adiciona classe para animar
         if(closeRulesButton) closeRulesButton.focus(); // Coloca foco no botão de fechar
     });
 }
// Listener do Botão Fechar Regras
 if(closeRulesButton) {
     closeRulesButton.addEventListener('click', async () => {
         await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
         playSound('click');
         if(rulesModal) rulesModal.classList.remove('visible'); // Remove classe para animar o fechamento
         // Espera a transição do modal (definida no CSS) antes de resumir
         setTimeout(() => {
            if(rulesModal) rulesModal.style.display = 'none'; // Esconde o overlay
            resumeGame(); // Só retoma o jogo DEPOIS de fechar visualmente
        }, 300); // Tempo da transição CSS (opacity)
     });
 }
// Listener para fechar Modal clicando fora (no overlay)
 if(rulesModal) {
     rulesModal.addEventListener('click', async (event) => {
         // Verifica se o clique foi diretamente no overlay e não no conteúdo interno
         if (event.target === rulesModal) {
             await resumeAudioContextIfNeeded(); // Tenta destravar o áudio
             playSound('click');
             rulesModal.classList.remove('visible'); // Anima o fechamento
             setTimeout(() => {
                rulesModal.style.display = 'none'; // Esconde o overlay
                resumeGame(); // Retoma o jogo
            }, 300); // Tempo da transição CSS
         }
     });
 }

 // Listener para o botão principal "Jogar Novamente" (que aparece no fim do jogo)
 // Note que este botão chama startGame() diretamente via atributo onclick no HTML.
 // <button id="restart-button" onclick="startGame()">Jogar Novamente</button>
 // Se preferir adicionar o listener aqui:
 /*
 if(restartButton) {
     restartButton.addEventListener('click', async () => {
         await resumeAudioContextIfNeeded();
         playSound('click');
         startGame();
     });
 }
 */

// --- Inicialização do Jogo ---
// O jogo é iniciado quando o DOM está completamente carregado
document.addEventListener('DOMContentLoaded', () => {
     // A função startGame() agora cuida da inicialização do áudio e da lógica principal do jogo.
     startGame();
});
// --- Fim do JavaScript ---