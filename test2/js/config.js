/**
 * 游戏配置文件
 * 集中管理所有游戏常量和配置参数
 */

const CONFIG = {
    // 网格配置
    GRID_SIZE: 20,              // 每个网格的像素大小
    GRID_COUNT: 20,             // 网格数量（20x20）

    // 速度配置（单位：毫秒）
    INITIAL_SPEED: 150,         // 初始移动速度
    SPEED_INCREMENT: 5,         // 每吃一个食物减少的毫秒数（加速）
    MIN_SPEED: 50,              // 最小速度限制（最快）

    // 分数配置
    FOOD_SCORE: 10,             // 普通食物分数
    SPECIAL_FOOD_SCORE: 20,     // 特殊食物分数
    SPECIAL_FOOD_CHANCE: 0.1,   // 特殊食物生成概率（10%）

    // 颜色配置
    COLORS: {
        SNAKE_HEAD: '#4CAF50',      // 蛇头颜色（绿色）
        SNAKE_BODY: '#8BC34A',      // 蛇身颜色（浅绿色）
        SNAKE_BORDER: '#2E7D32',    // 蛇身边框颜色
        FOOD: '#FF5722',            // 普通食物颜色（橙红色）
        SPECIAL_FOOD: '#FFD700',    // 特殊食物颜色（金色）
        GRID: '#E0E0E0',            // 网格线颜色
        BACKGROUND: '#FAFAFA'       // 背景颜色
    },

    // 方向键映射
    KEYS: {
        UP: ['ArrowUp', 'w', 'W'],
        DOWN: ['ArrowDown', 's', 'S'],
        LEFT: ['ArrowLeft', 'a', 'A'],
        RIGHT: ['ArrowRight', 'd', 'D'],
        PAUSE: [' ']  // 空格键
    },

    // 本地存储键名
    STORAGE_KEYS: {
        HIGH_SCORE: 'snake_high_score'
    }
};

// 防止配置被修改
Object.freeze(CONFIG);
Object.freeze(CONFIG.COLORS);
Object.freeze(CONFIG.KEYS);
Object.freeze(CONFIG.STORAGE_KEYS);
