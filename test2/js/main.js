/**
 * 游戏入口文件
 * 负责初始化游戏、绑定 DOM 事件和处理用户交互
 */

// 等待 DOM 加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    /**
     * 获取页面中的 DOM 元素
     */
    const welcomeScreen = document.getElementById('welcome-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const pauseScreen = document.getElementById('pause-screen');

    const currentScoreElement = document.getElementById('current-score');
    const highScoreElement = document.getElementById('high-score');
    const finalScoreElement = document.getElementById('final-score');
    const finalLengthElement = document.getElementById('final-length');

    const welcomeStartBtn = document.getElementById('welcome-start-btn');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const restartBtn = document.getElementById('restart-btn');

    /**
     * 创建游戏实例
     */
    const game = new Game();

    /**
     * 初始化显示最高分
     */
    highScoreElement.textContent = game.getHighScore();

    /**
     * 更新当前分数显示
     * @param {number} score - 当前分数
     */
    function updateScore(score) {
        currentScoreElement.textContent = score;

        // 添加分数变化动画效果
        currentScoreElement.classList.add('animate');
        setTimeout(() => {
            currentScoreElement.classList.remove('animate');
        }, 300);
    }

    /**
     * 显示游戏结束界面
     * @param {number} score - 最终分数
     * @param {number} length - 蛇的最终长度
     */
    function showGameOver(score, length) {
        finalScoreElement.textContent = score;
        finalLengthElement.textContent = length;
        gameOverScreen.classList.remove('hidden');

        // 更新最高分显示
        highScoreElement.textContent = game.getHighScore();

        // 更新按钮状态
        updateButtonStates();
    }

    /**
     * 隐藏所有覆盖层
     */
    function hideAllOverlays() {
        welcomeScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');
    }

    /**
     * 显示暂停界面
     */
    function showPauseScreen() {
        if (game.getIsPaused()) {
            pauseScreen.classList.remove('hidden');
        } else {
            pauseScreen.classList.add('hidden');
        }
    }

    /**
     * 更新按钮状态
     */
    function updateButtonStates() {
        const isRunning = game.getIsRunning();
        const isPaused = game.getIsPaused();
        const isGameOver = game.getIsGameOver();

        startBtn.disabled = isRunning && !isGameOver;
        pauseBtn.disabled = !isRunning || isGameOver;
        resetBtn.disabled = !isRunning && !isGameOver;

        // 更新暂停按钮文字
        if (isPaused) {
            pauseBtn.textContent = '继续';
        } else {
            pauseBtn.textContent = '暂停';
        }
    }

    /**
     * 设置游戏回调函数
     */
    game.setOnScoreUpdate(updateScore);
    game.setOnGameOver(showGameOver);

    /**
     * 开始游戏
     */
    function startGame() {
        hideAllOverlays();
        game.start();
        updateScore(0);
        updateButtonStates();
    }

    /**
     * 绑定按钮点击事件
     */
    // 欢迎界面开始按钮
    welcomeStartBtn.addEventListener('click', startGame);

    // 顶部开始按钮
    startBtn.addEventListener('click', startGame);

    // 暂停按钮
    pauseBtn.addEventListener('click', () => {
        game.togglePause();
        showPauseScreen();
        updateButtonStates();
    });

    // 重新开始按钮
    resetBtn.addEventListener('click', () => {
        hideAllOverlays();
        game.restart();
        updateScore(0);
        updateButtonStates();
    });

    // 游戏结束界面的重新开始按钮
    restartBtn.addEventListener('click', () => {
        hideAllOverlays();
        game.restart();
        updateScore(0);
        updateButtonStates();
    });

    /**
     * 绑定键盘事件
     * 使用方向键或 WASD 控制蛇的移动
     */
    document.addEventListener('keydown', (event) => {
        const key = event.key;

        // 方向键控制
        if (CONFIG.KEYS.UP.includes(key)) {
            event.preventDefault();
            game.changeDirection('UP');
        } else if (CONFIG.KEYS.DOWN.includes(key)) {
            event.preventDefault();
            game.changeDirection('DOWN');
        } else if (CONFIG.KEYS.LEFT.includes(key)) {
            event.preventDefault();
            game.changeDirection('LEFT');
        } else if (CONFIG.KEYS.RIGHT.includes(key)) {
            event.preventDefault();
            game.changeDirection('RIGHT');
        }

        // 空格键暂停/继续
        if (CONFIG.KEYS.PAUSE.includes(key)) {
            event.preventDefault();
            if (game.getIsRunning() && !game.getIsGameOver()) {
                game.togglePause();
                showPauseScreen();
                updateButtonStates();
            }
        }
    });

    /**
     * 绑定触摸事件（支持移动端）
     * 通过触摸滑动手势控制蛇的移动方向
     */
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (event) => {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
        if (!game.getIsRunning() || game.getIsPaused() || game.getIsGameOver()) {
            return;
        }

        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // 判断滑动方向（需要超过一定阈值才触发）
        const threshold = 30;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            // 水平滑动
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    game.changeDirection('RIGHT');
                } else {
                    game.changeDirection('LEFT');
                }
            }
        } else {
            // 垂直滑动
            if (Math.abs(diffY) > threshold) {
                if (diffY > 0) {
                    game.changeDirection('DOWN');
                } else {
                    game.changeDirection('UP');
                }
            }
        }
    }, { passive: true });

    /**
     * 阻止页面滚动（当使用方向键时）
     */
    window.addEventListener('keydown', (event) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
            event.preventDefault();
        }
    });

    // 初始渲染一次
    game.render();
    updateButtonStates();
});
