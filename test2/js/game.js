/**
 * 游戏主逻辑模块
 * 管理游戏状态、循环、分数计算和难度递增
 */

class Game {
    /**
     * 构造函数 - 初始化游戏对象
     */
    constructor() {
        // 获取 Canvas 元素和绘图上下文
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // 游戏组件
        this.snake = new Snake(CONFIG.GRID_COUNT);
        this.food = new Food(CONFIG.GRID_COUNT);
        this.audio = new AudioManager();

        // 游戏状态
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.speed = CONFIG.INITIAL_SPEED;

        // 动画帧 ID（用于取消动画）
        this.animationFrameId = null;
        this.lastUpdateTime = 0;

        // 设置 Canvas 尺寸
        this.setupCanvas();

        // 初始化食物
        this.food.generate(this.snake.body);
    }

    /**
     * 设置 Canvas 尺寸
     * 根据网格数量和大小计算实际像素尺寸
     */
    setupCanvas() {
        const canvasSize = CONFIG.GRID_SIZE * CONFIG.GRID_COUNT;
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;
    }

    /**
     * 从本地存储加载最高分
     * @returns {number} 最高分记录
     */
    loadHighScore() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.HIGH_SCORE);
            return saved ? parseInt(saved, 10) : 0;
        } catch (error) {
            console.warn('无法读取最高分:', error);
            return 0;
        }
    }

    /**
     * 保存最高分到本地存储
     */
    saveHighScore() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.HIGH_SCORE, this.highScore.toString());
        } catch (error) {
            console.warn('无法保存最高分:', error);
        }
    }

    /**
     * 开始游戏
     */
    start() {
        // 初始化音频（需要在用户交互后调用）
        this.audio.init();
        this.audio.playStart();

        // 重置游戏状态
        this.score = 0;
        this.speed = CONFIG.INITIAL_SPEED;
        this.isRunning = true;
        this.isPaused = false;
        this.isGameOver = false;
        this.snake.reset();
        this.food.generate(this.snake.body);

        // 开始游戏循环
        this.lastUpdateTime = performance.now();
        this.gameLoop();
    }

    /**
     * 暂停/继续游戏
     */
    togglePause() {
        if (!this.isRunning || this.isGameOver) return;

        this.isPaused = !this.isPaused;
        this.audio.playPause();

        if (this.isPaused) {
            // 暂停时取消动画帧
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        } else {
            // 继续时重新开始循环
            this.lastUpdateTime = performance.now();
            this.gameLoop();
        }
    }

    /**
     * 重新开始游戏
     */
    restart() {
        // 取消当前循环
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // 开始新游戏
        this.start();
    }

    /**
     * 游戏结束处理
     */
    gameOver() {
        this.isGameOver = true;
        this.isRunning = false;

        // 播放游戏结束音效
        this.audio.playGameOver();

        // 更新最高分
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        // 取消动画帧
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // 通知外部显示游戏结束界面
        if (this.onGameOver) {
            this.onGameOver(this.score, this.snake.getLength());
        }
    }

    /**
     * 游戏主循环
     * 使用 requestAnimationFrame 实现流畅动画
     */
    gameLoop() {
        if (!this.isRunning || this.isPaused) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;

        // 根据当前速度控制更新频率
        if (deltaTime >= this.speed) {
            this.update();
            this.render();
            this.lastUpdateTime = currentTime;
        } else {
            // 即使不更新也要渲染（保持动画流畅）
            this.render();
        }

        // 请求下一帧动画
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * 更新游戏状态
     * 移动蛇、检测碰撞、更新分数和速度
     */
    update() {
        // 移动蛇，如果返回 false 表示碰撞
        if (!this.snake.move()) {
            this.gameOver();
            return;
        }

        // 检测是否吃到食物
        const head = this.snake.getHead();
        const foodPos = this.food.getPosition();

        if (head.x === foodPos.x && head.y === foodPos.y) {
            // 吃到食物，蛇增长
            this.snake.grow();

            // 计算分数
            const foodScore = this.food.getScore();
            this.score += foodScore;

            // 播放音效
            if (this.food.isSpecialFood()) {
                this.audio.playSpecialFood();
            } else {
                this.audio.playEat();
            }

            // 生成新食物
            this.food.generate(this.snake.body);

            // 增加游戏速度（难度递增）
            this.increaseSpeed();

            // 通知分数更新
            if (this.onScoreUpdate) {
                this.onScoreUpdate(this.score);
            }
        }

        // 更新食物动画
        this.food.updateAnimation();
    }

    /**
     * 增加游戏速度
     * 随着分数增加，蛇的移动速度加快
     */
    increaseSpeed() {
        this.speed = Math.max(
            CONFIG.MIN_SPEED,
            this.speed - CONFIG.SPEED_INCREMENT
        );
    }

    /**
     * 渲染游戏画面
     */
    render() {
        // 清空画布
        this.ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格线（可选，增加视觉效果）
        this.drawGrid();

        // 绘制食物
        this.food.draw(this.ctx, CONFIG.GRID_SIZE);

        // 绘制蛇
        this.snake.draw(this.ctx, CONFIG.GRID_SIZE);
    }

    /**
     * 绘制网格线
     */
    drawGrid() {
        this.ctx.strokeStyle = CONFIG.COLORS.GRID;
        this.ctx.lineWidth = 0.5;

        // 绘制垂直线
        for (let i = 0; i <= CONFIG.GRID_COUNT; i++) {
            const x = i * CONFIG.GRID_SIZE;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // 绘制水平线
        for (let i = 0; i <= CONFIG.GRID_COUNT; i++) {
            const y = i * CONFIG.GRID_SIZE;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    /**
     * 改变蛇的移动方向
     * @param {string} direction - 新方向
     */
    changeDirection(direction) {
        if (this.isRunning && !this.isPaused && !this.isGameOver) {
            this.snake.changeDirection(direction);
        }
    }

    /**
     * 获取当前分数
     * @returns {number} 当前分数
     */
    getScore() {
        return this.score;
    }

    /**
     * 获取最高分
     * @returns {number} 最高分
     */
    getHighScore() {
        return this.highScore;
    }

    /**
     * 获取游戏运行状态
     * @returns {boolean} 是否正在运行
     */
    getIsRunning() {
        return this.isRunning;
    }

    /**
     * 获取暂停状态
     * @returns {boolean} 是否暂停
     */
    getIsPaused() {
        return this.isPaused;
    }

    /**
     * 获取游戏结束状态
     * @returns {boolean} 是否游戏结束
     */
    getIsGameOver() {
        return this.isGameOver;
    }

    /**
     * 设置分数更新回调
     * @param {Function} callback - 回调函数
     */
    setOnScoreUpdate(callback) {
        this.onScoreUpdate = callback;
    }

    /**
     * 设置游戏结束回调
     * @param {Function} callback - 回调函数
     */
    setOnGameOver(callback) {
        this.onGameOver = callback;
    }
}
