---
alwaysApply: true
---
# 项目代码编写规则

> 本文件为 Trae 项目级规则，AI 编码时必须遵守。

## 0. 工作流程

- 修改代码前，必须先说明要改哪些文件、怎么改，经确认后再动手

## 1. 命名规范

- 变量、函数：小驼峰（`userName`、`getUserInfo`）；Python 遵循 PEP8 用蛇形（`user_name`）
- 类、接口、枚举类型：大驼峰（`UserInfo`、`HttpClient`）
- 常量：全大写 + 下划线（`MAX_RETRY_COUNT`）
- 私有成员：前缀下划线或 `#`（`_internalState`）
- 布尔变量/函数：以 `is/has/can/should` 开头（`isVisible`、`hasPermission`）
- 事件处理函数：`on` + 事件名（`onDragMove`、`onClick`）
- 文件名：统一小写英文字母，单词间用短横线分隔（`my-page.html`、`quiz-engine.py`、`game-renderer.js`）
- 禁止使用无意义命名（`a`、`temp2`、`data1`）

## 2. 注释规范

- **所有代码注释一律使用中文**
- 复杂的长函数必须加注释：函数头写"用途 + 参数 + 返回值"，内部关键算法/魔法数字处写行内注释
- 注释解释 **为什么**，而不是复述代码做了什么；代码自解释处不加废话注释
- 公共 API、导出函数必须有文档注释（JSDoc / docstring）
- 临时方案标记 `// TODO(作者): 描述`，缺陷标记 `// FIXME(作者): 描述`
- 禁止提交被注释掉的废代码——删除它，Git 会记住历史

## 3. 函数与结构

- 单一职责：一个函数只做一件事；超过 50 行必须拆分或补充注释说明分块逻辑
- 嵌套不超过 3 层，超过则用 Guard Clause 提前返回
- 参数不超过 4 个，更多时改传对象
- 禁止硬编码：路径、端口、阈值等提取为常量或配置

## 4. 错误处理

- 只在系统边界（用户输入、外部接口、文件/网络 IO）做校验，内部代码信任约定
- 禁止空 `catch` 吞异常；必须记录日志或向上抛出带上下文的错误
- 用户可见的错误信息必须可读（说明发生了什么、怎么办），禁止暴露堆栈

## 5. 格式与提交

- 缩进 2 或 4 空格（按语言惯例），单文件风格统一；行宽 ≤120
- 提交信息用 Conventional Commits：`feat: xxx` / `fix: xxx` / `docs: xxx`
- 禁止 `git push --force`、禁止 `--no-verify` 跳过钩子

## 6. 技术栈

- 只使用原生 HTML / CSS / JavaScript，不引入前端框架（Vue、React、Angular 等）
- 可使用原生 Web API（Canvas、SVG、Web Audio、Fetch 等）；如需工具链仅限构建工具（如 Vite 打包），不引入框架运行时

## 7. 环境与路径（硬性要求）

- **所有项目、代码、临时文件一律创建在 `D:\trae_project` 下，禁止在 C 盘创建任何文件**；工具强制的瞬时缓存（如 `%TEMP%`）须在任务结束前清理
- 浏览器自动化/测试一律使用 **Edge**（msedge），禁止使用 Chrome
- Python 命令用 `python`（非 python3），版本 3.12
- 本地静态页面可直接双击用 Edge 打开；需要服务器时用 `python -m http.server <port>`

## 8. 测试要求

- 新功能交付前必须运行/验证；核心逻辑（算法、判分、状态机）写单元测试
- 测试命名：`test_被测行为_期望结果`；边界条件（空值、越界、重复）必测
