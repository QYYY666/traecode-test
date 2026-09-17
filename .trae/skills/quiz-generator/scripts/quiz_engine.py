#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
quiz_engine.py — 自动出题批改引擎（确定性部分）

职责：
  1. validate：校验题目 JSON 是否符合规范（题型/难度/答案字段完整性）
  2. grade   ：对客观题（选择/判断/填空）确定性判分；简答题按关键词覆盖预评分
  3. sample  ：输出题目模板骨架，供生成时参考

题型与判分规则：
  - choice 选择题：answer 为正确选项下标（单选）或下标数组（多选）
      单选全对得分，否则 0 分；多选按 (命中数 - 误选数)/正确数 比例给分，下限 0
  - judge 判断题：answer 为 true/false，全对得分
  - fill 填空题：answers 为可接受答案数组（同义写法各写一项），可选 regex 字段
      文本归一化后（去空格/全半角/大小写/末尾标点）匹配任一答案即得分
  - short 简答题：key_points 为关键词点数组 [{text, weight}]，按加权覆盖率预评分
      预评分结果一律标记 needs_review=true，由 AI/教师按批改指南终审调整

用法：
  python quiz_engine.py validate questions.json
  python quiz_engine.py grade questions.json answers.json -o result.json
  python quiz_engine.py sample --type choice --difficulty medium

JSON 规范详见 references/question-schema.md，批改细则见 references/grading-guide.md。
"""

import argparse
import json
import re
import sys
import unicodedata

# 支持的题型与难度
QUESTION_TYPES = ("choice", "judge", "fill", "short")
DIFFICULTIES = ("easy", "medium", "hard")

# 难度 → 认知层级（布鲁姆分类法），供生成与审查时对照
BLOOM_MAP = {
    "easy": "记忆/理解（回忆事实、复述概念）",
    "medium": "应用/分析（运用概念解决变式问题）",
    "hard": "评价/创造（综合判断、多步推理）",
}


# ============================================================
# 文本归一化：填空题与关键词匹配的基础
# ============================================================
_TRAILING_PUNCT = "。．.，,；;！!？?：:、 \t\r\n"


def normalize_text(s):
    """归一化文本：全角转半角 → 去首尾空白与末尾标点 → 转小写。

    目的：让"TCP。" "tcp " "ＴＣＰ" 等写法等价。
    """
    if s is None:
        return ""
    s = str(s)
    # 全角字符转半角（NFKC 同时处理全角字母数字与常见兼容形式）
    s = unicodedata.normalize("NFKC", s)
    s = s.strip()
    # 去末尾标点（循环处理，如"。."）
    while s and s[-1] in _TRAILING_PUNCT:
        s = s[:-1]
    return s.lower()


# ============================================================
# 各题型判分函数：返回 (score, is_correct, analysis)
# ============================================================
def grade_choice(q, ans):
    """选择题判分。answer 为 int（单选）或 int 数组（多选）。"""
    correct = q["answer"]
    max_score = float(q.get("score", 5))
    options = q.get("options", [])

    def _label(i):
        return options[i] if isinstance(i, int) and 0 <= i < len(options) else str(i)

    if isinstance(correct, list):  # ---- 多选 ----
        if not isinstance(ans, list):
            return 0.0, False, (
                "本题为多选题，应提交选项下标数组（如 [0,2]），实际提交：%r" % (ans,))
        ans_set, ans_key = set(ans), set(correct)
        hits, wrong = ans_set & ans_key, ans_set - ans_key
        ratio = max(0.0, (len(hits) - len(wrong)) / len(ans_key))
        score = round(ratio * max_score, 1)
        if ratio >= 1.0:
            return score, True, "多选题全部选对。"
        miss = ans_key - ans_set
        detail = []
        if hits:
            detail.append("命中：%s" % "、".join(_label(i) for i in sorted(hits)))
        if miss:
            detail.append("漏选：%s" % "、".join(_label(i) for i in sorted(miss)))
        if wrong:
            detail.append("误选：%s" % "、".join(_label(i) for i in sorted(wrong)))
        return score, False, "多选部分得分（比例 %.0f%%）。%s" % (
            ratio * 100, "；".join(detail))
    # ---- 单选 ----
    if ans == correct:
        return max_score, True, "单选题回答正确。"
    return 0.0, False, "你选择了「%s」，正确答案是「%s」。" % (
        _label(ans) if isinstance(ans, int) else ans, _label(correct))


def grade_judge(q, ans):
    """判断题判分。answer 为布尔值；兼容提交 "对"/"错"/"T"/"F" 等写法。"""
    truthy = {"true", "t", "对", "正确", "是", "yes", "y", "1", "√"}
    falsy = {"false", "f", "错", "错误", "否", "no", "n", "0", "×"}
    correct = bool(q["answer"])
    max_score = float(q.get("score", 5))

    if isinstance(ans, bool):
        user_val = ans
    else:
        norm = normalize_text(ans)
        if norm in truthy:
            user_val = True
        elif norm in falsy:
            user_val = False
        else:
            return 0.0, False, "无法识别的判断答案：%r（应为 true/false 或 对/错）。" % (ans,)

    correct_text = "正确" if correct else "错误"
    user_text = "正确" if user_val else "错误"
    if user_val == correct:
        return max_score, True, "判断题回答正确。"
    return 0.0, False, "你的判断是「%s」，正确答案是「%s」。" % (user_text, correct_text)


def grade_fill(q, ans):
    """填空题判分。归一化后匹配 answers 中任一写法，或命中 regex。"""
    max_score = float(q.get("score", 5))
    if ans is None or (isinstance(ans, str) and not ans.strip()):
        return 0.0, False, "未作答。"

    user_norm = normalize_text(ans)

    # 依次尝试每个可接受答案
    for acc in q.get("answers", []):
        if user_norm and user_norm == normalize_text(acc):
            return max_score, True, "填空回答正确。"

    # 可选的正则匹配（针对数值范围、多种变体等场景）
    pattern = q.get("regex")
    if pattern:
        try:
            if re.fullmatch(pattern, str(ans).strip()):
                return max_score, True, "填空回答正确。"
        except re.error as exc:
            return 0.0, False, "题目 regex 配置有误（%s），请修正题目文件。" % exc

    accepted = " 或 ".join(q.get("answers", []))
    return 0.0, False, "你的答案是「%s」，可接受的答案为「%s」。" % (ans, accepted)


def grade_short(q, ans):
    """简答题预评分：按加权关键词覆盖率打分，始终标记 needs_review。

    返回 (score, needs_review, analysis)。is_correct 恒为 None（由终审定）。
    """
    max_score = float(q.get("score", 10))
    key_points = q.get("key_points", [])
    text = str(ans or "")

    if not text.strip():
        return 0.0, True, "未作答，0 分。"

    total_weight = sum(float(kp.get("weight", 1)) for kp in key_points) or 1.0
    norm_answer = normalize_text(text)
    hit, miss = [], []
    got_weight = 0.0

    for kp in key_points:
        kw = normalize_text(kp.get("text", ""))
        w = float(kp.get("weight", 1))
        # 命中规则：关键词出现在答案中，或答案出现在关键词中（如答案"时间复杂度O(n)"包含关键词"O(n)"）
        if kw and (kw in norm_answer or norm_answer in kw):
            hit.append(kp.get("text", ""))
            got_weight += w
        else:
            miss.append(kp.get("text", ""))

    ratio = got_weight / total_weight
    score = round(ratio * max_score, 1)
    parts = ["关键词覆盖 %.0f%%（%d/%d 个要点）" % (
        ratio * 100, len(hit), len(key_points))]
    if hit:
        parts.append("已覆盖要点：%s" % "、".join(hit))
    if miss:
        parts.append("缺失要点：%s" % "、".join(miss))
    parts.append("（预评分，建议按批改指南终审确认语义等价表述）")
    return score, True, "；".join(parts)


GRADERS = {"choice": grade_choice, "judge": grade_judge,
           "fill": grade_fill, "short": grade_short}


# ============================================================
# 题目校验
# ============================================================
def validate_question(q, idx=0):
    """校验单题结构，返回错误信息列表（空列表 = 通过）。"""
    errors = []
    where = "questions[%d]" % idx

    if not isinstance(q, dict):
        return ["%s 必须是对象" % where]

    qid = q.get("id") or "<missing id>"
    where = "%s(%s)" % (where, qid)

    if not q.get("id"):
        errors.append("%s 缺少 id" % where)
    if q.get("type") not in QUESTION_TYPES:
        errors.append("%s type 非法（%r），必须是 %s" % (
            where, q.get("type"), "/".join(QUESTION_TYPES)))
    if q.get("difficulty") not in DIFFICULTIES:
        errors.append("%s difficulty 非法（%r），必须是 %s" % (
            where, q.get("difficulty"), "/".join(DIFFICULTIES)))
    if not str(q.get("stem", "")).strip():
        errors.append("%s 缺少题干 stem" % where)
    if not str(q.get("knowledge_point", "")).strip():
        errors.append("%s 缺少 knowledge_point（知识点，用于反馈讲解）" % where)
    if not str(q.get("explanation", "")).strip():
        errors.append("%s 缺少 explanation（解析，用于反馈讲解）" % where)
    score = q.get("score", 5)
    if not isinstance(score, (int, float)) or score <= 0:
        errors.append("%s score 必须为正数" % where)

    qtype = q.get("type")

    # ---- 分题型必填字段 ----
    if qtype == "choice":
        options = q.get("options")
        if not isinstance(options, list) or len(options) < 2:
            errors.append("%s options 必须为至少 2 个元素的数组" % where)
        else:
            ans = q.get("answer")
            if isinstance(ans, list):
                if not ans:
                    errors.append("%s 多选 answer 不能为空数组" % where)
                for i in ans:
                    if not isinstance(i, int) or not (0 <= i < len(options)):
                        errors.append("%s 多选 answer 下标越界：%r" % (where, i))
            elif not isinstance(ans, int) or not (0 <= ans < len(options)):
                errors.append("%s answer 必须是合法选项下标（int 或 int 数组），"
                              "当前值越界或非法：%r" % (where, ans))

    elif qtype == "judge":
        if not isinstance(q.get("answer"), bool):
            errors.append("%s answer 必须是布尔值 true/false" % where)

    elif qtype == "fill":
        answers = q.get("answers")
        if not isinstance(answers, list) or not answers:
            errors.append("%s fill 必须提供 answers 数组（至少 1 个可接受答案）" % where)
        if q.get("regex"):
            try:
                re.compile(q["regex"])
            except re.error as exc:
                errors.append("%s regex 编译失败：%s" % (where, exc))

    elif qtype == "short":
        kps = q.get("key_points")
        if not isinstance(kps, list) or not kps:
            errors.append("%s short 必须提供 key_points 数组" % where)
        else:
            for j, kp in enumerate(kps):
                if not isinstance(kp, dict) or not str(kp.get("text", "")).strip():
                    errors.append("%s key_points[%d] 缺少 text" % (where, j))
                elif "weight" in kp and (
                        not isinstance(kp["weight"], (int, float)) or kp["weight"] <= 0):
                    errors.append("%s key_points[%d] weight 必须为正数" % (where, j))

    return errors


def validate_quiz(data):
    """校验整卷结构。data 为 {"meta": {...}, "questions": [...]} 或直接是题数组。"""
    if isinstance(data, dict):
        questions = data.get("questions")
        if not isinstance(questions, list):
            return ["根对象缺少 questions 数组"]
    elif isinstance(data, list):
        questions = data
    else:
        return ["根节点必须是数组或含 questions 数组的对象"]
    if not questions:
        return ["questions 不能为空"]

    errors, seen = [], set()
    for i, q in enumerate(questions):
        errors.extend(validate_question(q, i))
        qid = q.get("id") if isinstance(q, dict) else None
        if qid:
            if qid in seen:
                errors.append("questions[%d] id 重复：%s" % (i, qid))
            seen.add(qid)
    return errors


# ============================================================
# 批改主流程
# ============================================================
def grade_one(q, ans):
    """批改单题，返回结果字典。"""
    qtype = q["type"]
    max_score = float(q.get("score", 5))

    if qtype == "short":
        score, needs_review, analysis = grade_short(q, ans)
        is_correct = None
        correct_answer = "、".join(kp.get("text", "") for kp in q.get("key_points", []))
    else:
        score, is_correct, analysis = GRADERS[qtype](q, ans)
        needs_review = False
        correct = q.get("answer")
        if qtype == "choice" and isinstance(correct, list):
            options = q.get("options", [])
            correct_answer = "、".join(
                options[i] if isinstance(i, int) and 0 <= i < len(options) else str(i)
                for i in correct)
        elif qtype == "judge":
            correct_answer = "正确" if correct else "错误"
        else:
            correct_answer = " 或 ".join(q.get("answers", []))

    return {
        "id": q.get("id"),
        "type": qtype,
        "stem": q.get("stem", ""),
        "knowledge_point": q.get("knowledge_point", ""),
        "user_answer": ans,
        "correct_answer": correct_answer,
        "is_correct": is_correct,
        "score": score,
        "max_score": max_score,
        "analysis": analysis,
        "explanation": q.get("explanation", ""),
        "needs_review": needs_review,
    }


def grade_quiz(questions, answers):
    """批改整卷。answers 形如 {"answers": {"q1": ..., ...}} 或直接是映射。"""
    if isinstance(answers, dict) and isinstance(answers.get("answers"), dict):
        ans_map = answers["answers"]
    else:
        ans_map = answers or {}

    items = [grade_one(q, ans_map.get(q.get("id"))) for q in questions]

    max_total = sum(float(q.get("score", 5)) for q in questions)
    total = round(sum(it["score"] for it in items), 1)
    objective = [it for it in items if it["type"] != "short"]
    graded_correct = sum(1 for it in objective if it["is_correct"])

    by_type = {}
    for it in items:
        stat = by_type.setdefault(it["type"], {"count": 0, "score": 0.0, "max_score": 0.0})
        stat["count"] += 1
        stat["score"] = round(stat["score"] + it["score"], 1)
        stat["max_score"] = round(stat["max_score"] + it["max_score"], 1)

    return {
        "summary": {
            "total_score": total,
            "max_total": round(max_total, 1),
            "graded_questions": len(items),
            "objective_correct": graded_correct,
            "objective_total": len(objective),
            "needs_review_count": sum(1 for it in items if it["needs_review"]),
            "by_type": by_type,
        },
        "results": items,
    }


# ============================================================
# CLI 子命令
# ============================================================
def _load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _get_questions(data):
    return data["questions"] if isinstance(data, dict) else data


def cmd_validate(args):
    data = _load_json(args.questions)
    errors = validate_quiz(data)
    if errors:
        print("❌ 校验未通过（%d 个问题）：" % len(errors))
        for e in errors:
            print("  - " + e)
        return 1
    n = len(_get_questions(data))
    print("✅ 校验通过：%d 道题目全部符合规范。" % n)
    return 0


def cmd_grade(args):
    questions = _get_questions(_load_json(args.questions))
    answers = _load_json(args.answers)
    errors = validate_quiz({"questions": questions})
    if errors:
        print("❌ 题目文件校验未通过，请先修复：")
        for e in errors:
            print("  - " + e)
        return 1
    result = grade_quiz(questions, answers)
    out = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(out)
        print("批改完成，结果已写入 %s" % args.output)
    else:
        print(out)
    s = result["summary"]
    print("\n===== 成绩摘要 =====")
    print("总分：%s / %s" % (s["total_score"], s["max_total"]))
    print("客观题正确率：%d/%d" % (s["objective_correct"], s["objective_total"]))
    if s["needs_review_count"]:
        print("⚠ 简答题 %d 道为预评分，请按 references/grading-guide.md 终审。"
              % s["needs_review_count"])
    return 0


def cmd_sample(args):
    """输出指定题型/难度的模板骨架，供生成题目时参考。"""
    t = args.sample_type if args.sample_type else "choice"
    if t not in QUESTION_TYPES:
        print("未知题型：%s（可选 %s）" % (t, "/".join(QUESTION_TYPES)))
        return 1
    templates = {
        "choice": {
            "id": "q1", "type": "choice", "difficulty": args.difficulty,
            "stem": "【题干】……的正确说法是？",
            "options": ["选项A内容", "选项B内容", "选项C内容", "选项D内容"],
            "answer": 0,
            "score": 5, "knowledge_point": "所属知识点", "explanation": "为什么选 A：……",
        },
        "judge": {
            "id": "q2", "type": "judge", "difficulty": args.difficulty,
            "stem": "【判断陈述】……",
            "answer": True, "score": 5,
            "knowledge_point": "所属知识点", "explanation": "判断依据：……",
        },
        "fill": {
            "id": "q3", "type": "fill", "difficulty": args.difficulty,
            "stem": "【含 ____ 空位的陈述】",
            "answers": ["标准答案", "同义写法"], "regex": None, "score": 5,
            "knowledge_point": "所属知识点", "explanation": "答案要点解析：……",
        },
        "short": {
            "id": "q4", "type": "short", "difficulty": args.difficulty,
            "stem": "【开放性问句】请说明……",
            "key_points": [
                {"text": "要点1关键词", "weight": 2},
                {"text": "要点2关键词", "weight": 1},
            ],
            "score": 10, "knowledge_point": "所属知识点",
            "explanation": "完整参考答案与评分说明：……",
        },
    }
    print(json.dumps(templates[t], ensure_ascii=False, indent=2))
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="quiz_engine",
        description="自动出题批改引擎：validate 校验题目 / grade 批改答卷 / sample 输出模板")
    sub = parser.add_subparsers(dest="command", required=True)

    p_v = sub.add_parser("validate", help="校验题目 JSON 规范")
    p_v.add_argument("questions", help="题目 JSON 文件路径")

    p_g = sub.add_parser("grade", help="批改答卷")
    p_g.add_argument("questions", help="题目 JSON 文件路径")
    p_g.add_argument("answers", help="作答 JSON 文件路径")
    p_g.add_argument("-o", "--output", help="结果写入文件（缺省打印到 stdout）")

    p_s = sub.add_parser("sample", help="输出题型模板骨架")
    p_s.add_argument("--type", dest="sample_type", default="choice",
                     help="题型 choice/judge/fill/short")
    p_s.add_argument("--difficulty", default="medium",
                     help="难度 easy/medium/hard")

    args = parser.parse_args(argv)
    handlers = {"validate": cmd_validate, "grade": cmd_grade, "sample": cmd_sample}
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
