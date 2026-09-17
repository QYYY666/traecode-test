/**
 * 渲染模块（命名空间：Gomoku.Renderer）
 * Canvas 绘制：木纹底色棋盘、网格线、星位、棋子（含落子动画）、
 * 最后一手标记、获胜连线高亮、键盘光标。
 * 支持高分屏（devicePixelRatio）与响应式尺寸。
 */
(function (global) {
  'use strict';

  const Config = global.Gomoku.Config;

  const COLORS = {
    woodLight: '#e0b169',
    woodDark: '#c9944a',
    line: '#5b4225',
    star: '#3d2c15',
    lastMark: '#d9482b',
    winGlow: 'rgba(255, 215, 90, 0.85)',
    cursor: 'rgba(40, 25, 5, 0.85)'
  };

  /** 每侧留白占单元格的比例 */
  const PADDING_RATIO = 0.6;

  /**
   * @param {HTMLCanvasElement} canvas
   */
  function createRenderer(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');

    let cell = 30;   // 单元格像素（CSS 像素）
    let pad = 18;    // 棋盘四周留白
    let size = 720;  // 画布边长
    let dpr = 1;

    /** 落子动画状态：{x,y,color,start} */
    let placeAnim = null;
    const PLACE_ANIM_MS = 160;

    /** 根据容器自适应画布尺寸 */
    function resize() {
      const parent = canvas.parentElement;
      const avail = Math.min(parent.clientWidth, global.innerHeight * 0.64);
      size = Math.max(280, Math.floor(avail));
      cell = size / (Config.SIZE - 1 + PADDING_RATIO * 2);
      pad = cell * PADDING_RATIO;
      dpr = global.devicePixelRatio || 1;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** 像素坐标 -> 最近交叉点（用于点击命中） */
    function pixelToGrid(px, py) {
      const x = Math.round((px - pad) / cell);
      const y = Math.round((py - pad) / cell);
      if (x < 0 || x >= Config.SIZE || y < 0 || y >= Config.SIZE) return null;
      // 点击需离交叉点足够近才算有效
      const gx = pad + x * cell;
      const gy = pad + y * cell;
      const dist = Math.hypot(px - gx, py - gy);
      if (dist > cell * 0.48) return null;
      return { x, y };
    }

    /** 交叉点像素坐标 */
    function gridToPixel(gx, gy) {
      return { x: pad + gx * cell, y: pad + gy * cell };
    }

    function drawBoardBackground() {
      // 木纹底色（线性渐变 + 细纹）
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, COLORS.woodLight);
      grad.addColorStop(1, COLORS.woodDark);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // 模拟木纹的半透明条纹
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#6b4a1f';
      ctx.lineWidth = 1;
      for (let i = 0; i < size; i += 7) {
        ctx.beginPath();
        ctx.moveTo(0, i + Math.sin(i * 0.35) * 3);
        ctx.lineTo(size, i + Math.cos(i * 0.28) * 3);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawGrid() {
      const first = pad;
      const last = pad + (Config.SIZE - 1) * cell;

      ctx.strokeStyle = COLORS.line;
      ctx.lineWidth = Math.max(1, cell * 0.04);
      ctx.beginPath();
      for (let i = 0; i < Config.SIZE; i++) {
        const p = pad + i * cell;
        ctx.moveTo(first, p); ctx.lineTo(last, p);   // 横线
        ctx.moveTo(p, first); ctx.lineTo(p, last);   // 竖线
      }
      ctx.stroke();

      // 外框加粗
      ctx.lineWidth = Math.max(1.5, cell * 0.07);
      ctx.strokeRect(first, first, last - first, last - first);

      // 星位
      ctx.fillStyle = COLORS.star;
      for (const [sx, sy] of Config.STAR_POINTS) {
        const p = gridToPixel(sx, sy);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2.5, cell * 0.1), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /** 绘制单颗棋子（scale 用于落子动画） */
    function drawStone(px, py, color, scale) {
      const r = cell * 0.42 * (scale === undefined ? 1 : scale);
      if (r <= 0) return;

      // 阴影
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = cell * 0.12;
      ctx.shadowOffsetY = cell * 0.05;

      const grad = ctx.createRadialGradient(
        px - r * 0.35, py - r * 0.4, r * 0.15,
        px, py, r
      );
      if (color === Config.BLACK) {
        grad.addColorStop(0, '#666');
        grad.addColorStop(0.6, '#1c1c1c');
        grad.addColorStop(1, '#050505');
      } else {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.7, '#e8e8e8');
        grad.addColorStop(1, '#b5b5b5');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 白子描边增强对比
      if (color === Config.WHITE) {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = Math.max(1, cell * 0.03);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function drawStones(board, timestamp) {
      for (let y = 0; y < Config.SIZE; y++) {
        for (let x = 0; x < Config.SIZE; x++) {
          const c = board[y][x];
          if (c === Config.EMPTY) continue;

          // 正在播放落子动画的棋子：从小放大
          let scale;
          if (placeAnim && placeAnim.x === x && placeAnim.y === y) {
            const t = (timestamp - placeAnim.start) / PLACE_ANIM_MS;
            if (t >= 1) { placeAnim = null; scale = 1; }
            else scale = 0.4 + 0.6 * easeOutBack(t);
          }
          const p = gridToPixel(x, y);
          drawStone(p.x, p.y, c, scale);
        }
      }
    }

    /** 落子动画缓动：轻微回弹 */
    function easeOutBack(t) {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    /** 最后一手红点标记 */
    function drawLastMove(history) {
      if (!history.length) return;
      const last = history[history.length - 1];
      const p = gridToPixel(last.x, last.y);
      ctx.fillStyle = COLORS.lastMark;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2.5, cell * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }

    /** 获胜连线高亮（呼吸光晕） */
    function drawWinLine(cells, timestamp) {
      if (!cells || !cells.length) return;
      const pulse = 0.5 + 0.5 * Math.sin(timestamp / 260);
      ctx.save();
      ctx.strokeStyle = COLORS.winGlow;
      ctx.lineWidth = Math.max(2, cell * 0.1);
      ctx.globalAlpha = 0.45 + 0.4 * pulse;
      ctx.lineCap = 'round';

      const a = gridToPixel(cells[0].x, cells[0].y);
      const b = gridToPixel(cells[cells.length - 1].x, cells[cells.length - 1].y);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // 每个胜子外圈
      for (const c of cells) {
        const p = gridToPixel(c.x, c.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, cell * 0.46, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    /** 键盘光标（仅 playing 状态显示） */
    function drawCursor(cursor) {
      const p = gridToPixel(cursor.x, cursor.y);
      ctx.save();
      ctx.strokeStyle = COLORS.cursor;
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      const len = cell * 0.22;
      const off = cell * 0.4;
      // 四角括号样式
      const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (const [sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(p.x + sx * off, p.y + sy * off - sy * len);
        ctx.lineTo(p.x + sx * off, p.y + sy * off);
        ctx.lineTo(p.x + sx * off - sx * len, p.y + sy * off);
        ctx.stroke();
      }
      ctx.restore();
    }

    /** 触发一次落子动画 */
    function animatePlace(x, y, color, timestamp) {
      placeAnim = { x, y, color, start: timestamp || performance.now() };
    }

    /** 渲染一帧 */
    function render(g, timestamp) {
      drawBoardBackground();
      drawGrid();
      drawStones(g.board, timestamp);
      drawLastMove(g.history);
      if (g.winInfo) drawWinLine(g.winInfo.cells, timestamp);
      if (g.state === 'playing') drawCursor(g.cursor);
    }

    resize();

    return { render, resize, pixelToGrid, gridToPixel, animatePlace };
  }

  global.Gomoku = global.Gomoku || {};
  global.Gomoku.Renderer = { createRenderer };
})(typeof window !== 'undefined' ? window : this);
