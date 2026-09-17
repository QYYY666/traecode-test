/**
 * 游戏核心逻辑（命名空间：Snake.Game）
 * 纯状态机 + 规则计算，不依赖 DOM / Canvas，便于测试与复用。
 *
 * 状态机：ready -> running <-> paused -> over -> (restart) running
 */
(function (global) {
  'use strict';

  const Config = global.Snake.Config;

  /** 游戏状态枚举 */
  const State = {
    READY: 'ready',
    RUNNING: 'running',
    PAUSED: 'paused',
    OVER: 'over'
  };

  /** 方向相反判断 */
  function isOpposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  /** 同一格判断 */
  function sameCell(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  /**
   * 创建一局游戏。
   * @param {Object} [options]
   * @param {(event:{type:string,payload:*})=>void} [options.onEvent] 事件回调（eat/levelUp/gameOver 等）
   */
  function createGame(options) {
    const opts = options || {};
    const emit = typeof opts.onEvent === 'function' ? opts.onEvent : function () {};

    const G = {
      State,
      state: State.READY,
      snake: [],            // [{x,y}, ...] 头部在索引 0
      dir: { x: 1, y: 0 },  // 当前移动方向
      pendingDirs: [],      // 已排队、尚未消费的方向
      food: null,           // 普通食物 {x,y}
      bonus: null,          // 奖励食物 {x,y,expireAt}
      score: 0,
      level: 1,
      eaten: 0,             // 已吃普通食物计数（用于触发奖励）
      highScore: 0,
      lastTick: 0,
      now: 0                // 当前逻辑时间（由外部驱动，用于奖励食物超时）
    };

    /** 读取本地最高分 */
    function loadHighScore() {
      try {
        const v = global.localStorage.getItem(Config.STORAGE_KEYS.HIGH_SCORE);
        G.highScore = v ? parseInt(v, 10) || 0 : 0;
      } catch (e) {
        G.highScore = 0; // 隐私模式等场景降级
      }
    }

    function saveHighScore() {
      try {
        global.localStorage.setItem(Config.STORAGE_KEYS.HIGH_SCORE, String(G.highScore));
      } catch (e) { /* 忽略存储错误 */ }
    }

    /** 随机空格坐标；occupied 为需避开的格子数组 */
    function randomFreeCell(occupied) {
      const free = [];
      for (let y = 0; y < Config.GRID; y++) {
        for (let x = 0; x < Config.GRID; x++) {
          const cell = { x, y };
          if (!occupied.some((o) => sameCell(o, cell))) free.push(cell);
        }
      }
      if (free.length === 0) return null; // 棋盘已满（理论通关）
      return free[Math.floor(Math.random() * free.length)];
    }

    /** 初始化棋盘（不自动开始）；emit 仅在非首次构造时触发，避免回调引用未就绪的实例 */
    let initialized = false;
    function reset() {
      const mid = Math.floor(Config.GRID / 2);
      G.snake = [];
      for (let i = 0; i < Config.INITIAL_LENGTH; i++) {
        G.snake.push({ x: mid - i, y: mid }); // 头朝右，身体向左排布
      }
      G.dir = { x: 1, y: 0 };
      G.pendingDirs = [];
      G.score = 0;
      G.level = 1;
      G.eaten = 0;
      G.bonus = null;
      G.lastTick = 0;
      G.food = randomFreeCell(G.snake);
      G.state = State.READY;
      if (initialized) emit({ type: 'reset', payload: null });
      initialized = true;
    }

    /** 当前等级对应的移动间隔 */
    function currentInterval() {
      const interval = Config.BASE_INTERVAL - (G.level - 1) * Config.INTERVAL_STEP;
      return Math.max(Config.MIN_INTERVAL, interval);
    }

    /** 根据分数刷新等级 */
    function refreshLevel() {
      const newLevel = Math.min(
        Config.MAX_LEVEL,
        1 + Math.floor(G.score / Config.POINTS_PER_LEVEL)
      );
      if (newLevel !== G.level) {
        const up = newLevel > G.level;
        G.level = newLevel;
        if (up) emit({ type: 'levelUp', payload: { level: newLevel } });
      }
    }

    /** 消费一个排队方向（拒绝反向与非法输入） */
    function applyPendingDir() {
      while (G.pendingDirs.length) {
        const next = G.pendingDirs.shift();
        if (isOpposite(next, G.dir) || (next.x === G.dir.x && next.y === G.dir.y)) {
          continue; // 反向或同向，跳过
        }
        G.dir = next;
        emit({ type: 'turn', payload: next });
        return;
      }
    }

    /** 推入方向请求（带缓冲，避免快速连按丢失） */
    function requestDirection(dir) {
      if (!dir) return;
      if (G.state !== State.RUNNING) return;
      if (G.pendingDirs.length >= Config.INPUT_BUFFER_SIZE) return;
      G.pendingDirs.push({ x: dir.x, y: dir.y });
    }

    /** 前进一步并处理碰撞与进食 */
    function step() {
      applyPendingDir();

      const head = G.snake[0];
      const next = { x: head.x + G.dir.x, y: head.y + G.dir.y };

      // 1) 边界碰撞
      if (next.x < 0 || next.x >= Config.GRID || next.y < 0 || next.y >= Config.GRID) {
        return gameOver('wall');
      }

      // 2) 自身碰撞：尾巴即将让位，因此排除最后一节
      const body = G.snake.slice(0, G.snake.length - 1);
      if (body.some((s) => sameCell(s, next))) {
        return gameOver('self');
      }

      // 移动：头插入
      G.snake.unshift(next);

      let grew = false;

      // 3) 普通食物
      if (G.food && sameCell(next, G.food)) {
        G.score += Config.FOOD_SCORE;
        G.eaten += 1;
        grew = true;
        emit({ type: 'eat', payload: { kind: 'food', score: G.score } });
        G.food = randomFreeCell(G.snake);

        // 达到阈值时生成奖励食物
        if (G.eaten % Config.BONUS_EVERY === 0 && !G.bonus) {
          const cell = randomFreeCell(G.snake.concat(G.food ? [G.food] : []));
          if (cell) {
            G.bonus = { x: cell.x, y: cell.y, expireAt: G.now + Config.BONUS_LIFETIME };
            emit({ type: 'bonusSpawn', payload: G.bonus });
          }
        }
      }
      // 4) 奖励食物
      else if (G.bonus && sameCell(next, G.bonus)) {
        G.score += Config.BONUS_SCORE;
        grew = true;
        G.bonus = null;
        emit({ type: 'eat', payload: { kind: 'bonus', score: G.score } });
      }

      if (!grew) G.snake.pop(); // 未长大则移除尾巴

      // 奖励食物超时清理
      if (G.bonus && G.now >= G.bonus.expireAt) {
        G.bonus = null;
        emit({ type: 'bonusExpire', payload: null });
      }

      refreshLevel();

      // 通关（棋盘填满）
      if (G.food === null) {
        return gameOver('win');
      }
    }

    /**
     * 驱动游戏推进（由主循环按帧调用）。
     * @param {number} timestamp 当前时间（毫秒）
     */
    function update(timestamp) {
      G.now = timestamp;
      if (G.state !== State.RUNNING) return;
      if (timestamp - G.lastTick >= currentInterval()) {
        // 处理因暂停/掉帧造成的过大间隔：单帧最多推进一步
        G.lastTick = timestamp;
        step();
      }
    }

    function start() {
      if (G.state === State.RUNNING) return;
      if (G.state === State.OVER || G.state === State.PAUSED) {
        // 已结束则重开；暂停则恢复
        if (G.state === State.OVER) reset();
        else {
          G.state = State.RUNNING;
          G.lastTick = G.now;
          emit({ type: 'resume', payload: null });
          return;
        }
      }
      if (G.state === State.READY) {
        G.state = State.RUNNING;
        G.lastTick = G.now;
        emit({ type: 'start', payload: null });
      }
    }

    function pause() {
      if (G.state === State.RUNNING) {
        G.state = State.PAUSED;
        emit({ type: 'pause', payload: null });
      } else if (G.state === State.PAUSED) {
        G.state = State.RUNNING;
        G.lastTick = G.now;
        emit({ type: 'resume', payload: null });
      }
    }

    function gameOver(reason) {
      G.state = State.OVER;
      const isNewRecord = G.score > G.highScore;
      if (isNewRecord) {
        G.highScore = G.score;
        saveHighScore();
      }
      emit({ type: 'gameOver', payload: { reason, score: G.score, highScore: G.highScore, isNewRecord } });
    }

    /** 重新开始一局并立即进入运行态 */
    function restart() {
      reset();
      G.state = State.RUNNING;
      G.lastTick = G.now;
      emit({ type: 'start', payload: null });
    }

    loadHighScore();
    reset();

    return {
      state: () => G,
      update,
      start,
      pause,
      restart,
      reset,
      requestDirection,
      currentInterval,
      get isRunning() { return G.state === State.RUNNING; },
      get status() { return G.state; }
    };
  }

  global.Snake = global.Snake || {};
  global.Snake.Game = { createGame, State };
})(typeof window !== 'undefined' ? window : this);
