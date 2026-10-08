# 贪吃蛇游戏开发计划

## 1. 需求分析

### 功能需求
- 游戏主界面：Canvas 渲染的游戏区域
- 分数显示区：实时显示当前分数和最高分数
- 控制按钮：开始/暂停/重新开始
- 游戏规则说明：展示操作方式和计分规则
- 蛇的移动控制：支持键盘方向键操作
- 食物生成与碰撞检测：食物碰撞、边界碰撞、自身碰撞
- 分数计算机制：每吃到一个食物增加固定分数（10分）
- 欢迎界面：游戏开始前的展示
- 结束界面：游戏结束后的结果展示
- 动画效果：蛇移动平滑、食物闪烁等
- 音效：吃食物、游戏结束等音效
- 难度递增：随分数增加提升蛇的移动速度

### 技术需求
- 渲染技术：HTML5 Canvas
- 编程语言：原生 JavaScript（ES6+）
- 响应式布局：适配不同屏幕尺寸
- 代码结构：模块化、清晰注释
- 代码注释：全部使用中文
- 文件命名：小写英文字母，单词间用短横线分隔

## 2. 文件结构

```
test2/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── config.js       # 游戏配置常量
│   ├── audio.js        # 音效管理模块
│   ├── snake.js        # 蛇类模块
│   ├── food.js         # 食物类模块
│   ├── game.js         # 游戏主逻辑模块
│   └── main.js         # 入口文件
└── .trae/
    └── documents/
        └── snake-game-plan.md  # 本计划文件
```

## 3. 详细设计

### 3.1 index.html
- 页面结构：头部（标题+分数）、游戏区域（Canvas）、控制按钮、规则说明
- 欢迎界面：游戏开始前显示，包含开始按钮
- 结束界面：游戏结束后显示，包含最终分数和重新开始按钮
- 响应式 meta 标签

### 3.2 css/style.css
- 整体布局：Flexbox 居中布局
- 游戏区域：Canvas 边框、背景
- 按钮样式：悬停效果、点击效果
- 欢迎/结束界面：模态框样式
- 响应式：媒体查询适配移动端

### 3.3 js/config.js
```javascript
// 游戏配置常量
const CONFIG = {
  GRID_SIZE: 20,           // 网格大小（像素）
  GRID_COUNT: 20,          // 网格数量（20x20）
  INITIAL_SPEED: 150,      // 初始速度（毫秒/帧）
  SPEED_INCREMENT: 5,      // 每食物加速
  MIN_SPEED: 50,           // 最小速度（最快）
  FOOD_SCORE: 10,          // 每食物分数
  COLORS: {
    SNAKE_HEAD: '#4CAF50',
    SNAKE_BODY: '#8BC34A',
    FOOD: '#FF5722',
    GRID: '#E0E0E0'
  }
};
```

### 3.4 js/audio.js
- 音效管理类
- 方法：playEat()、playGameOver()、playStart()
- 使用 Web Audio API 生成简单音效（无需外部文件）

### 3.5 js/snake.js
- Snake 类
- 属性：body（数组）、direction、nextDirection
- 方法：move()、grow()、changeDirection()、checkSelfCollision()、reset()
- 绘制方法：draw()

### 3.6 js/food.js
- Food 类
- 属性：position、isSpecial
- 方法：generate()（随机生成，避免与蛇重叠）、draw()
- 特殊食物：10%概率生成金色食物，分数翻倍

### 3.7 js/game.js
- Game 类（核心）
- 属性：snake、food、score、highScore、isRunning、isPaused、speed
- 方法：start()、pause()、restart()、gameOver()、update()、render()
- 游戏循环：使用 requestAnimationFrame 或 setInterval
- 碰撞检测：食物碰撞、边界碰撞、自身碰撞
- 难度递增：根据分数调整速度

### 3.8 js/main.js
- 入口文件
- 初始化游戏实例
- 绑定事件：键盘事件、按钮点击事件
- 页面加载完成后启动

## 4. 关键实现细节

### 4.1 游戏循环
```javascript
// 使用 setInterval 控制游戏速度，便于动态调整
gameLoop() {
  if (!this.isRunning || this.isPaused) return;
  this.update();
  this.render();
  setTimeout(() => this.gameLoop(), this.speed);
}
```

### 4.2 碰撞检测
- 食物碰撞：蛇头坐标与食物坐标相同
- 边界碰撞：蛇头坐标超出 Canvas 边界
- 自身碰撞：蛇头坐标与身体任意部分坐标相同

### 4.3 难度递增
- 每吃一个食物，速度减少 SPEED_INCREMENT 毫秒
- 最低速度限制为 MIN_SPEED

### 4.4 响应式设计
- Canvas 尺寸根据屏幕大小动态调整
- 使用 CSS 媒体查询适配移动端
- 移动端添加虚拟方向键（可选）

### 4.5 音效实现
使用 Web Audio API 生成简单音效：
```javascript
playEat() {
  // 吃食物音效：短促的高音
  const oscillator = this.audioContext.createOscillator();
  oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
  // ... 其他设置
}
```

## 5. 实现步骤

### 步骤 1：创建 HTML 结构
- 创建 index.html
- 包含所有必要的 DOM 元素
- 引入 CSS 和 JS 文件

### 步骤 2：编写样式
- 创建 css/style.css
- 实现整体布局和响应式设计
- 添加动画效果样式

### 步骤 3：实现配置模块
- 创建 js/config.js
- 定义所有游戏常量

### 步骤 4：实现音效模块
- 创建 js/audio.js
- 实现音效管理类

### 步骤 5：实现蛇类
- 创建 js/snake.js
- 实现移动、生长、方向控制、碰撞检测

### 步骤 6：实现食物类
- 创建 js/food.js
- 实现食物生成和绘制

### 步骤 7：实现游戏主逻辑
- 创建 js/game.js
- 实现游戏循环、分数计算、难度递增
- 实现开始/暂停/重新开始功能

### 步骤 8：实现入口文件
- 创建 js/main.js
- 初始化游戏、绑定事件

### 步骤 9：测试和优化
- 测试所有功能
- 优化性能和用户体验

## 6. 验证方式

1. 打开 index.html，确认欢迎界面正常显示
2. 点击开始按钮，确认游戏正常启动
3. 使用方向键控制蛇移动，确认响应正常
4. 吃到食物，确认分数增加、蛇变长、速度加快
5. 撞墙或撞到自己，确认游戏结束界面显示
6. 点击重新开始，确认游戏重置正常
7. 点击暂停/继续，确认功能正常
8. 在不同屏幕尺寸下测试响应式布局
9. 检查控制台无错误信息

## 7. 扩展性考虑

- 模块化设计便于添加新功能
- 配置集中管理便于调整参数
- 音效模块独立便于添加新音效
- 可扩展：添加障碍物、多种食物、排行榜等
