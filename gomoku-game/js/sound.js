/**
 * 音效模块（命名空间：Gomoku.Sound）
 * Web Audio 合成音效，无外部音频文件；AudioContext 懒初始化。
 */
(function (global) {
  'use strict';

  let ctx = null;
  let muted = false;

  function ensureContext() {
    if (ctx) return ctx;
    try {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (err) {
      console.warn('[Sound] AudioContext 初始化失败，音效已禁用：', err);
      ctx = null;
    }
    return ctx;
  }

  /** 播放单音：freq/duration/type/volume/delay */
  function tone(freq, duration, type, volume, delay) {
    if (muted) return;
    const ac = ensureContext();
    if (!ac) return;
    try {
      if (ac.state === 'suspended') ac.resume();
      const t0 = ac.currentTime + (delay || 0);
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(volume || 0.15, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch (err) {
      console.warn('[Sound] 播放失败：', err);
    }
  }

  const Sound = {
    /** 落子：模拟棋子敲击棋盘的短促声 */
    place() {
      tone(180, 0.06, 'triangle', 0.25);
      tone(90, 0.1, 'sine', 0.2, 0.01);
    },

    /** 悔棋 */
    undo() {
      tone(300, 0.08, 'sine', 0.12);
      tone(220, 0.12, 'sine', 0.12, 0.07);
    },

    /** 胜利（上行和弦） */
    win() {
      tone(523, 0.12, 'triangle', 0.16);
      tone(659, 0.12, 'triangle', 0.16, 0.1);
      tone(784, 0.12, 'triangle', 0.16, 0.2);
      tone(1047, 0.3, 'triangle', 0.18, 0.3);
    },

    /** 平局 */
    draw() {
      tone(440, 0.15, 'sine', 0.14);
      tone(440, 0.15, 'sine', 0.14, 0.2);
    },

    /** 开始 / 恢复 */
    start() {
      tone(523, 0.08, 'sine', 0.12);
      tone(784, 0.12, 'sine', 0.12, 0.08);
    },

    /** 暂停 */
    pause() {
      tone(440, 0.12, 'sine', 0.1);
    },

    /** 非法操作提示音 */
    invalid() {
      tone(160, 0.1, 'square', 0.08);
    },

    setMuted(value) { muted = !!value; },
    isMuted() { return muted; }
  };

  global.Gomoku = global.Gomoku || {};
  global.Gomoku.Sound = Sound;
})(typeof window !== 'undefined' ? window : this);
