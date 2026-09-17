# 通用代码开发规则

> 适用于所有语言和项目的通用编码规范。各语言/项目可在本规则基础上叠加特定约束。

---

## 1. 命名规范

### 1.1 变量与函数

| 类型 | 规则 | 示例 |
|------|------|------|
| 变量 | 小驼峰（camelCase） | `userName`、`totalCount`、`isReady` |
| 函数 | 小驼峰（camelCase） | `getUserInfo()`、`calculateTotal()` |
| 常量 | 全大写 + 下划线分隔 | `MAX_RETRY`、`DEFAULT_TIMEOUT` |
| 私有成员 | 前缀下划线 | `_internalState`、`_cache` |

### 1.2 类与类型

| 类型 | 规则 | 示例 |
|------|------|------|
| 类 / 构造函数 | 大驼峰（PascalCase） | `UserController`、`OrderService` |
| 接口 / 类型 | 大驼峰（PascalCase） | `HttpRequest`、`ApiResponse` |
| 枚举 | 大驼峰，成员全大写 | `Color.Red`、`Status.SUCCESS` |
| 泛型参数 | 单个大写字母 | `T`、`K`、`V` |

### 1.3 文件与目录

- 文件名：小写 + 连字符（kebab-case）：`user-controller.js`、`order-service.ts`
- 目录名：小写 + 连字符：`api/v1/user-profile/`
- 每个文件只包含一个主要类/模块，文件名与类名对应

### 1.4 语言专属补充

| 语言 | 补充规则 |
|------|----------|
| Python | 变量/函数用 snake_case；类用 PascalCase；常量用 UPPER_SNAKE |
| Go | 导出标识符首字母大写（PascalCase），未导出首字母小写（camelCase） |
| Java | 包名全小写；类 PascalCase；方法/变量 camelCase；常量 UPPER_SNAKE |
| Rust | 类型 PascalCase；函数/变量 snake_case；常量 UPPER_SNAKE |
| C/C++ | 宏 UPPER_SNAKE；类/结构体 PascalCase；函数/变量 snake_case |

### 1.5 通用原则

- **见名知意**：`calculateTotal` 优于 `calc`，`isUserLoggedIn` 优于 `flag`
- **避免缩写**：`userInfo` 而非 `ui`，`response` 而非 `rsp`
- **布尔值用 is/has/can/should 前缀**：`isEnabled`、`hasPermission`、`canRead`
- **集合用复数**：`users`、`orderItems`

---

## 2. 代码结构

### 2.1 单一职责

- 每个函数只做一件事；函数体建议 ≤ 50 行，超出考虑拆分
- 每个类/模块只负责一个功能领域
- 文件建议 ≤ 500 行，超出考虑拆分

### 2.2 函数设计

```
// 函数参数 ≤ 4 个；超出时封装为对象
// 错误示例
function createOrder(userId, productId, quantity, address, couponCode, paymentMethod) { }

// 正确示例
function createOrder(orderRequest) { }
```

- **默认值**优先于条件分支
- **提前返回**（Guard Clause）减少嵌套：

```javascript
// 避免
function getDiscount(user) {
  if (user) {
    if (user.isMember) {
      return 0.1;
    }
  }
  return 0;
}

// 推荐
function getDiscount(user) {
  if (!user || !user.isMember) return 0;
  return 0.1;
}
```

### 2.3 模块化

- 高内聚低耦合：模块内部逻辑紧密相关，模块之间通过清晰接口交互
- 依赖通过参数注入，而非全局状态
- 公共逻辑提取为工具函数，但避免过早抽象（三次重复再抽取）

---

## 3. 注释规范

### 3.1 注释原则

- **代码说 What，注释说 Why**：自解释代码优先，注释解释意图和原因
- 文件头部注释：说明文件职责
- 函数注释：说明参数、返回值、异常、复杂逻辑
- TODO 格式：`// TODO(作者): 描述` 或 `// FIXME(作者): 描述`

### 3.2 注释示例

```javascript
/**
 * 计算两个日期之间的工作日天数
 * @param {Date} start - 起始日期
 * @param {Date} end - 结束日期（不含）
 * @returns {number} 工作日天数
 * @throws {RangeError} 当 start > end 时抛出
 */
function countWorkingDays(start, end) {
  // 排除法定节假日需要查表，这里先只排除周末
  ...
}
```

### 3.3 禁止的注释

- 修改代码后不删除的旧注释
- 显而易见的注释：`let count = 0; // count 初始化为 0`
- 被注释掉的代码（用版本管理，不靠注释保留废代码）

---

## 4. 错误处理

### 4.1 基本原则

- **只在系统边界校验输入**：用户输入、外部 API、文件读取、网络请求
- 内部代码信任调用方，不加冗余校验
- 不吞异常：捕获后必须处理（日志、恢复或重新抛出）

### 4.2 异常分类

| 类型 | 处理方式 | 示例 |
|------|----------|------|
| 输入校验错误 | 返回明确提示，不抛异常 | `validateForm()` 返回 `{ ok: false, reason }` |
| 业务异常 | 抛出有意义的错误类型 | `throw new ValidationError('邮箱格式不正确')` |
| 系统异常 | 兜底捕获 + 日志 + 降级 | `try { ... } catch { fallback() }` |

### 4.3 示例

```javascript
// 系统边界：校验外部输入
function parseConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: 'invalidInput' };
  }
  return { ok: true, data: raw };
}

// 主流程：兜底 + 降级
try {
  const result = await fetchData();
  render(result);
} catch (err) {
  console.error('[Main] 数据加载失败：', err);
  showErrorMessage('数据加载失败，请重试');
}
```

---

## 5. 格式化

### 5.1 缩进与空格

- 缩进：2 空格（JS/TS/CSS/HTML）或 4 空格（Python/Java/Go）
- 运算符两侧空格：`a + b`、`x === 0`
- 逗号后空格：`[1, 2, 3]`、`f(a, b)`
- 大括号：左括号不换行（K&R 风格），右括号独占一行

### 5.2 行宽

- 建议每行 ≤ 120 字符，超出换行
- 长链调用：每个 `.method()` 独占一行

```javascript
userService
  .getById(userId)
  .then(validate)
  .then(transform)
  .catch(handleError);
```

### 5.3 空行

- 文件末尾保留一个空行
- 函数之间空一行
- 逻辑块之间空一行，块内不随意加空行
- 导入语句与代码之间空一行

---

## 6. 目录与项目结构

```
project-root/
├── src/                  # 源码
│   ├── config/           # 配置常量
│   ├── core/             # 核心逻辑（纯逻辑，无 IO 依赖）
│   ├── api/              # 接口层
│   ├── utils/            # 工具函数
│   └── types/            # 类型定义
├── test/                 # 测试文件（镜像 src 结构）
│   ├── core/
│   └── api/
├── docs/                 # 文档
├── .editorconfig         # 编辑器格式配置
├── .gitignore
└── README.md
```

---

## 7. 测试规范

### 7.1 测试分层

| 层级 | 范围 | 工具示例 |
|------|------|----------|
| 单元测试 | 纯函数/核心逻辑 | Jest、Vitest、pytest |
| 集成测试 | 模块间交互 | Supertest、pytest |
| E2E 测试 | 用户流程 | Playwright、Cypress |

### 7.2 测试命名

```
测试名：被测对象 + 场景 + 预期结果
✓ calculateTotal_空购物车_返回0
✓ placeStone_已占用位置_拒绝落子
```

### 7.3 原则

- 核心/复杂逻辑必须有单元测试
- 测试只验证行为，不验证实现细节
- 测试用例独立，不依赖执行顺序
- 边界条件必测：空值、零值、最大值、非法输入

---

## 8. 版本控制

### 8.1 提交规范（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

| type | 用途 |
|------|------|
| feat | 新功能 |
| fix | 修复 bug |
| refactor | 重构（不改行为） |
| docs | 文档 |
| test | 测试 |
| chore | 构建/工具链 |
| style | 格式调整 |

示例：`feat(game): 添加悔棋功能与键盘快捷键`

### 8.2 分支

- `main` / `master`：可发布状态
- `develop`：集成开发分支
- `feature/<简述>`：功能开发
- `fix/<简述>`：修复分支
- 一个功能一个分支，完成后合并删除

### 8.3 禁止

- 禁止向 main 直接 push（通过 PR/MR）
- 禁止 `--no-verify` 跳过 hook
- 禁止 `--force` 推送到共享分支（除非团队约定）

---

## 9. 性能与安全

### 9.1 性能

- 避免在循环中创建不必要的对象/函数
- 大数据集用分页或流式处理，不全量加载
- 高频回调做防抖（debounce）或节流（throttle）
- 渲染密集场景用 requestAnimationFrame 对齐帧率

### 9.2 安全

- 不拼接 SQL，用参数化查询
- 不拼接 HTML，用模板引擎或转义
- 不提交密钥/凭据到版本库（`.env` 入 `.gitignore`）
- 用户输入必须校验和净化
- 依赖定期更新，关注 CVE

---

## 10. 可维护性

- 重复三次的逻辑考虑提取，但避免过早抽象
- 修改时保持与周围代码风格一致
- 删除代码优于注释代码（版本管理会保留历史）
- 重构与功能改动分开提交
- 公共 API 变更更新文档与示例
