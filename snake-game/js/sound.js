/**
 * 音效模块（命名空间：Snake.Sound）
 * 使用 Web Audio API 合成音效，无需外部音频文件。
 * 浏览器要求用户交互后才能播放声音，因此 AudioContext 采用懒初始化。
 */
(function (global) {
  'use strict';

  let ctx = null;
  let muted = false;

  /** 懒创建 AudioContext（兼容旧版 Safari 的 webkit 前缀） */
  function ensureContext() {
    if (ctx) return ctx;
    try {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null; // 环境不支持，静默降级
      ctx = new AC();
    } catch (err) {
      console.warn('[Sound] AudioContext 初始化失败，音效已禁用：', err);
      ctx = null;
    }
    return ctx;
  }

  /**
   * 播放一个简单音：正弦/方波，带指数衰减包络。
   * @param {number} freq  频率（Hz）
   * @param {number} duration 时长（秒）
   * @param {OscillatorType} type 波形
   * @param {number} volume 音量 0~1
   * @param {number} delay  延迟（秒）
   */
  function tone(freq, duration, type, volume, delay) {
    if (muted) return;
    const ac = ensureContext();
    if (!ac) return;
    try {
      // 页面被挂起时恢复上下文
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
      // 音频错误不应影响游戏
      console.warn('[Sound] 播放失败：', err);
    }
  }

  const Sound = {
    /** 吃到普通食物 */
    eat() {
      tone(660, 0.09, 'square', 0.12);
      tone(880, 0.1, 'square', 0.1, 0.06);
    },

    /** 吃到奖励食物（上行琶音） */
    bonus() {
      tone(523, 0.08, 'triangle', 0.16);
      tone(659, 0.08, 'triangle', 0.16, 0.07);
      tone(784, 0.08, 'triangle', 0.16, 0.14);
      tone(1047, 0.16, 'triangle', 0.16, 0.21);
    },

    /** 升级音效 */
    levelUp() {
      tone(440, 0.1, 'sawtooth', 0.1);
      tone(554, 0.1, 'sawtooth', 0.1, 0.09);
      tone(659, 0.2, 'sawtooth', 0.12, 0.18);
    },

    /** 游戏结束（下行低音） */
    gameOver() {
      tone(330, 0.18, 'sawtooth', 0.16);
      tone(262, 0.2, 'sawtooth', 0.16, 0.16);
      tone(196, 0.35, 'sawtooth', 0.18, 0.34);
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

    /** 转向轻响 */
    turn() {
      tone(300, 0.03, 'sine', 0.05);
    },

    /** 设置静音状态 */
    setMuted(value) {
      muted = !!value;
    },

    isMuted() {
      return muted;
    }
  };

  global.Snake = global.Snake || {};
  global.Snake.Sound = Sound;
})(typeof window !== 'undefined' ? window : this);
