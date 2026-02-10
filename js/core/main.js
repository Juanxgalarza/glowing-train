// ============================================================
// MAIN ENTRY POINT
// ============================================================

(function () {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    const game = new Game(canvas);

    // ---- Button handlers ----

    document.getElementById('btn-start').addEventListener('click', () => {
        game.startNewGame();
    });

    document.getElementById('btn-controls').addEventListener('click', () => {
        document.getElementById('controls-panel').classList.toggle('hidden');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
        game.state = GAME_STATES.PLAYING;
        game.screens.show(null);
        game.screens.showHUD();
        game.input.requestPointerLock(canvas);
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
        game.returnToTitle();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        game.startNewGame();
    });

    document.getElementById('btn-title').addEventListener('click', () => {
        game.returnToTitle();
    });

    document.getElementById('btn-close-inv').addEventListener('click', () => {
        game.state = GAME_STATES.PLAYING;
        game.screens.show(null);
        game.screens.showHUD();
        game.input.requestPointerLock(canvas);
    });

    // ---- Click to lock pointer (for returning to game) ----

    canvas.addEventListener('click', () => {
        if (game.state === GAME_STATES.PLAYING && !game.input.locked) {
            game.input.requestPointerLock(canvas);
        }
    });

    // ---- Game loop ----

    function gameLoop() {
        requestAnimationFrame(gameLoop);
        game.update();
    }

    gameLoop();

    console.log('%c DUNGEON OF SHADOWS %c Loaded successfully!',
        'background: #8844cc; color: white; padding: 4px 8px; font-weight: bold;',
        'color: #88aaff;'
    );
})();
