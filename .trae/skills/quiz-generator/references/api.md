# API 与集成（api）

`scripts/quiz_engine.py` 提供命令行与 Python 两种接入方式。依赖：仅 Python 3.8+ 标准库。

## CLI

```bash
# 1. 校验题目文件（生成题目后必须先校验）
python scripts/quiz_engine.py validate questions.json

# 2. 批改答卷
python scripts/quiz_engine.py grade questions.json answers.json -o result.json

# 3. 输出某题型模板骨架（供生成参考）
python scripts/quiz_engine.py sample --type short --difficulty hard
```

- 题目文件：题目数组或 `{"meta":..., "questions":[...]}`，规范见 question-schema.md
- 作答文件：`{"answers": {"q1": 0, "q2": true, "q3": "文本", "q4": [0,2]}}`
  （键为题目 id；也兼容直接写映射省略外层 `answers`）
- `grade` 的 `-o` 缺省时结果打印到 stdout；`validate`/`grade` 失败返回非 0 退出码

## Python 调用

```python
import json, sys
sys.path.insert(0, "scripts")
from quiz_engine import validate_quiz, grade_quiz

questions = json.load(open("questions.json", encoding="utf-8"))
questions = questions["questions"] if isinstance(questions, dict) else questions

errors = validate_quiz(questions)          # ["..."] 为空即通过
result = grade_quiz(questions, {"answers": {"q1": 0}})
# result["summary"]: total_score / max_total / objective_correct / needs_review_count / by_type
# result["results"]: 每题 id / user_answer / correct_answer / score / analysis / explanation ...
```

## 集成要点

- **幂等**：批改是纯函数，同一输入恒得同一输出，可安全重试。
- **编码**：所有文件必须 UTF-8；JSON 输出 `ensure_ascii=False`。
- **分数类型**：分数为 float（多选/简答含小数），汇总已四舍五入到 1 位。
- **错误处理**：题目文件不合法时 `grade` 直接退出非 0 并列出全部错误，
  不会输出部分结果——集成方应先 `validate` 再 `grade`。
- **终审钩子**：集成方可把 `needs_review: true` 的题目转人工/AI 复核队列，
  终审只改 `score` / `is_correct` / `analysis`，不改其余字段。

## 自测

```bash
python scripts/test_quiz_engine.py        # 30 项单元测试，应全部 OK
```
