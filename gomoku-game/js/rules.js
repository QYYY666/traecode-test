/**
 * 规则模块（命名空间：Gomoku.Rules）
 * 纯函数集合：棋盘创建、落点校验、胜负判定、平局判定。
 * 与 DOM / 状态无关，便于单元测试。
 */
(function (global) {
  'use strict';

  const Config = global.Gomoku.Config;

  /** 四个判定方向：横、竖、两条斜线 */
  const DIRECTIONS = [
    { dx: 1, dy: 0 },   // 横
    { dx: 0, dy: 1 },   // 竖
    { dx: 1, dy: 1 },   // 主斜（左上-右下）
    { dx: 1, dy: -1 }   // 副斜（左下-右上）
  ];

  /** 创建空棋盘：board[y][x] */
  function createBoard() {
    const board = [];
    for (let y = 0; y < Config.SIZE; y++) {
      board.push(new Array(Config.SIZE).fill(Config.EMPTY));
    }
    return board;
  }

  /** 坐标是否在棋盘内 */
  function inBounds(x, y) {
    return x >= 0 && x < Config.SIZE && y >= 0 && y < Config.SIZE;
  }

  /** 该点是否可落子（界内且为空） */
  function isPlayable(board, x, y) {
    return inBounds(x, y) && board[y][x] === Config.EMPTY;
  }

  /**
   * 以 (x,y) 为落点，沿指定方向统计连续同色棋子数（含落点自身），
   * 并返回构成连线的坐标数组。
   */
  function lineThrough(board, x, y, dx, dy) {
    const color = board[y][x];
    const cells = [{ x, y }];
    // 正方向延伸
    let nx = x + dx, ny = y + dy;
    while (inBounds(nx, ny) && board[ny][nx] === color) {
      cells.push({ x: nx, y: ny });
      nx += dx; ny += dy;
    }
    // 反方向延伸（插到前面保持坐标顺序）
    nx = x - dx; ny = y - dy;
    while (inBounds(nx, ny) && board[ny][nx] === color) {
      cells.unshift({ x: nx, y: ny });
      nx -= dx; ny -= dy;
    }
    return cells;
  }

  /**
   * 胜负判定：检查 (x,y) 处落子后是否形成 >=5 连。
   * @returns {null | {winner:number, cells:Array<{x:number,y:number}>}}
   */
  function checkWin(board, x, y) {
    const color = board[y][x];
    if (color === Config.EMPTY) return null;

    for (const { dx, dy } of DIRECTIONS) {
      const cells = lineThrough(board, x, y, dx, dy);
      if (cells.length >= Config.WIN_LENGTH) {
        return { winner: color, cells };
      }
    }
    return null;
  }

  /** 平局判定：棋盘是否已下满 */
  function isFull(board) {
    for (let y = 0; y < Config.SIZE; y++) {
      for (let x = 0; x < Config.SIZE; x++) {
        if (board[y][x] === Config.EMPTY) return false;
      }
    }
    return true;
  }

  /** 对手颜色 */
  function opposite(color) {
    return color === Config.BLACK ? Config.WHITE : Config.BLACK;
  }

  global.Gomoku = global.Gomoku || {};
  global.Gomoku.Rules = { createBoard, inBounds, isPlayable, checkWin, isFull, opposite, DIRECTIONS };
})(typeof window !== 'undefined' ? window : this);
