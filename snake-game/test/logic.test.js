/**
 * 临时单元测试：验证 game.js 核心逻辑（Node 环境模拟 window/localStorage）
 */
'use strict';

// 模拟浏览器环境
global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); }
};

require('../js/config.js');
require('../js/game.js');

const { createGame, State } = global.Snake.Game;
const Config = global.Snake.Config;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS:', msg); }
  else { failed++; console.error('  FAIL:', msg); }
}

// ---- 测试 1：初始状态 ----
console.log('Test 1: 初始状态');
const events = [];
const g = createGame({ onEvent: (e) => events.push(e) });
const s = g.state();
assert(s.state === State.READY, '初始为 READY');
assert(s.snake.length === Config.INITIAL_LENGTH, `初始长度 ${Config.INITIAL_LENGTH}`);
assert(!!s.food, '食物已生成');
assert(s.snake.every((c) => c.x !== s.food.x || c.y !== s.food.y), '食物不在蛇身上');

// ---- 测试 2：移动与吃食物 ----
console.log('Test 2: 移动与吃食物');
g.start();
assert(g.state().state === State.RUNNING, 'start 后进入 RUNNING');

// 手动把食物放到蛇头正前方，验证吃食物加分
g.state().food = { x: g.state().snake[0].x + 1, y: g.state().snake[0].y };
const beforeLen = g.state().snake.length;
g.update(1000);
g.update(1000 + Config.BASE_INTERVAL); // 触发一步
assert(g.state().score === Config.FOOD_SCORE, `吃到食物 +${Config.FOOD_SCORE} 分（实际 ${g.state().score}）`);
assert(g.state().snake.length === beforeLen + 1, '蛇身增长 1 节');
assert(events.some((e) => e.type === 'eat'), '触发 eat 事件');

// ---- 测试 3：反向输入被拒绝 ----
console.log('Test 3: 方向控制');
g.requestDirection({ x: -1, y: 0 }); // 当前向右，请求向左 = 反向
g.update(1000 + Config.BASE_INTERVAL * 2);
assert(g.state().dir.x === 1, '反向请求被忽略');
g.requestDirection({ x: 0, y: 1 }); // 向下合法
g.update(1000 + Config.BASE_INTERVAL * 3);
assert(g.state().dir.y === 1, '合法转向被接受');

// ---- 测试 4：边界碰撞 ----
console.log('Test 4: 边界碰撞');
const g2 = createGame({ onEvent: () => {} });
g2.start();
g2.state().snake = [{ x: Config.GRID - 1, y: 5 }, { x: Config.GRID - 2, y: 5 }, { x: Config.GRID - 3, y: 5 }];
g2.state().dir = { x: 1, y: 0 };
g2.state().food = { x: 0, y: 0 };
g2.update(5000);
g2.update(5000 + Config.BASE_INTERVAL); // 向右撞墙
assert(g2.state().state === State.OVER, '撞墙后游戏结束');

// ---- 测试 5：自身碰撞 ----
console.log('Test 5: 自身碰撞');
const g3 = createGame({ onEvent: () => {} });
g3.start();
// 构造一条蛇：头在 (10,10) 向右，身体绕回来使 (11,10) 是尾巴前一节
g3.state().snake = [
  { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 9, y: 11 },
  { x: 10, y: 11 }, { x: 11, y: 11 }, { x: 11, y: 10 }
];
g3.state().dir = { x: 1, y: 0 };
g3.state().food = { x: 0, y: 0 };
// 头向右走到 (11,10)，那是尾巴（最后一节）。尾巴会让位，所以不算碰撞 -> 验证该规则
g3.update(5000);
g3.update(5000 + Config.BASE_INTERVAL);
assert(g3.state().state === State.RUNNING, '追尾（尾巴让位）不算碰撞');

const g4 = createGame({ onEvent: () => {} });
g4.start();
g4.state().snake = [
  { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 9, y: 11 },
  { x: 10, y: 11 }, { x: 11, y: 11 }, { x: 11, y: 10 }, { x: 12, y: 10 }
];
g4.state().dir = { x: 1, y: 0 };
g4.state().food = { x: 0, y: 0 };
// (11,10) 现在是身体中间节 -> 撞自己
g4.update(5000);
g4.update(5000 + Config.BASE_INTERVAL);
assert(g4.state().state === State.OVER, '撞到身体游戏结束');

// ---- 测试 6：等级与速度 ----
console.log('Test 6: 难度递增');
const g5 = createGame({ onEvent: () => {} });
g5.start();
// 把蛇放到棋盘中部向上走，食物放角落，避免误撞/误吃影响断言
g5.state().snake = [{ x: 12, y: 12 }, { x: 12, y: 13 }, { x: 12, y: 14 }];
g5.state().dir = { x: 0, y: -1 };
g5.state().food = { x: 0, y: 0 };
const iv1 = g5.currentInterval();
g5.state().score = 100; // 应为 3 级
g5.update(5000); // 触发一步 -> refreshLevel
const iv3 = g5.currentInterval();
assert(g5.state().level === 3, '100 分 = 等级 3');
assert(iv3 < iv1, `速度提升（间隔 ${iv1}ms -> ${iv3}ms）`);
g5.state().score = 999999;
g5.update(999999);
assert(g5.state().level === Config.MAX_LEVEL, `等级封顶 ${Config.MAX_LEVEL}`);
assert(g5.currentInterval() >= Config.MIN_INTERVAL, `间隔不低于下限 ${Config.MIN_INTERVAL}ms`);

// ---- 测试 7：暂停/恢复/重开 ----
console.log('Test 7: 状态机');
const g6 = createGame({ onEvent: () => {} });
g6.start();
g6.pause();
assert(g6.state().state === State.PAUSED, 'pause 进入 PAUSED');
g6.update(100000); // 暂停期间不推进
g6.pause();
assert(g6.state().state === State.RUNNING, '再次 pause 恢复 RUNNING');
g6.restart();
assert(g6.state().state === State.RUNNING && g6.state().score === 0, 'restart 重置分数并运行');

// ---- 测试 8：最高分持久化 ----
console.log('Test 8: 最高分');
const g7 = createGame({ onEvent: () => {} });
g7.start();
g7.state().score = 777;
g7.state().snake = [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }];
g7.state().dir = { x: -1, y: 0 };
g7.state().food = { x: 23, y: 23 };
g7.update(5000);
g7.update(5000 + Config.BASE_INTERVAL); // 撞左墙
assert(g7.state().highScore === 777, '破纪录后 highScore=777');
const g8 = createGame({ onEvent: () => {} });
assert(g8.state().highScore === 777, '新实例从 localStorage 读到最高分');

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed ? 1 : 0);
