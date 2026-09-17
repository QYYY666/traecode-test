# 题目 JSON 规范（question-schema）

整卷文件结构：题目数组，或 `{"meta": {...}, "questions": [...]}`。
校验命令：`python scripts/quiz_engine.py validate questions.json`

## 公共字段（所有题型必填）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 题目唯一标识，卷内不得重复（如 `q1`） |
| `type` | string | `choice` / `judge` / `fill` / `short` |
| `difficulty` | string | `easy` / `medium` / `hard` |
| `stem` | string | 题干，填空题用 `____` 标注空位 |
| `score` | number | 分值，正数（缺省 5，简答缺省 10） |
| `knowledge_point` | string | 所属知识点，批改反馈中用于讲解 |
| `explanation` | string | 解析：为什么是这个答案，写清推理依据 |

## choice 选择题

```json
{
  "id": "q1", "type": "choice", "difficulty": "medium",
  "stem": "下列关于 TCP 与 UDP 的说法，正确的是？",
  "options": ["TCP 保证有序交付", "UDP 提供可靠传输", "TCP 无连接", "UDP 有拥塞控制"],
  "answer": 0,
  "score": 5,
  "knowledge_point": "传输层协议对比",
  "explanation": "TCP 面向连接、保证有序可靠；UDP 无连接不保证可靠，也无拥塞控制。"
}
```

- `answer`：正确选项的**下标**（0 起）。单选为 int，多选为 int 数组（如 `[0,2]`）。
- 干扰项要求：与正确项同主题、似是而非，杜绝"以上都不是"式废话选项。

## judge 判断题

```json
{
  "id": "q2", "type": "judge", "difficulty": "easy",
  "stem": "HTTP/1.1 默认使用持久连接。",
  "answer": true,
  "score": 2,
  "knowledge_point": "HTTP 基础",
  "explanation": "HTTP/1.1 起默认 Connection: keep-alive。"
}
```

- `answer`：布尔值 `true` / `false`。
- 陈述必须**可判定**，避免"可能""也许"等模糊措辞。

## fill 填空题

```json
{
  "id": "q3", "type": "fill", "difficulty": "medium",
  "stem": "快速排序的平均时间复杂度为 ____（用大 O 表示）。",
  "answers": ["O(n log n)", "O(nlogn)", "nlogn"],
  "regex": "O\\(n\\s*log\\s*n\\)",
  "score": 5,
  "knowledge_point": "算法复杂度",
  "explanation": "每次划分均摊对半，共 log n 层，每层 O(n)。"
}
```

- `answers`：**必填**。可接受答案数组，同义写法各列一项（判分时文本归一化：
  全角转半角、去首尾空白与末尾标点、统一小写后精确比较）。
- `regex`：可选。Python 正则（`re.fullmatch`），适合数值范围、多种变体。
  一空一题：多空题拆成多道 fill。
- 大小写敏感场景（如 `O(n)` vs `o(n)`）注意归一化会转小写，避免出
  仅靠大小写区分的题。

## short 简答题

```json
{
  "id": "q4", "type": "short", "difficulty": "hard",
  "stem": "简述数据库索引为什么能加快查询，以及它的两个主要代价。",
  "key_points": [
    {"text": "B+树", "weight": 2},
    {"text": "减少全表扫描", "weight": 2},
    {"text": "写入变慢", "weight": 1},
    {"text": "占用额外存储", "weight": 1}
  ],
  "score": 10,
  "knowledge_point": "数据库索引",
  "explanation": "索引以 B+ 树组织，将全表扫描降为对数级查找；代价是降低写性能、增加存储。"
}
```

- `key_points`：**必填**。评分要点数组，每项 `text`（关键词/短语）+ `weight`
  （权重，正数，缺省 1）。权重按要点重要性分配，总和不必为 100。
- 引擎按加权覆盖率预评分（命中 = 归一化后关键词与答案互相包含），
  结果一律标记 `needs_review: true`，由 AI 按批改指南终审语义等价表述。
- `explanation` 应给出**完整参考答案**，终审时作为评分基准。
