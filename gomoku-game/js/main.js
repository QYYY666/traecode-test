/**
 * 主控模块（命名空间：Gomoku.Main）
 * 组装 Game / Renderer / Sound，处理鼠标/触摸/键盘输入、
 * 按钮、覆盖层（欢迎/暂停/结算）与 HUD 同步。
 */
(function (global) {
  'use strict';

  const Config = global.Gomoku.Config;
  const Sound = global.Gomoku.Sound;
  const { createGame, State } = global.Gomoku.Game;
  const { createRenderer } = global.Gomoku.Renderer;

  const $ = (id) => document.getElementById(id);

  function boot() {
    // ---------- DOM 引用 ----------
    const canvas = $('board');
    const overlay = $('overlay');
    const turnCard = $('turnCard');
    const turnStone = $('turnStone');
    const turnText = $('turnText');
    const moveNoEl = $('moveNo');
    const blackWinsEl = $('blackWins');
    const whiteWinsEl = $('whiteWins');
    const undoBtn = $('undoBtn');
    const pauseBtn = $('pauseBtn');
    const restartBtn = $('restartBtn');
    const muteBtn = $('muteBtn');

    if (!canvas || !overlay) {
      console.error('[Main] 页面缺少必要元素，无法启动。');
      return;
    }

    // ---------- 渲染器（先于 game 事件回调创建） ----------
    let renderer = null;
    try {
      renderer = createRenderer(canvas);
    } catch (err) {
      console.error('[Main] 渲染器初始化失败：', err);
      overlay.classList.add('show');
      overlay.innerHTML = '<div class="panel"><h2>⚠️ 初始化失败</h2><p>当前浏览器不支持 Canvas，请更换现代浏览器。</p></div>';
      return;
    }

    // ---------- 静音 ----------
    let muted = false;
    try {
      muted = global.localStorage.getItem(Config.STORAGE_KEYS.MUTED) === '1';
    } catch (e) { /* 忽略 */ }
    Sound.setMuted(muted);

    function refreshMuteBtn() {
      muteBtn.textContent = Sound.isMuted() ? '🔇' : '🔊';
    }

    // ---------- 游戏事件 ----------
    function onGameEvent(evt) {
      switch (evt.type) {
        case 'place':
          Sound.place();
          renderer.animatePlace(evt.payload.x, evt.payload.y, evt.payload.color, performance.now());
          break;
        case 'undo':
          Sound.undo();
          hideOverlay();
          break;
        case 'win':
          Sound.win();
          showResult(evt.payload);
          break;
        case 'draw':
          Sound.draw();
          showResult({ winner: null });
          break;
        case 'pause':
          Sound.pause();
          showPaused();
          break;
        case 'start':
        case 'resume':
          Sound.start();
          hideOverlay();
          break;
        case 'reset':
          hideOverlay();
          break;
      }
      syncHud();
      syncButtons();
    }

    const game = createGame({ onEvent: onGameEvent });

    // ---------- HUD 同步 ----------
    function syncHud() {
      const s = game.state();
      const isBlack = s.turn === Config.BLACK;
      turnStone.className = 'turn-stone ' + (isBlack ? 'black' : 'white');
      turnCard.className = 'turn-card ' + (isBlack ? 'black' : 'white');
      moveNoEl.textContent = String(s.history.length);
      blackWinsEl.textContent = String(s.blackWins);
      whiteWinsEl.textContent = String(s.whiteWins);

      if (s.state === State.OVER) {
        if (s.winInfo) {
          turnText.textContent = s.winInfo.winner === Config.BLACK ? '黑方获胜' : '白方获胜';
        } else {
          turnText.textContent = '平局';
        }
      } else if (s.state === State.PAUSED) {
        turnText.textContent = '已暂停';
      } else {
        turnText.textContent = isBlack ? '黑方' : '白方';
      }
    }

    function syncButtons() {
      const st = game.status;
      undoBtn.disabled = !game.canUndo();
      pauseBtn.disabled = st !== State.PLAYING && st !== State.PAUSED;
      pauseBtn.textContent = st === State.PAUSED ? '▶ 继续' : '⏸ 暂停';
    }

    // ---------- 覆盖层 ----------
    function hideOverlay() {
      overlay.classList.remove('show');
      overlay.innerHTML = '';
    }

    function showWelcome() {
      overlay.classList.add('show');
      overlay.innerHTML = `
        <div class="panel">
          <div class="welcome-logo">⚫⚪</div>
          <h2>五子棋</h2>
          <p>15×15 标准棋盘 · 黑先白后 · 五连制胜</p>
          <button class="btn btn-primary big" id="welcomeStart" type="button">开始对局</button>
          <p class="hint">按 <kbd>回车</kbd> 或 <kbd>空格</kbd> 也可开始</p>
        </div>`;
      const btn = $('welcomeStart');
      if (btn) btn.addEventListener('click', () => game.start());
    }

    function showPaused() {
      overlay.classList.add('show');
      overlay.innerHTML = `
        <div class="panel">
          <h2>⏸ 已暂停</h2>
          <p>按 <kbd>空格</kbd> 或点击按钮继续对局</p>
          <button class="btn btn-primary" id="resumeBtn" type="button">继续对局</button>
        </div>`;
      const btn = $('resumeBtn');
      if (btn) btn.addEventListener('click', () => game.togglePause());
    }

    function showResult(payload) {
      let banner;
      if (payload.winner) {
        const name = payload.winner === Config.BLACK ? '黑方' : '白方';
        banner = `
          <div class="win-banner">
            <span class="win-stone ${payload.winner === Config.BLACK ? 'black' : 'white'}"></span>
            ${name}获胜！
          </div>`;
      } else {
        banner = '<div class="win-banner">🤝 平局</div>';
      }
      overlay.classList.add('show');
      overlay.innerHTML = `
        <div class="panel">
          <h2>对局结束</h2>
          ${banner}
          <p class="result-detail">共 ${game.state().history.length} 手 · 可悔棋继续或再来一局</p>
          <button class="btn btn-primary big" id="againBtn" type="button">再来一局</button>
          <button class="btn" id="resultUndoBtn" type="button">悔棋继续</button>
          <p class="hint">按 <kbd>回车</kbd> 快速开始新对局</p>
        </div>`;
      $('againBtn').addEventListener('click', () => game.start()); // OVER 状态下 start 即重开
      $('resultUndoBtn').addEventListener('click', () => game.undo());
    }

    // ---------- 棋盘输入（鼠标 / 触摸） ----------
    function handleTap(clientX, clientY) {
      if (game.status !== State.PLAYING) return;
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const cellPos = renderer.pixelToGrid(px, py);
      if (!cellPos) return;

      const res = game.place(cellPos.x, cellPos.y);
      if (!res.ok && res.reason === 'occupied') {
        Sound.invalid();
      }
    }

    // 触摸：用 touchend 坐标落子；随后的合成 click 通过 touchHandled 标志去重
    let touchHandled = false;
    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length) {
        const t = e.changedTouches[0];
        touchHandled = true;
        handleTap(t.clientX, t.clientY);
        e.preventDefault();
        setTimeout(() => { touchHandled = false; }, 500);
      }
    }, { passive: false });

    canvas.addEventListener('click', (e) => {
      if (touchHandled) return; // 触摸已处理，忽略合成 click
      handleTap(e.clientX, e.clientY);
      canvas.focus();
    });

    // ---------- 键盘 ----------
    global.document.addEventListener('keydown', (e) => {
      const key = e.key;

      // 方向键移动光标
      const dirMap = {
        ArrowUp: [0, -1], ArrowDown: [0, 1],
        ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
      };
      const k = key.length === 1 ? key.toLowerCase() : key;

      if (dirMap[k] && game.status === State.PLAYING) {
        e.preventDefault();
        game.moveCursor(dirMap[k][0], dirMap[k][1]);
        return;
      }

      if (key === 'Enter') {
        e.preventDefault();
        if (game.status === State.READY || game.status === State.OVER) {
          game.start();
        } else if (game.status === State.PLAYING) {
          const c = game.state().cursor;
          const res = game.place(c.x, c.y);
          if (!res.ok && res.reason === 'occupied') Sound.invalid();
        }
        return;
      }

      if (key === ' ') {
        e.preventDefault();
        if (game.status === State.READY || game.status === State.OVER) game.start();
        else game.togglePause();
        return;
      }

      // Ctrl+Z 悔棋
      if ((e.ctrlKey || e.metaKey) && k === 'z') {
        e.preventDefault();
        if (!game.undo().ok) Sound.invalid();
      }
    });

    // ---------- 控制按钮 ----------
    undoBtn.addEventListener('click', () => {
      if (!game.undo().ok) Sound.invalid();
      canvas.focus();
    });

    pauseBtn.addEventListener('click', () => {
      game.togglePause();
      canvas.focus();
    });

    restartBtn.addEventListener('click', () => {
      game.start(); // OVER->reset->start；其他状态->start
      canvas.focus();
    });

    muteBtn.addEventListener('click', () => {
      Sound.setMuted(!Sound.isMuted());
      try {
        global.localStorage.setItem(Config.STORAGE_KEYS.MUTED, Sound.isMuted() ? '1' : '0');
      } catch (e) { /* 忽略 */ }
      refreshMuteBtn();
    });

    // ---------- 窗口尺寸变化 ----------
    let resizeTimer = null;
    global.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderer.resize(), 120);
    });

    // ---------- 渲染循环 ----------
    function loop(timestamp) {
      try {
        renderer.render(game.state(), timestamp);
      } catch (err) {
        console.error('[Main] 渲染异常：', err);
        overlay.classList.add('show');
        overlay.innerHTML = '<div class="panel"><h2>⚠️ 出错了</h2><p>渲染遇到异常，请刷新页面重试。</p></div>';
        return;
      }
      global.requestAnimationFrame(loop);
    }

    // ---------- 启动 ----------
    syncHud();
    syncButtons();
    refreshMuteBtn();
    showWelcome();
    global.requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
