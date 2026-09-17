/**
 * 全局配置（命名空间：Gomoku.Config）
 */
(function (global) {
  'use strict';

  const Config = {
    /** 棋盘路数（15x15 标准棋盘） */
    SIZE: 15,

    /** 连子数达到该值判胜 */
    WIN_LENGTH: 5,

    /** 棋子类型 */
    EMPTY: 0,
    BLACK: 1,
    WHITE: 2,

    /** 星位（天元 + 四角星），用于棋盘装饰 */
    STAR_POINTS: [
      [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
    ],

    /** 本地存储键名 */
    STORAGE_KEYS: {
      BLACK_WINS: 'gomoku.blackWins',
      WHITE_WINS: 'gomoku.whiteWins',
      MUTED: 'gomoku.muted'
    }
  };

  global.Gomoku = global.Gomoku || {};
  global.Gomoku.Config = Config;
})(typeof window !== 'undefined' ? window : this);
