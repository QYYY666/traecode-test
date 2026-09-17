/**
 * 拾光 · 学习平台主逻辑
 * 纯原生 JS，无框架依赖。
 * 功能：课程数据管理、实时时钟、英雄区"继续学习"、统计条、搜索筛选、进度持久化。
 */
(function (global) {
  'use strict';

  /* ============================================================
   * 课程数据（模拟数据集）
   * 每门课：id / 标题 / 讲师 / 分类 / 总课时 / 已完成课时 / 缩略渐变 / 最近学习
   * ============================================================ */
  var COURSES = [
    {
      id: 'css-layout',
      title: 'CSS 现代布局',
      subtitle: 'Grid · Flexbox · 容器查询实战',
      instructor: '林知远',
      category: '前端',
      total: 12,
      done: 8,
      gradient: ['#ff6b6b', '#ee5a6f'],
      lastStudied: '今天 20:14'
    },
    {
      id: 'js-async',
      title: 'JavaScript 异步编程',
      subtitle: '从回调地狱到 async/await',
      instructor: '苏明远',
      category: '前端',
      total: 10,
      done: 10,
      gradient: ['#4facfe', '#00f2fe'],
      lastStudied: '昨天 21:30'
    },
    {
      id: 'ts-advanced',
      title: 'TypeScript 进阶',
      subtitle: '类型体操与泛型约束',
      instructor: '陈思齐',
      category: '前端',
      total: 14,
      done: 3,
      gradient: ['#667eea', '#764ba2'],
      lastStudied: '3 天前'
    },
    {
      id: 'python-data',
      title: 'Python 数据处理',
      subtitle: 'Pandas 与 NumPy 实战',
      instructor: '周临川',
      category: '后端',
      total: 16,
      done: 0,
      gradient: ['#43e97b', '#38f9d7'],
      lastStudied: null
    },
    {
      id: 'go-concurrency',
      title: 'Go 并发编程',
      subtitle: 'Goroutine · Channel · context',
      instructor: '许望舒',
      category: '后端',
      total: 11,
      done: 5,
      gradient: ['#f093fb', '#f5576c'],
      lastStudied: '上周三'
    },
    {
      id: 'sql-opt',
      title: 'SQL 查询优化',
      subtitle: '索引 · 执行计划 · 调优',
      instructor: '何雪汀',
      category: '基础',
      total: 9,
      done: 9,
      gradient: ['#fa709a', '#fee140'],
      lastStudied: '上周日'
    },
    {
      id: 'dsa',
      title: '数据结构与算法',
      subtitle: '从数组到图论',
      instructor: '顾长卿',
      category: '算法',
      total: 20,
      done: 7,
      gradient: ['#a18cd1', '#fbc2eb'],
      lastStudied: '5 天前'
    },
    {
      id: 'networking',
      title: '计算机网络基础',
      subtitle: '从 HTTP 到 TCP/IP',
      instructor: '白以陌',
      category: '基础',
      total: 8,
      done: 2,
      gradient: ['#f6d365', '#fda085'],
      lastStudied: '2 天前'
    }
  ];

  var STORAGE_KEY = 'shiguang.progress';

  /* ---------- 进度持久化 ---------- */
  function loadProgress() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(map) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (e) { /* 隐私模式等降级 */ }
  }

  // 将存储的进度合并到课程数据
  function syncProgress() {
    var saved = loadProgress();
    COURSES.forEach(function (c) {
      if (saved[c.id] !== undefined) c.done = saved[c.id];
    });
  }

  function persistAll() {
    var map = {};
    COURSES.forEach(function (c) { map[c.id] = c.done; });
    saveProgress(map);
  }

  /* ---------- 工具函数 ---------- */
  var $ = function (id) { return document.getElementById(id); };

  function pct(course) {
    return course.total > 0 ? Math.round(course.done / course.total * 100) : 0;
  }

  /** 设置圆环进度（通过 @property --p 触发 conic-gradient 平滑过渡） */
  function setRing(el, percent) {
    el.style.setProperty('--p', percent);
  }

  /** 取课程首字作为缩略图文字 */
  function thumbChar(title) {
    return title.charAt(0);
  }

  /* ============================================================
   * 实时时钟
   * 每秒更新导航栏时钟和欢迎页时钟
   * ============================================================ */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function formatClock(d) {
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function formatWelcomeClock(d) {
    var week = ['日', '一', '二', '三', '四', '五', '六'];
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 周' +
           week[d.getDay()] + '  ' + formatClock(d);
  }

  function startClock() {
    var navClock = $('navClock');
    var welcomeClock = $('welcomeClock');

    function tick() {
      var now = new Date();
      if (navClock) navClock.textContent = formatClock(now);
      if (welcomeClock) welcomeClock.textContent = '— ' + formatWelcomeClock(now) + ' —';
    }

    tick();
    global.setInterval(tick, 1000);
  }

  /* ============================================================
   * 渲染：英雄区（继续学习）
   * 取最近学习的一门未完成课程；如全部完成则取最后一门
   * ============================================================ */
  function renderHero() {
    var target = null;
    // 优先取有 lastStudied 且未完成的课
    var pool = COURSES.filter(function (c) {
      return c.lastStudied && c.done < c.total;
    });
    if (pool.length > 0) {
      target = pool[0];
    } else {
      // 全部完成 → 取最后一门
      target = COURSES[COURSES.length - 1];
    }

    var percent = pct(target);
    var heroContent = $('heroContent');

    if (!target) {
      heroContent.innerHTML = '<p class="hero-subtitle">暂无课程</p>';
      return;
    }

    heroContent.innerHTML =
      '<div class="hero-text">' +
        '<div class="hero-eyebrow">继续学习 · ' + target.lastStudied + '</div>' +
        '<h1 class="hero-title">' + target.title + '</h1>' +
        '<p class="hero-subtitle">' + target.subtitle + ' · ' + target.instructor + '</p>' +
        '<a href="#course-' + target.id + '" class="hero-cta" data-course-id="' + target.id + '">' +
          '继续上课 <span class="hero-cta-arrow">→</span>' +
        '</a>' +
      '</div>' +
      '<div class="hero-progress-ring" id="heroRing">' +
        '<span class="hero-progress-num">' + percent + '%</span>' +
        '<span class="hero-progress-label">' + target.done + '/' + target.total + ' 课时</span>' +
      '</div>';

    // 延迟设置进度环，触发动画
    var ring = $('heroRing');
    if (ring) {
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(function () {
          setRing(ring, percent);
        });
      });
    }
  }

  /* ============================================================
   * 渲染：统计条
   * ============================================================ */
  function renderStats() {
    var total = COURSES.length;
    var done = COURSES.filter(function (c) { return c.done >= c.total; }).length;
    var active = COURSES.filter(function (c) { return c.done > 0 && c.done < c.total; }).length;
    var totalLessons = COURSES.reduce(function (s, c) { return s + c.total; }, 0);
    var doneLessons = COURSES.reduce(function (s, c) { return s + c.done; }, 0);
    // 假设每课时 45 分钟 = 0.75 小时
    var hours = Math.round(doneLessons * 0.75 * 10) / 10;

    $('statTotal').textContent = total;
    $('statDone').textContent = done;
    $('statActive').textContent = active;
    $('statHours').innerHTML = hours + '<span class="stat-unit">h</span>';

    // 导航栏整体进度环
    var overall = totalLessons > 0 ? Math.round(doneLessons / totalLessons * 100) : 0;
    var navRing = $('navRing');
    var navRingLabel = $('navRingLabel');
    if (navRing && navRingLabel) {
      setRing(navRing, overall);
      navRingLabel.textContent = overall + '%';
    }
  }

  /* ============================================================
   * 渲染：课程网格
   * ============================================================ */
  function renderGrid(courses) {
    var grid = $('courseGrid');
    var empty = $('emptyState');

    if (!courses.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    var html = courses.map(function (c, i) {
      var percent = pct(c);
      var isDone = c.done >= c.total;
      var badge = isDone ? '<span class="thumb-badge">已完成</span>' : '';

      return (
        '<article class="course-card' + (isDone ? ' done' : '') + '" id="course-' + c.id + '" style="animation-delay:' + (i * 0.06) + 's">' +
          '<div class="course-thumb" style="background:linear-gradient(135deg,' + c.gradient[0] + ',' + c.gradient[1] + ')">' +
            thumbChar(c.title) + badge +
          '</div>' +
          '<div class="course-body">' +
            '<div class="course-category">' + c.category + '</div>' +
            '<h3 class="course-title">' + c.title + '</h3>' +
            '<p class="course-instructor">' + c.instructor + ' · ' + c.total + ' 课时</p>' +
            '<div class="course-progress-wrap">' +
              '<div class="course-progress-meta">' +
                '<span class="course-progress-text">' + c.done + '/' + c.total + ' 课时</span>' +
                '<span class="course-progress-num">' + percent + '%</span>' +
              '</div>' +
              '<div class="course-progress-bar">' +
                '<div class="course-progress-fill" style="width:0%" data-target="' + percent + '"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    grid.innerHTML = html;

    // 延迟设置进度条宽度，触发动画
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () {
        var fills = grid.querySelectorAll('.course-progress-fill');
        fills.forEach(function (f) {
          f.style.width = f.dataset.target + '%';
        });
      });
    });
  }

  /* ============================================================
   * 搜索 + 筛选
   * ============================================================ */
  var currentCategory = 'all';
  var currentQuery = '';

  function applyFilters() {
    var q = currentQuery.trim().toLowerCase();

    var filtered = COURSES.filter(function (c) {
      var catMatch = currentCategory === 'all' || c.category === currentCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().indexOf(q) >= 0 ||
        c.subtitle.toLowerCase().indexOf(q) >= 0 ||
        c.instructor.toLowerCase().indexOf(q) >= 0 ||
        c.category.toLowerCase().indexOf(q) >= 0
      );
    });

    renderGrid(filtered);
  }

  function initSearch() {
    var input = $('searchInput');
    var timer = null;
    var composing = false; // 中文输入法组合中标记

    // IME 组合开始：暂停过滤，避免拼音字母误触发搜索
    input.addEventListener('compositionstart', function () {
      composing = true;
      clearTimeout(timer);
    });

    // IME 组合结束：取最终文本，触发过滤
    input.addEventListener('compositionend', function (e) {
      composing = false;
      currentQuery = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(applyFilters, 120);
    });

    // 普通 input 事件：非 IME 组合时才过滤
    input.addEventListener('input', function (e) {
      if (composing) return; // 输入法组合中，跳过
      currentQuery = e.target.value;
      clearTimeout(timer);
      // 防抖 120ms
      timer = setTimeout(applyFilters, 120);
    });
  }

  function initFilters() {
    var filters = document.querySelectorAll('.filter');
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filters.forEach(function (f) {
          f.classList.remove('active');
          f.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        currentCategory = btn.dataset.cat;
        applyFilters();
      });
    });
  }

  /* ============================================================
   * 交互：点击课程卡片模拟"学一课"
   * ============================================================ */
  function initCardClick() {
    var grid = $('courseGrid');
    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.course-card');
      if (!card) return;

      var id = card.id.replace('course-', '');
      var course = COURSES.find(function (c) { return c.id === id; });
      if (!course) return;

      // 已完成的课不处理
      if (course.done >= course.total) return;

      // 模拟学一课：done + 1
      course.done = Math.min(course.total, course.done + 1);
      persistAll();

      // 局部刷新：重渲染网格与统计，英雄区不变
      applyFilters();
      renderStats();
    });
  }

  /* ============================================================
   * 欢迎页：点击"进入课堂"后淡出欢迎页，显示仪表盘
   * ============================================================ */
  function initWelcome() {
    var welcome = $('welcome');
    var enterBtn = $('welcomeEnter');
    if (!welcome || !enterBtn) return;

    enterBtn.addEventListener('click', function () {
      welcome.classList.add('hide');
      // 过渡结束后从 DOM 隐藏，避免遮挡交互
      welcome.addEventListener('transitionend', function () {
        welcome.style.display = 'none';
      }, { once: true });
    });

    // 支持回车键进入
    welcome.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        enterBtn.click();
      }
    });
  }

  /* ============================================================
   * 启动
   * ============================================================ */
  function boot() {
    syncProgress();
    startClock();
    renderHero();
    renderStats();
    applyFilters();
    initSearch();
    initFilters();
    initCardClick();
    initWelcome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
