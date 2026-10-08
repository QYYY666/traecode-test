/**
 * 蛇类模块
 * 管理蛇的位置、移动、方向控制和绘制
 */

class Snake {
    /**
     * 构造函数 - 初始化蛇的默认状态
     * @param {number} gridCount - 网格数量（用于计算初始位置）
     */
    constructor(gridCount) {
        this.gridCount = gridCount;
        this.reset();
    }

    /**
     * 重置蛇到初始状态
     * 蛇初始长度为3，位于网格中央偏左位置，朝向右侧
     */
    reset() {
        const startX = Math.floor(this.gridCount / 2);
        const startY = Math.floor(this.gridCount / 2);

        // 蛇身由多个节点组成，每个节点是一个坐标对象 {x, y}
        this.body = [
            { x: startX, y: startY },       // 蛇头
            { x: startX - 1, y: startY },   // 第一节身体
            { x: startX - 2, y: startY }    // 第二节身体
        ];

        // 当前移动方向（右）
        this.direction = 'RIGHT';
        // 下一个方向（用于防止快速按键导致的180度转向）
        this.nextDirection = 'RIGHT';
    }

    /**
     * 移动蛇
     * 根据当前方向移动蛇头，身体跟随
     * @returns {boolean} 是否移动成功（如果碰撞则返回false）
     */
    move() {
        // 更新当前方向为下一个方向
        this.direction = this.nextDirection;

        // 计算新蛇头的位置
        const head = this.body[0];
        let newHead;

        switch (this.direction) {
            case 'UP':
                newHead = { x: head.x, y: head.y - 1 };
                break;
            case 'DOWN':
                newHead = { x: head.x, y: head.y + 1 };
                break;
            case 'LEFT':
                newHead = { x: head.x - 1, y: head.y };
                break;
            case 'RIGHT':
                newHead = { x: head.x + 1, y: head.y };
                break;
            default:
                return false;
        }

        // 检查是否撞墙
        if (newHead.x < 0 || newHead.x >= this.gridCount ||
            newHead.y < 0 || newHead.y >= this.gridCount) {
            return false;
        }

        // 检查是否撞到自己
        if (this.checkSelfCollision(newHead)) {
            return false;
        }

        // 将新头部添加到身体前端
        this.body.unshift(newHead);
        // 移除尾部（如果吃了食物则不移除，由外部调用 grow 方法）
        this.body.pop();

        return true;
    }

    /**
     * 增长蛇身
     * 在尾部添加一个节点，用于吃到食物时调用
     */
    grow() {
        const tail = this.body[this.body.length - 1];
        this.body.push({ x: tail.x, y: tail.y });
    }

    /**
     * 改变蛇的移动方向
     * 防止直接180度转向（不允许向左移动时直接向右转）
     * @param {string} newDirection - 新方向（'UP', 'DOWN', 'LEFT', 'RIGHT'）
     */
    changeDirection(newDirection) {
        // 检查是否允许转向（不能180度转向）
        const oppositeDirections = {
            'UP': 'DOWN',
            'DOWN': 'UP',
            'LEFT': 'RIGHT',
            'RIGHT': 'LEFT'
        };

        // 只有当新方向不是当前方向的反方向时才允许转向
        if (oppositeDirections[this.direction] !== newDirection) {
            this.nextDirection = newDirection;
        }
    }

    /**
     * 检查自身碰撞
     * @param {Object} position - 要检查的位置 {x, y}
     * @returns {boolean} 是否与身体碰撞
     */
    checkSelfCollision(position) {
        // 从索引1开始检查（排除头部自身）
        for (let i = 1; i < this.body.length; i++) {
            if (this.body[i].x === position.x && this.body[i].y === position.y) {
                return true;
            }
        }
        return false;
    }

    /**
     * 获取蛇头位置
     * @returns {Object} 蛇头坐标 {x, y}
     */
    getHead() {
        return this.body[0];
    }

    /**
     * 获取蛇的长度
     * @returns {number} 蛇身节点数量
     */
    getLength() {
        return this.body.length;
    }

    /**
     * 在 Canvas 上绘制蛇
     * @param {CanvasRenderingContext2D} ctx - Canvas 绘图上下文
     * @param {number} gridSize - 每个网格的像素大小
     */
    draw(ctx, gridSize) {
        for (let i = 0; i < this.body.length; i++) {
            const segment = this.body[i];
            const x = segment.x * gridSize;
            const y = segment.y * gridSize;

            // 蛇头和身体使用不同颜色
            if (i === 0) {
                ctx.fillStyle = CONFIG.COLORS.SNAKE_HEAD;
            } else {
                ctx.fillStyle = CONFIG.COLORS.SNAKE_BODY;
            }

            // 绘制圆角矩形，使蛇看起来更圆润
            this.drawRoundedRect(ctx, x, y, gridSize - 1, gridSize - 1, 5);
            ctx.fill();

            // 绘制边框
            ctx.strokeStyle = CONFIG.COLORS.SNAKE_BORDER;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 绘制蛇眼（增加可爱感）
        this.drawEyes(ctx, gridSize);
    }

    /**
     * 绘制蛇眼
     * @param {CanvasRenderingContext2D} ctx - Canvas 绘图上下文
     * @param {number} gridSize - 网格大小
     */
    drawEyes(ctx, gridSize) {
        const head = this.body[0];
        const x = head.x * gridSize;
        const y = head.y * gridSize;
        const eyeSize = gridSize * 0.2;
        const eyeOffset = gridSize * 0.25;
        const center = gridSize / 2;

        ctx.fillStyle = 'white';

        let eye1X, eye1Y, eye2X, eye2Y;

        // 根据方向调整眼睛位置
        switch (this.direction) {
            case 'UP':
                eye1X = x + center - eyeOffset;
                eye1Y = y + eyeOffset;
                eye2X = x + center + eyeOffset - eyeSize;
                eye2Y = y + eyeOffset;
                break;
            case 'DOWN':
                eye1X = x + center - eyeOffset;
                eye1Y = y + gridSize - eyeOffset - eyeSize;
                eye2X = x + center + eyeOffset - eyeSize;
                eye2Y = y + gridSize - eyeOffset - eyeSize;
                break;
            case 'LEFT':
                eye1X = x + eyeOffset;
                eye1Y = y + center - eyeOffset;
                eye2X = x + eyeOffset;
                eye2Y = y + center + eyeOffset - eyeSize;
                break;
            case 'RIGHT':
                eye1X = x + gridSize - eyeOffset - eyeSize;
                eye1Y = y + center - eyeOffset;
                eye2X = x + gridSize - eyeOffset - eyeSize;
                eye2Y = y + center + eyeOffset - eyeSize;
                break;
        }

        ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
        ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);

        // 绘制瞳孔
        ctx.fillStyle = 'black';
        const pupilSize = eyeSize * 0.5;
        ctx.fillRect(eye1X + pupilSize / 2, eye1Y + pupilSize / 2, pupilSize, pupilSize);
        ctx.fillRect(eye2X + pupilSize / 2, eye2Y + pupilSize / 2, pupilSize, pupilSize);
    }

    /**
     * 绘制圆角矩形辅助方法
     * @param {CanvasRenderingContext2D} ctx - Canvas 绘图上下文
     * @param {number} x - 起始x坐标
     * @param {number} y - 起始y坐标
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @param {number} radius - 圆角半径
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}
