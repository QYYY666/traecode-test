/**
 * 输入模块（命名空间：Snake.Input）
 * 统一处理键盘方向键 / WASD、空格暂停、移动端滑动手势。
 * 通过回调把"方向请求"和"控制请求"交给游戏主逻辑，保持模块解耦。
 */
(function (global) {
  'use strict';

  /** 键位 -> 方向向量 映射 */
  const KEY_MAP = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 }
  };

  /**
   * @param {Object} handlers
   * @param {(dir:{x:number,y:number})=>void} handlers.onDirection  请求改变方向
   * @param {()=>void} handlers.onTogglePause  空格：暂停/继续
   * @param {()=>void} handlers.onConfirm      回车/空格：在欢迎与结束界面确认开始
   * @param {HTMLElement} handlers.surface      监听滑动手势的元素（画布）
   */
  function createInput(handlers) {
    const SWIPE_THRESHOLD = 24; // 滑动最小像素距离
    let touchStart = null;

    function handleKeyDown(e) {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (key === ' ' || key === 'Spacebar') {
        e.preventDefault(); // 阻止页面滚动
        handlers.onTogglePause();
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        handlers.onConfirm();
        return;
      }

      const dir = KEY_MAP[key];
      if (dir) {
        e.preventDefault();
        handlers.onDirection(dir);
      }
    }

    function handleTouchStart(e) {
      if (e.touches.length !== 1) return;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    function handleTouchEnd(e) {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;

      // 滑动距离过短视为点击，忽略
      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

      // 取位移较大的轴作为方向
      const dir = Math.abs(dx) > Math.abs(dy)
        ? { x: dx > 0 ? 1 : -1, y: 0 }
        : { x: 0, y: dy > 0 ? 1 : -1 };
      handlers.onDirection(dir);
      e.preventDefault();
    }

    function attach() {
      global.document.addEventListener('keydown', handleKeyDown);
      if (handlers.surface) {
        handlers.surface.addEventListener('touchstart', handleTouchStart, { passive: true });
        handlers.surface.addEventListener('touchend', handleTouchEnd, { passive: false });
      }
    }

    function detach() {
      global.document.removeEventListener('keydown', handleKeyDown);
      if (handlers.surface) {
        handlers.surface.removeEventListener('touchstart', handleTouchStart);
        handlers.surface.removeEventListener('touchend', handleTouchEnd);
      }
    }

    return { attach, detach };
  }

  global.Snake = global.Snake || {};
  global.Snake.Input = { createInput };
})(typeof window !== 'undefined' ? window : this);
