#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_quiz_engine.py — quiz_engine 单元测试

运行方式（无需第三方依赖，使用标准库 unittest）：
    python test_quiz_engine.py
或
    python -m unittest test_quiz_engine -v

覆盖范围：
  - 文本归一化（全半角/大小写/标点）
  - 四种题型判分（单选/多选部分分/判断兼容写法/填空同义与正则/简答加权覆盖）
  - 整卷校验（字段缺失/下标越界/重复 id/regex 非法）
  - 端到端 CLI（grade 子命令输出结构）
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from quiz_engine import (  # noqa: E402
    normalize_text, grade_choice, grade_judge, grade_fill, grade_short,
    validate_quiz, grade_quiz, main,
)


class TestNormalize(unittest.TestCase):
    """文本归一化。"""

    def test_fullwidth_to_halfwidth(self):
        self.assertEqual(normalize_text("ＴＣＰ"), "tcp")

    def test_case_and_spaces(self):
        self.assertEqual(normalize_text("  HTTP/2  "), "http/2")

    def test_trailing_punct(self):
        self.assertEqual(normalize_text("二分查找。"), "二分查找")
        self.assertEqual(normalize_text("O(n)．"), "o(n)")

    def test_none_safe(self):
        self.assertEqual(normalize_text(None), "")


class TestChoice(unittest.TestCase):
    """选择题判分。"""

    def setUp(self):
        self.q = {
            "id": "c1", "type": "choice", "difficulty": "easy",
            "stem": "下列哪个是稳定排序？", "score": 4,
            "options": ["冒泡排序", "快速排序", "堆排序", "希尔排序"],
            "answer": 0, "knowledge_point": "排序稳定性", "explanation": "冒泡相邻交换，稳定。",
        }

    def test_single_correct(self):
        score, ok, _ = grade_choice(self.q, 0)
        self.assertEqual((score, ok), (4.0, True))

    def test_single_wrong(self):
        score, ok, analysis = grade_choice(self.q, 2)
        self.assertEqual((score, ok), (0.0, False))
        self.assertIn("堆排序", analysis)      # 用户选项
        self.assertIn("冒泡排序", analysis)    # 正确选项

    def test_multi_all_correct(self):
        q = dict(self.q, answer=[0, 1], score=6)
        score, ok, _ = grade_choice(q, [0, 1])
        self.assertEqual((score, ok), (6.0, True))

    def test_multi_partial_credit(self):
        q = dict(self.q, answer=[0, 1, 2], score=6)
        score, ok, _ = grade_choice(q, [0, 1])   # 2/3 命中
        self.assertEqual(score, 4.0)
        self.assertFalse(ok)

    def test_multi_wrong_zeroes_item(self):
        q = dict(self.q, answer=[0, 1, 2], score=6)
        score, _ok, _ = grade_choice(q, [0, 3])  # 1 命中 1 误选 → 0
        self.assertEqual(score, 0.0)

    def test_multi_non_list_answer_rejected(self):
        q = dict(self.q, answer=[0, 1])
        score, ok, _ = grade_choice(q, 0)
        self.assertEqual((score, ok), (0.0, False))


class TestJudge(unittest.TestCase):
    """判断题判分（含中文写法兼容）。"""

    def setUp(self):
        self.q = {"id": "j1", "type": "judge", "difficulty": "easy",
                  "stem": "HTTP 是无状态协议。", "answer": True, "score": 2,
                  "knowledge_point": "HTTP 基础", "explanation": "无 Cookie 时两次请求互不关联。"}

    def test_bool_answers(self):
        self.assertEqual(grade_judge(self.q, True)[0], 2.0)
        self.assertEqual(grade_judge(self.q, False)[0], 0.0)

    def test_chinese_variants(self):
        for t in ("对", "正确", "是", "T", "√"):
            self.assertEqual(grade_judge(self.q, t)[0], 2.0, t)
        self.assertEqual(grade_judge(self.q, "错")[0], 0.0)

    def test_unknown_answer(self):
        score, ok, analysis = grade_judge(self.q, "不知道")
        self.assertEqual((score, ok), (0.0, False))
        self.assertIn("无法识别", analysis)


class TestFill(unittest.TestCase):
    """填空题判分（同义答案/正则/全角）。"""

    def test_synonym_answers(self):
        q = {"id": "f1", "type": "fill", "difficulty": "medium",
             "stem": "快速排序平均时间复杂度为 ____。",
             "answers": ["O(n log n)", "O(nlogn)", "nlogn"], "score": 5,
             "knowledge_point": "复杂度", "explanation": "均摊 O(n log n)。"}
        for a in ("O(nlogn)", "nlogn", " O(N LOG N) ", "nlogn。"):
            self.assertEqual(grade_fill(q, a)[0], 5.0, a)
        self.assertEqual(grade_fill(q, "O(n)")[0], 0.0)

    def test_regex_match(self):
        q = {"id": "f2", "type": "fill", "difficulty": "medium",
             "stem": "HTTP 默认端口是 ____。", "answers": ["80"],
             "regex": r"80|八〇", "score": 5,
             "knowledge_point": "HTTP", "explanation": "默认 80。"}
        self.assertEqual(grade_fill(q, "八〇")[0], 5.0)

    def test_regex_compile_error(self):
        # 答案先不命中 answers 列表，才会走到 regex 分支并暴露配置错误
        q = {"id": "f3", "type": "fill", "difficulty": "easy",
             "stem": "x", "answers": ["1"], "regex": "([bad", "score": 5,
             "knowledge_point": "t", "explanation": "e"}
        score, ok, analysis = grade_fill(q, "2")
        self.assertEqual(score, 0.0)
        self.assertIn("regex 配置有误", analysis)

    def test_empty_answer(self):
        q = {"id": "f4", "type": "fill", "difficulty": "easy",
             "stem": "x", "answers": ["a"], "score": 5,
             "knowledge_point": "t", "explanation": "e"}
        self.assertEqual(grade_fill(q, "   ")[0], 0.0)
        self.assertEqual(grade_fill(q, None)[0], 0.0)


class TestShort(unittest.TestCase):
    """简答题加权关键词预评分。"""

    def setUp(self):
        self.q = {
            "id": "s1", "type": "short", "difficulty": "hard",
            "stem": "简述 TCP 三次握手的作用。",
            "key_points": [
                {"text": "同步序列号", "weight": 2},
                {"text": "确认", "weight": 2},
                {"text": "建立连接", "weight": 1},
            ],
            "score": 10, "knowledge_point": "TCP 握手",
            "explanation": "三次握手交换初始序列号并确认双向可达。",
        }

    def test_full_coverage(self):
        ans = "三次握手用于建立连接，双方交换同步序列号并相互确认，保证双向可达。"
        score, needs_review, _ = grade_short(self.q, ans)
        self.assertEqual(score, 10.0)
        self.assertTrue(needs_review)  # 简答永远需要终审标记

    def test_partial_coverage(self):
        ans = "为了建立连接。"  # 仅命中 weight 1
        score, _, _ = grade_short(self.q, ans)
        self.assertEqual(score, 2.0)  # 1/5 * 10

    def test_empty_answer(self):
        score, needs_review, analysis = grade_short(self.q, "  ")
        self.assertEqual((score, needs_review), (0.0, True))
        self.assertIn("未作答", analysis)


class TestValidate(unittest.TestCase):
    """整卷校验。"""

    def _valid_quiz(self):
        return [
            {"id": "q1", "type": "choice", "difficulty": "easy", "stem": "s",
             "options": ["a", "b"], "answer": 0, "score": 5,
             "knowledge_point": "k", "explanation": "e"},
            {"id": "q2", "type": "judge", "difficulty": "medium", "stem": "s",
             "answer": False, "score": 5, "knowledge_point": "k", "explanation": "e"},
        ]

    def test_valid_quiz_passes(self):
        self.assertEqual(validate_quiz(self._valid_quiz()), [])

    def test_missing_explanation(self):
        quiz = self._valid_quiz()
        del quiz[0]["explanation"]
        errors = validate_quiz(quiz)
        self.assertTrue(any("explanation" in e for e in errors))

    def test_choice_index_out_of_range(self):
        quiz = self._valid_quiz()
        quiz[0]["answer"] = 5
        self.assertTrue(any("越界" in e for e in validate_quiz(quiz)))

    def test_duplicate_id(self):
        quiz = self._valid_quiz()
        quiz[1]["id"] = "q1"
        self.assertTrue(any("重复" in e for e in validate_quiz(quiz)))

    def test_bad_difficulty(self):
        quiz = self._valid_quiz()
        quiz[0]["difficulty"] = "超难"
        self.assertTrue(any("difficulty" in e for e in validate_quiz(quiz)))

    def test_bad_regex_detected(self):
        quiz = self._valid_quiz()
        quiz.append({"id": "q3", "type": "fill", "difficulty": "easy", "stem": "s",
                     "answers": ["a"], "regex": "([broken", "score": 5,
                     "knowledge_point": "k", "explanation": "e"})
        self.assertTrue(any("regex" in e for e in validate_quiz(quiz)))


class TestGradeQuizE2E(unittest.TestCase):
    """整卷批改 + CLI 端到端。"""

    QUIZ = [
        {"id": "q1", "type": "choice", "difficulty": "easy", "stem": "s1",
         "options": ["A1", "B1"], "answer": 0, "score": 5,
         "knowledge_point": "k1", "explanation": "e1"},
        {"id": "q2", "type": "fill", "difficulty": "medium", "stem": "s2",
         "answers": ["栈"], "score": 5, "knowledge_point": "k2", "explanation": "e2"},
        {"id": "q3", "type": "short", "difficulty": "hard", "stem": "s3",
         "key_points": [{"text": "递归", "weight": 1}], "score": 10,
         "knowledge_point": "k3", "explanation": "e3"},
    ]
    ANSWERS = {"answers": {"q1": 1, "q2": "栈。", "q3": "使用递归实现。"}}

    def test_grade_summary(self):
        result = grade_quiz(self.QUIZ, self.ANSWERS)
        s = result["summary"]
        # 选择答错 0 分 + 填空答对 5 分 + 简答覆盖全部要点 10 分
        self.assertEqual(s["total_score"], 15.0)
        self.assertEqual(s["max_total"], 20.0)
        self.assertEqual(s["objective_correct"], 1)
        self.assertEqual(s["needs_review_count"], 1)

    def test_result_fields_complete(self):
        item = grade_quiz(self.QUIZ, self.ANSWERS)["results"][2]
        for field in ("id", "type", "user_answer", "correct_answer", "score",
                      "max_score", "analysis", "explanation", "knowledge_point",
                      "needs_review"):
            self.assertIn(field, item)

    def test_choice_correct_answer_shows_option_text(self):
        """回归：单选题 correct_answer 必须显示选项文本，不能为空。"""
        item = grade_quiz(self.QUIZ, self.ANSWERS)["results"][0]
        self.assertEqual(item["correct_answer"], "A1")

    def test_cli_grade(self):
        """CLI grade 子命令端到端：临时文件 → 运行 → 解析输出。"""
        with tempfile.TemporaryDirectory() as tmp:
            qf = os.path.join(tmp, "q.json")
            af = os.path.join(tmp, "a.json")
            of = os.path.join(tmp, "r.json")
            with open(qf, "w", encoding="utf-8") as f:
                json.dump({"questions": self.QUIZ}, f, ensure_ascii=False)
            with open(af, "w", encoding="utf-8") as f:
                json.dump(self.ANSWERS, f, ensure_ascii=False)

            engine = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                  "quiz_engine.py")
            proc = subprocess.run(
                [sys.executable, engine, "grade", qf, af, "-o", of],
                capture_output=True, text=True, encoding="utf-8")
            self.assertEqual(proc.returncode, 0, proc.stderr)

            with open(of, encoding="utf-8") as f:
                result = json.load(f)
            self.assertEqual(result["summary"]["total_score"], 15.0)

    def test_cli_validate_rejects_bad(self):
        """CLI validate 对非法题目返回非 0。"""
        bad = [{"id": "x", "type": "essay", "difficulty": "easy", "stem": "s"}]
        with tempfile.TemporaryDirectory() as tmp:
            qf = os.path.join(tmp, "q.json")
            with open(qf, "w", encoding="utf-8") as f:
                json.dump(bad, f, ensure_ascii=False)
            engine = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                  "quiz_engine.py")
            proc = subprocess.run(
                [sys.executable, engine, "validate", qf],
                capture_output=True, text=True, encoding="utf-8")
            self.assertNotEqual(proc.returncode, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
