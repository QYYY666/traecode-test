/**
 * 渲染模块（命名空间：Snake.Renderer）
 * 负责把游戏状态绘制到 Canvas 上：棋盘、蛇、食物、粒子特效。
 * 支持高分屏（devicePixelRatio）与响应式尺寸。
 */
(function (global) {
  'use strict';

  const Config = global.Snake.Config;

  const COLORS = {
    bgTop: '#0f2027',
    bgBottom: '#203a43',
    gridLine: 'rgba(255,255,255,0.04)',
    snakeHead: '#7ee787',
    snakeBody1: '#3fb950',
    snakeBody2: '#2ea043',
    snakeEye: '#0d1117',
    food: '#ff6b6b',
    foodGlow: 'rgba(255,107,107,0.35)',
    bonus: '#ffd166',
    bonusGlow: 'rgba(255,209,102,0.4)',
    particle: ['#7ee787', '#ff6b6b', '#ffd166', '#58a6ff']
  };

  /**
   * @param {HTMLCanvasElement} canvas
   */
  function createRenderer(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');

    let cell = 20;          // 单元格像素尺寸（CSS 像素）
    let dpr = 1;            // 设备像素比
    const particles = [];   // 粒子特效池

    /** 根据容器宽度自适应画布尺寸，保证像素清晰 */
    function resize() {
      const parent = canvas.parentElement;
      const avail = Math.min(parent.clientWidth, global.innerHeight * 0.62);
      const size = Math.max(240, Math.floor(avail / Config.GRID) * Config.GRID);
      cell = size / Config.GRID;
      dpr = global.devicePixelRatio || 1;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** 在格子中心生成爆裂粒子 */
    function spawnParticles(gx, gy, color) {
      const cx = (gx + 0.5) * cell;
      const cy = (gy + 0.5) * cell;
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
        const speed = 0.06 + Math.random() * 0.1;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed * cell,
          vy: Math.sin(angle) * speed * cell,
          life: 1,
          color: color || COLORS.particle[i % COLORS.particle.length]
        });
      }
    }

    function drawBackground() {
      const size = cell * Config.GRID;
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, COLORS.bgTop);
      grad.addColorStop(1, COLORS.bgBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // 网格线
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < Config.GRID; i++) {
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, size);
        ctx.moveTo(0, i * cell);
        ctx.lineTo(size, i * cell);
      }
      ctx.stroke();
    }

    /** 绘制一个圆角格子（蛇身单元） */
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawSnake(snake, timestamp) {
      const pad = Math.max(1, cell * 0.08);
      const r = cell * 0.3;

      for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        const t = snake.length > 1 ? i / (snake.length - 1) : 0;

        // 身体颜色从头到尾渐变
        if (i === 0) {
          ctx.fillStyle = COLORS.snakeHead;
          ctx.shadowColor = COLORS.snakeHead;
          ctx.shadowBlur = cell * 0.5;
        } else {
          ctx.fillStyle = t % 0.16 < 0.08 ? COLORS.snakeBody1 : COLORS.snakeBody2;
          ctx.shadowBlur = 0;
        }

        const x = s.x * cell + pad;
        const y = s.y * cell + pad;
        const w = cell - pad * 2;
        roundRect(x, y, w, w, r);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 蛇眼：根据头部朝向偏移
        if (i === 0) {
          const cx = s.x * cell + cell / 2;
          const cy = s.y * cell + cell / 2;
          const eyeOffset = cell * 0.18;
          const blink = Math.sin(timestamp / 300) > 0.96 ? 0.2 : 1; // 偶尔眨眼
          ctx.fillStyle = COLORS.snakeEye;
          ctx.beginPath();
          ctx.ellipse(cx - eyeOffset, cy - eyeOffset * 0.6, cell * 0.07, cell * 0.07 * blink, 0, 0, Math.PI * 2);
          ctx.ellipse(cx + eyeOffset, cy - eyeOffset * 0.6, cell * 0.07, cell * 0.07 * blink, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawFood(food, timestamp) {
      if (!food) return;
      const cx = (food.x + 0.5) * cell;
      const cy = (food.y + 0.5) * cell;
      const pulse = 1 + Math.sin(timestamp / 220) * 0.12; // 呼吸动画
      const radius = cell * 0.34 * pulse;

      // 光晕
      ctx.fillStyle = COLORS.foodGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.7, 0, Math.PI * 2);
      ctx.fill();

      // 苹果主体
      const grad = ctx.createRadialGradient(cx - radius * 0.4, cy - radius * 0.4, radius * 0.2, cx, cy, radius);
      grad.addColorStop(0, '#ffa8a8');
      grad.addColorStop(1, COLORS.food);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // 果柄
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.quadraticCurveTo(cx + cell * 0.1, cy - radius - cell * 0.15, cx + cell * 0.18, cy - radius - cell * 0.1);
      ctx.stroke();
    }

    function drawBonus(bonus, timestamp) {
      if (!bonus) return;
      const cx = (bonus.x + 0.5) * cell;
      const cy = (bonus.y + 0.5) * cell;
      const remain = Math.max(0, bonus.expireAt - timestamp);
      const ratio = Math.min(1, remain / Config.BONUS_LIFETIME);
      const radius = cell * 0.32 * (1 + Math.sin(timestamp / 160) * 0.1);

      // 旋转光晕
      ctx.fillStyle = COLORS.bonusGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 星形
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(timestamp / 600);
      ctx.fillStyle = COLORS.bonus;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 倒计时环
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
    }

    function drawParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= dt / 600;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, cell * 0.08 * p.life + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    let lastFrame = 0;

    /** 渲染一帧 */
    function render(gameState, timestamp) {
      const dt = lastFrame ? Math.min(50, timestamp - lastFrame) : 16;
      lastFrame = timestamp;

      drawBackground();
      drawFood(gameState.food, timestamp);
      drawBonus(gameState.bonus, timestamp);
      drawSnake(gameState.snake, timestamp);
      drawParticles(dt);
    }

    resize();

    return { render, resize, spawnParticles };
  }

  global.Snake = global.Snake || {};
  global.Snake.Renderer = { createRenderer, COLORS };
})(typeof window !== 'undefined' ? window : this);
