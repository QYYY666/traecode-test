---
name: quiz-generator
description: >
  自动生成可批改的测验题目并批改答卷。Use when 用户提到 出题/生成题目/组卷/测验/小测/quiz、
  按知识点练习、批改答案/阅卷/评分、选择/填空/判断/简答题，to 生成符合规范的题目 JSON、
  校验、批改并输出带正确答案/错误分析/知识点讲解的结构化反馈，
  by 调用 scripts/quiz_engine.py（validate/grade/sample）。支持自定义题型、难度（easy/medium/hard）
  与数量。Do NOT use when 用户只是想讲解知识点而不要题目、需要真实的在线考试系统（防作弊/并发）、
  或需要题目以 Word/PDF 之外的复杂排版导出。
metadata:
  version: "1.0.0"
  domain: education
  triggers: [出题, 生成题目, 批改, 阅卷, 测验, quiz, 组卷, 判分]
---

# Quiz Generator（自动出题批改）

生成符合教育规范的测验题、用确定性引擎批改、输出结构化反馈。
核心脚本 `scripts/quiz_engine.py` 仅依赖 Python 3.8+ 标准库，30 项单元测试见 `scripts/test_quiz_engine.py`。

## 角色分工（重要）

- **你（AI）负责生成题目**：按知识点/主题撰写题干、选项、答案、解析。
- **脚本负责校验与判分**：题目 JSON 规范校验、客观题确定性判分、简答题关键词预评分。
- **你负责简答题终审**：预评分一律 `needs_review=true`，按批改指南复核后定分。

## 工作流

### 1. 明确出题参数

向用户确认或从请求推断：主题/知识点列表、题型组合、难度、数量、每题分值。
未指定时的默认：4 题一套 = 单选 2 + 填空 1 + 简答 1，难度 medium，总分 25。

### 2. 生成题目 JSON

- 先看模板：`python scripts/quiz_engine.py sample --type <choice|judge|fill|short>`
- 字段规范：**必读** [references/question-schema.md](references/question-schema.md)
- 难度对应认知层级（布鲁姆分类法），出题时据此设计认知要求：
  - `easy`：记忆/理解——直接回忆定义、复述概念
  - `medium`：应用/分析——变式运用、对比辨析
  - `hard`：评价/创造——多步推理、综合判断、方案权衡

### 3. 校验（必做，不通过不得交给用户）

```bash
python scripts/quiz_engine.py validate questions.json
```

### 4. 收集作答并批改

```bash
python scripts/quiz_engine.py grade questions.json answers.json -o result.json
```

### 5. 简答题终审（必做）

对每个 `needs_review: true` 的题目，以 `explanation` 为基准核对预评分、
修正语义等价/答非所问的偏差。细则与反馈语规范：
**必读** [references/grading-guide.md](references/grading-guide.md)

### 6. 输出反馈

按"得分 → 你的答案 vs 正确答案 → 错误分析 → 知识点讲解 → 复习建议"顺序组织，
汇总用 `summary` 字段（总分、客观题正确率、分题型统计）。

## 编程接入

CLI 参数、Python API、集成注意事项见 [references/api.md](references/api.md)。

## ⚠️ Gotchas

- **生成后必须先 `validate` 再使用**——直接批改会在题目非法时整体失败（不输出部分结果）。
- **填空题 `answers` 必须收录同义写法**——归一化只处理全半角/标点/大小写，
  不会做同义词扩展；漏收会导致正确答案被判错。
- **避免仅靠大小写区分的填空题**——归一化统一转小写，`O(n)` 与 `o(n)` 视为相同。
- **多空题拆成多道 fill**——引擎一题只判一个空。
- **简答题分数未经终审不得直接汇报**——关键词覆盖是机械匹配，
  字面命中可能答非所问，语义等价可能被判缺。
- **题目 id 必须唯一且与作答键一致**——批改按 id 对齐，错位会全卷误判。
- **文件一律 UTF-8 编码**——Windows 下用编辑器另存 ANSI 会中文乱码。
- **regex 字段是 Python 语法**（`re.fullmatch`），PCRE 语法（如 `(?<=...)` 变体）部分不兼容。
- **多选题计分规则**：(命中−误选)/正确数，漏选给部分分、误选倒扣至 0——向用户说明，勿手工改分。
