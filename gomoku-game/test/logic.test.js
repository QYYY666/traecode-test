/**
 * 临时单元测试：验证 rules.js + game.js（Node 环境模拟 window/localStorage）
 */
'use strict';

global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); }
};

require('../js/config.js');
require('../js/rules.js');
require('../js/game.js');

const Config = global.Gomoku.Config;
const Rules = global.Gomoku.Rules;
const { createGame, State } = global.Gomoku.Game;
const { BLACK, WHITE, EMPTY, SIZE } = Config;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  PASS:', msg); }
  else { failed++; console.error('  FAIL:', msg); }
}

/** 在空棋盘上按坐标列表摆子（color 交替或指定） */
function makeBoard(cells) {
  const b = Rules.createBoard();
  for (const [x, y, c] of cells) b[y][x] = c;
  return b;
}

// ---- 测试 1：横向五连判定 ----
console.log('Test 1: 横向胜利');
let b = makeBoard([[3, 7, BLACK], [4, 7, BLACK], [5, 7, BLACK], [6, 7, BLACK], [7, 7, BLACK]]);
let win = Rules.checkWin(b, 5, 7);
assert(win && win.winner === BLACK && win.cells.length === 5, '黑棋横 5 连判胜');
assert(JSON.stringify(win.cells.map(c => c.x)) === '[3,4,5,6,7]', '获胜连线坐标正确');

// ---- 测试 2：纵向 / 主斜 / 副斜 ----
console.log('Test 2: 其他方向');
b = makeBoard([[7, 2, WHITE], [7, 3, WHITE], [7, 4, WHITE], [7, 5, WHITE], [7, 6, WHITE]]);
assert(Rules.checkWin(b, 7, 4).winner === WHITE, '白棋竖 5 连');

b = makeBoard([[2, 2, BLACK], [3, 3, BLACK], [4, 4, BLACK], [5, 5, BLACK], [6, 6, BLACK]]);
assert(Rules.checkWin(b, 4, 4).winner === BLACK, '主斜线 5 连');

b = makeBoard([[2, 8, WHITE], [3, 7, WHITE], [4, 6, WHITE], [5, 5, WHITE], [6, 4, WHITE]]);
assert(Rules.checkWin(b, 4, 6).winner === WHITE, '副斜线 5 连');

// ---- 测试 3：四连不判胜 / 六连仍判胜 ----
console.log('Test 3: 连子数量边界');
b = makeBoard([[3, 3, BLACK], [4, 3, BLACK], [5, 3, BLACK], [6, 3, BLACK]]);
assert(Rules.checkWin(b, 5, 3) === null, '4 连不判胜');

b = makeBoard([[3, 3, BLACK], [4, 3, BLACK], [5, 3, BLACK], [6, 3, BLACK], [7, 3, BLACK], [8, 3, BLACK]]);
assert(Rules.checkWin(b, 5, 3) !== null, '6 连（长连）仍判胜');

// ---- 测试 4：边界落点 ----
console.log('Test 4: 边界条件');
b = makeBoard([[0, 0, BLACK], [1, 0, BLACK], [2, 0, BLACK], [3, 0, BLACK], [4, 0, BLACK]]);
assert(Rules.checkWin(b, 0, 0).winner === BLACK, '左上角横 5 连');

b = makeBoard([[SIZE - 1, SIZE - 1, WHITE], [SIZE - 1, SIZE - 2, WHITE], [SIZE - 1, SIZE - 3, WHITE], [SIZE - 1, SIZE - 4, WHITE], [SIZE - 1, SIZE - 5, WHITE]]);
assert(Rules.checkWin(b, SIZE - 1, SIZE - 1).winner === WHITE, '右下角竖 5 连');

b = makeBoard([[SIZE - 5, 4, BLACK], [SIZE - 4, 5, BLACK], [SIZE - 3, 6, BLACK], [SIZE - 2, 7, BLACK], [SIZE - 1, 8, BLACK]]);
assert(Rules.checkWin(b, SIZE - 1, 8).winner === BLACK, '触边主斜 5 连');

// ---- 测试 5：交叉干扰（同一落点两条线） ----
console.log('Test 5: 复合局面');
b = makeBoard([
  [7, 7, BLACK], [8, 7, BLACK], [9, 7, BLACK], [10, 7, BLACK],   // 横向 4
  [7, 6, BLACK], [7, 5, BLACK], [7, 4, BLACK], [7, 3, BLACK],    // 竖向 4
  [6, 7, BLACK]                                                   // 补横向第 5 子
]);
win = Rules.checkWin(b, 6, 7);
assert(win && win.cells.length === 5, '横向 5 连成立（竖向仅 4 不误报）');

// ---- 测试 6：游戏流程 ----
console.log('Test 6: 游戏流程');
const events = [];
const g = createGame({ onEvent: (e) => events.push(e) });
assert(g.state().state === State.READY && g.state().turn === BLACK, '初始 READY 黑先');

g.start();
assert(g.state().state === State.PLAYING, 'start 进入 PLAYING');

let r = g.place(7, 7);
assert(r.ok && g.state().board[7][7] === BLACK && g.state().turn === WHITE, '黑落天元，轮到白');

r = g.place(7, 7);
assert(!r.ok && r.reason === 'occupied', '重复落点被拒绝');

r = g.place(-1, 5);
assert(!r.ok && r.reason === 'outOfBounds', '越界落点被拒绝');

g.togglePause();
assert(g.state().state === State.PAUSED, '暂停');
r = g.place(8, 8);
assert(!r.ok && r.reason === 'notPlaying', '暂停中不能落子');
g.togglePause();
assert(g.state().state === State.PLAYING, '恢复');

// 悔棋
g.place(8, 8); // 白
assert(g.state().history.length === 2, '两手记录');
r = g.undo();
assert(r.ok && g.state().history.length === 1 && g.state().board[8][8] === EMPTY && g.state().turn === WHITE, '悔棋撤销白子并回到白回合');

// 非法悔棋
const g2 = createGame({ onEvent: () => {} });
assert(!g2.undo().ok, '空历史悔棋被拒绝');

// ---- 测试 7：对局中五连结束 + 战绩 ----
console.log('Test 7: 完整对局');
const g3 = createGame({ onEvent: (e) => events.push(e) });
g3.start();
// 黑横 5 连（列 2-6 行 0），白穿插其他位置
const blackMoves = [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0]];
const whiteMoves = [[0, 14], [1, 14], [2, 14], [3, 14], [4, 14]];
for (let i = 0; i < 5; i++) {
  g3.place(blackMoves[i][0], blackMoves[i][1]);
  if (g3.state().state === State.OVER) break;
  g3.place(whiteMoves[i][0], whiteMoves[i][1]);
}
assert(g3.state().state === State.OVER && g3.state().winInfo.winner === BLACK, '黑五连获胜');
assert(g3.state().blackWins >= 1, '黑方胜场 +1');
assert(events.some((e) => e.type === 'win'), '触发 win 事件');

// 结束后落子被拒绝
assert(!g3.place(9, 9).ok, '结束后不能落子');

// 结束后悔棋：回退胜场并恢复对局
const winsBefore = g3.state().blackWins;
r = g3.undo();
assert(r.ok && g3.state().state === State.PLAYING && g3.state().blackWins === winsBefore - 1, '结束后悔棋回退胜场并继续');

// 再来一局（start 在 OVER 时先 reset）
g3.place(9, 9); // 白继续下
g3.start();    // 此时是 PLAYING，start 无效果
assert(g3.state().state === State.PLAYING, 'PLAYING 中 start 不重置');
const g4 = createGame({ onEvent: () => {} });
g4.start();
g4.place(0, 0);
g4.start(); // PLAYING 中无效果
assert(g4.state().history.length === 1, 'start 在 PLAYING 中不重置棋盘');

// ---- 测试 8：战绩持久化 ----
console.log('Test 8: 战绩持久化');
const g5 = createGame({ onEvent: () => {} });
assert(g5.state().blackWins === g3.state().blackWins, '新实例读取到持久化战绩');

// ---- 测试 9：光标移动夹紧 ----
console.log('Test 9: 键盘光标');
const g6 = createGame({ onEvent: () => {} });
g6.start();
for (let i = 0; i < 30; i++) g6.moveCursor(-1, -1); // 持续向左上
assert(g6.state().cursor.x === 0 && g6.state().cursor.y === 0, '光标夹紧在 (0,0)');
for (let i = 0; i < 30; i++) g6.moveCursor(1, 1);
assert(g6.state().cursor.x === SIZE - 1 && g6.state().cursor.y === SIZE - 1, '光标夹紧在右下角');

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed ? 1 : 0);
