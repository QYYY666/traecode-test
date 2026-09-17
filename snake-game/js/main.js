/**
 * 主控模块（命名空间：Snake.Main）
 * 组装 Game / Renderer / Input / Sound，驱动主循环，管理 DOM 覆盖层与按钮。
 */
(function (global) {
  'use strict';

  const Config = global.Snake.Config;
  const Sound = global.Snake.Sound;
  const { createGame, State } = global.Snake.Game;
  const { createInput } = global.Snake.Input;
  const { createRenderer } = global.Snake.Renderer;

  const $ = (id) => document.getElementById(id);

  function boot() {
    // ---------- DOM 引用 ----------
    const canvas = $('board');
    const overlay = $('overlay');
    const scoreEl = $('score');
    const highScoreEl = $('highScore');
    const levelEl = $('level');
    const lengthEl = $('length');
    const startBtn = $('startBtn');
    const pauseBtn = $('pauseBtn');
    const restartBtn = $('restartBtn');
    const muteBtn = $('muteBtn');

    if (!canvas || !overlay) {
      console.error('[Main] 页面缺少必要的画布元素，无法启动游戏。');
      return;
    }

    // ---------- 静音状态 ----------
    let muted = false;
    try {
      muted = global.localStorage.getItem(Config.STORAGE_KEYS.MUTED) === '1';
    } catch (e) { /* 忽略 */ }
    Sound.setMuted(muted);

    function refreshMuteBtn() {
      muteBtn.textContent = Sound.isMuted() ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-pressed', String(Sound.isMuted()));
    }

    // ---------- 游戏事件 -> 音效 / 覆盖层 ----------
    let renderer = null; // 稍后赋值，供事件回调使用

    function onGameEvent(evt) {
      const s = game.state();
      switch (evt.type) {
        case 'eat':
          if (evt.payload.kind === 'bonus') Sound.bonus();
          else Sound.eat();
          break;
        case 'levelUp':
          Sound.levelUp();
          showLevelFlash(evt.payload.level);
          break;
        case 'gameOver':
          Sound.gameOver();
          showGameOver(evt.payload);
          break;
        case 'turn':
          Sound.turn();
          break;
        case 'start':
        case 'resume':
          Sound.start();
          break;
        case 'pause':
          Sound.pause();
          showPaused();
          break;
        case 'reset':
          lastScore = 0;
          break;
      }
      syncHud(s);
      syncButtons();
    }

    const game = createGame({ onEvent: onGameEvent });

    // ---------- 渲染器 ----------
    try {
      renderer = createRenderer(canvas);
    } catch (err) {
      console.error('[Main] 渲染器初始化失败：', err);
      overlay.innerHTML = '<div class="panel"><h2>⚠️ 初始化失败</h2><p>当前浏览器不支持 Canvas，请更换现代浏览器。</p></div>';
      return;
    }

    // ---------- 粒子特效：吃到食物时在蛇头位置爆裂 ----------
    let lastScore = 0;

    function detectEatFx(s) {
      if (s.score > lastScore) {
        const head = s.snake[0];
        if (head && renderer) renderer.spawnParticles(head.x, head.y);
      }
      lastScore = s.score;
    }

    // ---------- HUD 同步 ----------
    function syncHud(s) {
      scoreEl.textContent = String(s.score);
      highScoreEl.textContent = String(s.highScore);
      levelEl.textContent = String(s.level);
      lengthEl.textContent = String(s.snake.length);
    }

    function syncButtons() {
      const st = game.status;
      startBtn.disabled = st === State.RUNNING;
      startBtn.textContent = st === State.PAUSED ? '继续游戏' : (st === State.OVER ? '再来一局' : '开始游戏');
      pauseBtn.disabled = st !== State.RUNNING && st !== State.PAUSED;
      pauseBtn.textContent = st === State.PAUSED ? '继续' : '暂停';
      restartBtn.disabled = st === State.READY;
    }

    // ---------- 覆盖层（欢迎 / 暂停 / 结束） ----------
    function hideOverlay() {
      overlay.classList.remove('show');
      overlay.innerHTML = '';
    }

    function showWelcome() {
      overlay.classList.add('show');
      overlay.innerHTML = `
        <div class="panel welcome">
          <div class="welcome-logo">🐍</div>
          <h2>贪吃蛇</h2>
          <p>经典街机小游戏 · 键盘方向键或 WASD 操控</p>
          <button class="btn btn-primary big" id="welcomeStart" type="button">开始游戏</button>
          <p class="hint">按 <kbd>空格</kbd> 或 <kbd>回车</kbd> 也可开始</p>
        </div>`;
      const btn = $('welcomeStart');
      if (btn) btn.addEventListener('click', () => { hideOverlay(); game.start(); });
    }

    function showPaused() {
      overlay.classList.add('show');
      overlay.innerHTML = `
        <div class="panel">
          <h2>⏸ 已暂停</h2>
          <p>按 <kbd>空格</kbd> 或点击按钮继续</p>
          <button class="btn btn-primary" id="resumeBtn" type="button">继续游戏</button>
        </div>`;
      const btn = $('resumeBtn');
      if (btn) btn.addEventListener('click', () => { hideOverlay(); game.pause(); });
    }

    const REASON_TEXT = {
      wall: '蛇撞到墙壁了！',
      self: '蛇咬到自己了！',
      win: '不可思议——你填满了整个棋盘！🏆'
    };

    function showGameOver(payload) {
      overlay.classList.add('show');
      overlay.innerHTML = `
        <div class="panel over">
          <h2>游戏结束</h2>
          <p class="over-reason">${REASON_TEXT[payload.reason] || '游戏结束'}</p>
          <div class="result-grid">
            <div><span class="result-label">本局分数</span><span class="result-value">${payload.score}</span></div>
            <div><span class="result-label">最高分</span><span class="result-value">${payload.highScore}</span></div>
          </div>
          ${payload.isNewRecord ? '<div class="record-badge">🎉 新纪录！</div>' : ''}
          <button class="btn btn-primary big" id="againBtn" type="button">再来一局</button>
          <p class="hint">按 <kbd>空格</kbd> 或 <kbd>回车</kbd> 快速重开</p>
        </div>`;
      const btn = $('againBtn');
      if (btn) btn.addEventListener('click', () => { hideOverlay(); game.restart(); });
    }

    /** 升级提示闪现 */
    let levelFlashTimer = null;
    function showLevelFlash(level) {
      if (game.status !== State.RUNNING) return;
      const el = document.createElement('div');
      el.className = 'level-flash';
      el.textContent = `⚡ 等级 ${level}！速度提升`;
      canvas.parentElement.appendChild(el);
      clearTimeout(levelFlashTimer);
      levelFlashTimer = setTimeout(() => el.remove(), 1400);
    }

    // ---------- 输入 ----------
    const input = createInput({
      surface: canvas,
      onDirection(dir) {
        game.requestDirection(dir);
        if (game.status === State.READY) { /* 方向键不自动开始，避免误触 */ }
      },
      onTogglePause() {
        const st = game.status;
        if (st === State.READY) { hideOverlay(); game.start(); }
        else if (st === State.OVER) { hideOverlay(); game.restart(); }
        else {
          game.pause();
          if (game.status === State.RUNNING) hideOverlay();
        }
      },
      onConfirm() {
        const st = game.status;
        if (st === State.READY) { hideOverlay(); game.start(); }
        else if (st === State.OVER) { hideOverlay(); game.restart(); }
      }
    });
    input.attach();

    // ---------- 按钮 ----------
    startBtn.addEventListener('click', () => {
      hideOverlay();
      if (game.status === State.OVER) game.restart();
      else game.start();
      canvas.focus();
    });

    pauseBtn.addEventListener('click', () => {
      game.pause();
      if (game.status === State.RUNNING) hideOverlay();
      canvas.focus();
    });

    restartBtn.addEventListener('click', () => {
      hideOverlay();
      game.restart();
      canvas.focus();
    });

    muteBtn.addEventListener('click', () => {
      Sound.setMuted(!Sound.isMuted());
      try {
        global.localStorage.setItem(Config.STORAGE_KEYS.MUTED, Sound.isMuted() ? '1' : '0');
      } catch (e) { /* 忽略 */ }
      refreshMuteBtn();
    });

    // ---------- 页面失焦自动暂停（避免"看不见时死亡"） ----------
    global.document.addEventListener('visibilitychange', () => {
      if (global.document.hidden && game.status === State.RUNNING) {
        game.pause();
        showPaused();
      }
    });

    // ---------- 窗口尺寸变化 ----------
    let resizeTimer = null;
    global.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderer.resize(), 120);
    });

    // ---------- 主循环 ----------
    function loop(timestamp) {
      try {
        game.update(timestamp);
        const s = game.state();
        detectEatFx(s);
        renderer.render(s, timestamp);
      } catch (err) {
        // 单帧异常不应让整局崩溃：记录并停止循环
        console.error('[Main] 主循环异常：', err);
        overlay.classList.add('show');
        overlay.innerHTML = '<div class="panel"><h2>⚠️ 出错了</h2><p>游戏遇到异常，请刷新页面重试。</p></div>';
        return;
      }
      global.requestAnimationFrame(loop);
    }

    // ---------- 启动 ----------
    syncHud(game.state());
    syncButtons();
    refreshMuteBtn();
    showWelcome();
    global.requestAnimationFrame(loop);
  }

  // DOM 就绪后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
