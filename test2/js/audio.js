/**
 * 音效管理模块
 * 使用 Web Audio API 生成游戏音效，无需外部音频文件
 */

class AudioManager {
    /**
     * 构造函数 - 初始化音频上下文
     */
    constructor() {
        // 音频上下文（延迟初始化，避免浏览器自动播放限制）
        this.audioContext = null;
        this.isEnabled = true;
    }

    /**
     * 初始化音频上下文
     * 需要在用户交互后调用，以符合浏览器自动播放政策
     */
    init() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.warn('音频上下文初始化失败:', error);
                this.isEnabled = false;
            }
        }

        // 如果音频上下文被暂停，尝试恢复
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * 播放吃食物音效
     * 短促的高音，表示得分
     */
    playEat() {
        if (!this.isEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 设置音调和时长
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('播放音效失败:', error);
        }
    }

    /**
     * 播放特殊食物音效
     * 更欢快的音调，表示获得高分
     */
    playSpecialFood() {
        if (!this.isEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 设置音调和时长（上行音阶）
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(900, this.audioContext.currentTime + 0.05);
            oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        } catch (error) {
            console.warn('播放音效失败:', error);
        }
    }

    /**
     * 播放游戏结束音效
     * 低沉的下行音调，表示失败
     */
    playGameOver() {
        if (!this.isEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 设置音调和时长（下行音阶）
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('播放音效失败:', error);
        }
    }

    /**
     * 播放游戏开始音效
     * 轻快的音调，表示游戏开始
     */
    playStart() {
        if (!this.isEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 设置音调和时长
            oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(700, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (error) {
            console.warn('播放音效失败:', error);
        }
    }

    /**
     * 播放暂停音效
     * 简短的提示音
     */
    playPause() {
        if (!this.isEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('播放音效失败:', error);
        }
    }

    /**
     * 切换音效开关
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        return this.isEnabled;
    }
}
