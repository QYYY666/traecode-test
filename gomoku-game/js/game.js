/**
 * 游戏核心逻辑（命名空间：Gomoku.Game）
 * 状态机 + 历史记录（悔棋），不依赖 DOM，便于测试。
 *
 * 状态：ready -> playing <-> paused -> over -> (restart) playing
 */
(function (global) {
  'use strict';

  const Config = global.Gomoku.Config;
  const Rules = global.Gomoku.Rules;

  const State = {
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    OVER: 'over'
  };

  /**
   * 创建一局五子棋。
   * @param {Object} [options]
   * @param {(evt:{type:string,payload:*})=>void} [options.onEvent] 事件回调
   */
  function createGame(options) {
    const opts = options || {};
    const emit = typeof opts.onEvent === 'function' ? opts.onEvent : function () {};

    const G = {
      state: State.READY,
      board: Rules.createBoard(),
      turn: Config.BLACK,          // 当前落子方（黑先）
      history: [],                 // [{x,y,color}, ...] 用于悔棋与统计
      winInfo: null,               // {winner, cells} 获胜连线
      draw: false,                 // 是否平局
      cursor: { x: 7, y: 7 },      // 键盘光标位置（天元）
      blackWins: 0,
      whiteWins: 0
    };

    // ---------- 战绩持久化 ----------
    function loadRecords() {
      try {
        G.blackWins = parseInt(global.localStorage.getItem(Config.STORAGE_KEYS.BLACK_WINS), 10) || 0;
        G.whiteWins = parseInt(global.localStorage.getItem(Config.STORAGE_KEYS.WHITE_WINS), 10) || 0;
      } catch (e) {
        G.blackWins = 0;
        G.whiteWins = 0;
      }
    }

    function saveRecords() {
      try {
        global.localStorage.setItem(Config.STORAGE_KEYS.BLACK_WINS, String(G.blackWins));
        global.localStorage.setItem(Config.STORAGE_KEYS.WHITE_WINS, String(G.whiteWins));
      } catch (e) { /* 忽略存储错误 */ }
    }

    // ---------- 基本操作 ----------

    /** 重置棋盘（保留战绩）；构造期首次调用不触发事件，避免回调引用未就绪的实例 */
    let initialized = false;
    function reset() {
      G.board = Rules.createBoard();
      G.turn = Config.BLACK;
      G.history = [];
      G.winInfo = null;
      G.draw = false;
      G.cursor = { x: 7, y: 7 };
      G.state = State.READY;
      if (initialized) emit({ type: 'reset', payload: null });
      initialized = true;
    }

    /** 开始 / 继续 */
    function start() {
      if (G.state === State.OVER) reset();
      if (G.state === State.READY || G.state === State.PAUSED) {
        G.state = State.PLAYING;
        emit({ type: 'start', payload: null });
      }
    }

    /** 暂停 / 恢复切换 */
    function togglePause() {
      if (G.state === State.PLAYING) {
        G.state = State.PAUSED;
        emit({ type: 'pause', payload: null });
      } else if (G.state === State.PAUSED) {
        G.state = State.PLAYING;
        emit({ type: 'resume', payload: null });
      }
    }

    /**
     * 在 (x,y) 落子。
     * @returns {{ok:boolean, reason?:string}}
     */
    function place(x, y) {
      if (G.state !== State.PLAYING) {
        return { ok: false, reason: 'notPlaying' };
      }
      if (!Rules.inBounds(x, y)) {
        return { ok: false, reason: 'outOfBounds' };
      }
      if (!Rules.isPlayable(G.board, x, y)) {
        return { ok: false, reason: 'occupied' };
      }

      const color = G.turn;
      G.board[y][x] = color;
      G.history.push({ x, y, color });
      G.cursor = { x, y };
      emit({ type: 'place', payload: { x, y, color, moveNo: G.history.length } });

      // 胜负判定
      const win = Rules.checkWin(G.board, x, y);
      if (win) {
        G.winInfo = win;
        G.state = State.OVER;
        if (win.winner === Config.BLACK) G.blackWins++;
        else G.whiteWins++;
        saveRecords();
        emit({ type: 'win', payload: { winner: win.winner, cells: win.cells } });
        return { ok: true };
      }

      // 平局判定
      if (Rules.isFull(G.board)) {
        G.draw = true;
        G.state = State.OVER;
        emit({ type: 'draw', payload: null });
        return { ok: true };
      }

      // 交换回合
      G.turn = Rules.opposite(color);
      return { ok: true };
    }

    /**
     * 悔棋：撤销最近一手（游戏结束后也可悔棋继续）。
     * @returns {{ok:boolean, reason?:string}}
     */
    function undo() {
      if (G.history.length === 0) {
        return { ok: false, reason: 'empty' };
      }
      // 已结束的对局：先回退战绩，允许继续
      if (G.state === State.OVER) {
        if (G.winInfo) {
          if (G.winInfo.winner === Config.BLACK) G.blackWins = Math.max(0, G.blackWins - 1);
          else G.whiteWins = Math.max(0, G.whiteWins - 1);
          saveRecords();
        }
        G.winInfo = null;
        G.draw = false;
        G.state = State.PLAYING;
      } else if (G.state === State.PAUSED) {
        return { ok: false, reason: 'paused' };
      }

      const last = G.history.pop();
      G.board[last.y][last.x] = Config.EMPTY;
      G.turn = last.color; // 回到被撤销方的回合
      G.cursor = { x: last.x, y: last.y };
      emit({ type: 'undo', payload: { x: last.x, y: last.y, color: last.color } });
      return { ok: true };
    }

    // ---------- 键盘光标 ----------

    /** 移动光标（越界自动夹紧） */
    function moveCursor(dx, dy) {
      const nx = Math.min(Config.SIZE - 1, Math.max(0, G.cursor.x + dx));
      const ny = Math.min(Config.SIZE - 1, Math.max(0, G.cursor.y + dy));
      if (nx !== G.cursor.x || ny !== G.cursor.y) {
        G.cursor = { x: nx, y: ny };
        emit({ type: 'cursor', payload: G.cursor });
      }
    }

    loadRecords();
    reset();

    return {
      state: () => G,
      start,
      togglePause,
      place,
      undo,
      reset,
      moveCursor,
      get status() { return G.state; },
      canUndo() { return G.history.length > 0 && G.state !== State.PAUSED; }
    };
  }

  global.Gomoku = global.Gomoku || {};
  global.Gomoku.Game = { createGame, State };
})(typeof window !== 'undefined' ? window : this);
