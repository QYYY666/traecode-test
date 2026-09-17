/**
 * 全局配置常量（命名空间：Snake.Config）
 * 集中管理棋盘、速度、计分等参数，便于调优与扩展。
 */
(function (global) {
  'use strict';

  const Config = {
    /** 棋盘网格数量（GRID x GRID） */
    GRID: 24,

    /** 蛇初始长度（节） */
    INITIAL_LENGTH: 3,

    /** 移动间隔（毫秒）：等级 1 的速度 */
    BASE_INTERVAL: 160,

    /** 每升一级减少的间隔（毫秒），即速度提升量 */
    INTERVAL_STEP: 12,

    /** 最低间隔下限（毫秒），防止速度过快无法操作 */
    MIN_INTERVAL: 60,

    /** 每级所需分数 */
    POINTS_PER_LEVEL: 50,

    /** 最高等级 */
    MAX_LEVEL: 10,

    /** 普通食物分值 */
    FOOD_SCORE: 10,

    /** 奖励食物分值 */
    BONUS_SCORE: 30,

    /** 每吃多少个普通食物出现一次奖励食物 */
    BONUS_EVERY: 5,

    /** 奖励食物存在时间（毫秒） */
    BONUS_LIFETIME: 6000,

    /** 输入方向缓冲队列长度（避免快速转向丢失） */
    INPUT_BUFFER_SIZE: 3,

    /** 本地存储键名 */
    STORAGE_KEYS: {
      HIGH_SCORE: 'snake.highScore',
      MUTED: 'snake.muted'
    }
  };

  global.Snake = global.Snake || {};
  global.Snake.Config = Config;
})(typeof window !== 'undefined' ? window : this);
