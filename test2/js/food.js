/**
 * 食物类模块
 * 管理食物的生成、类型判断和绘制
 */

class Food {
    /**
     * 构造函数 - 初始化食物属性
     * @param {number} gridCount - 网格数量
     */
    constructor(gridCount) {
        this.gridCount = gridCount;
        this.position = { x: 0, y: 0 };  // 食物当前位置
        this.isSpecial = false;           // 是否为特殊食物
        this.animationPhase = 0;          // 动画相位（用于闪烁效果）
    }

    /**
     * 随机生成食物位置
     * 避免食物生成在蛇身上
     * @param {Array} snakeBody - 蛇身体坐标数组
     */
    generate(snakeBody) {
        let validPosition = false;

        // 循环直到找到不重叠的位置
        while (!validPosition) {
            // 随机生成坐标
            const x = Math.floor(Math.random() * this.gridCount);
            const y = Math.floor(Math.random() * this.gridCount);

            // 检查是否与蛇身重叠
            validPosition = true;
            for (const segment of snakeBody) {
                if (segment.x === x && segment.y === y) {
                    validPosition = false;
                    break;
                }
            }

            // 如果位置有效，保存坐标
            if (validPosition) {
                this.position = { x, y };
            }
        }

        // 随机决定是否生成特殊食物（10%概率）
        this.isSpecial = Math.random() < CONFIG.SPECIAL_FOOD_CHANCE;
    }

    /**
     * 获取食物当前位置
     * @returns {Object} 食物坐标 {x, y}
     */
    getPosition() {
        return { ...this.position };
    }

    /**
     * 检查是否为特殊食物
     * @returns {boolean} 是否为特殊食物
     */
    isSpecialFood() {
        return this.isSpecial;
    }

    /**
     * 获取食物分数
     * @returns {number} 食物对应的分数
     */
    getScore() {
        return this.isSpecial ? CONFIG.SPECIAL_FOOD_SCORE : CONFIG.FOOD_SCORE;
    }

    /**
     * 更新动画相位
     * 用于实现食物的闪烁动画效果
     */
    updateAnimation() {
        this.animationPhase += 0.1;
    }

    /**
     * 在 Canvas 上绘制食物
     * @param {CanvasRenderingContext2D} ctx - Canvas 绘图上下文
     * @param {number} gridSize - 每个网格的像素大小
     */
    draw(ctx, gridSize) {
        const x = this.position.x * gridSize;
        const y = this.position.y * gridSize;
        const padding = 2;  // 食物与网格边框的间距

        if (this.isSpecial) {
            // 绘制特殊食物（金色，带闪烁效果）
            this.drawSpecialFood(ctx, x, y, gridSize, padding);
        } else {
            // 绘制普通食物（红色圆形）
            this.drawNormalFood(ctx, x, y, gridSize, padding);
        }
    }

    /**
     * 绘制普通食物
     * @param {CanvasRenderingContext2D} ctx - Canvas 绘图上下文
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} gridSize - 网格大小
     * @param {number} padding - 内边距
     */
    drawNormalFood(ctx, x, y, gridSize, padding) {
        const centerX = x + gridSize / 2;
        const centerY = y + gridSize / 2;
        const radius = (gridSize - padding * 2) / 2;

        // 绘制圆形食物主体
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLORS.FOOD;
        ctx.fill();

        // 绘制高光效果
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        // 绘制边框
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    /**
     * 绘制特殊食物（带闪烁效果）
     * @param {CanvasRenderingContext2D} ctx - Canvas 绘图上下文
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} gridSize - 网格大小
     * @param {number} padding - 内边距
     */
    drawSpecialFood(ctx, x, y, gridSize, padding) {
        const centerX = x + gridSize / 2;
        const centerY = y + gridSize / 2;
        const radius = (gridSize - padding * 2) / 2;

        // 计算闪烁效果（使用正弦函数实现平滑闪烁）
        const glowIntensity = 0.3 + Math.sin(this.animationPhase) * 0.2;

        // 绘制发光效果
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${glowIntensity})`;
        ctx.fill();

        // 绘制星形食物（菱形）
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX + radius * 0.5, centerY);
        ctx.lineTo(centerX, centerY + radius);
        ctx.lineTo(centerX - radius * 0.5, centerY);
        ctx.closePath();
        ctx.fillStyle = CONFIG.COLORS.SPECIAL_FOOD;
        ctx.fill();

        // 绘制高光
        ctx.beginPath();
        ctx.moveTo(centerX - radius * 0.15, centerY - radius * 0.4);
        ctx.lineTo(centerX + radius * 0.15, centerY - radius * 0.4);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();

        // 绘制边框
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX + radius * 0.5, centerY);
        ctx.lineTo(centerX, centerY + radius);
        ctx.lineTo(centerX - radius * 0.5, centerY);
        ctx.closePath();
        ctx.strokeStyle = '#FFA000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}
