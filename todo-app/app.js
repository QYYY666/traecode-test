/**
 * 待办事项列表 —— 核心逻辑
 * 数据用 localStorage 持久化，刷新不丢失
 */

// 存储键名
const STORAGE_KEY = 'todo_items';

// DOM 引用
const inputEl = document.getElementById('todoText');
const addBtn = document.getElementById('addBtn');
const listEl = document.getElementById('todoList');
const emptyHint = document.getElementById('emptyHint');
const activeCountEl = document.getElementById('activeCount');

// 内存中的待办数据
let todos = loadTodos();

/**
 * 从 localStorage 读取待办列表
 * @returns {Array} 待办数组，每项 {id, text, done}
 */
function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    console.error('读取本地数据失败', e);
    return [];
  }
}

/** 将当前 todos 写入 localStorage */
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/** 添加待办：从输入框取文本，校验非空后推入数组 */
function addTodo() {
  const text = inputEl.value.trim();
  if (!text) return;

  todos.push({ id: Date.now(), text: text, done: false });
  inputEl.value = '';
  saveTodos();
  render();
}

/** 切换某项的完成状态 */
function toggleTodo(id) {
  const item = todos.find(t => t.id === id);
  if (item) {
    item.done = !item.done;
    saveTodos();
    render();
  }
}

/** 删除某项 */
function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  render();
}

/** 渲染列表：清空后按数据重建 DOM */
function render() {
  listEl.innerHTML = '';

  // 空状态提示
  if (todos.length === 0) {
    emptyHint.classList.add('show');
  } else {
    emptyHint.classList.remove('show');
  }

  // 逐项构建列表元素
  todos.forEach(todo => {
    const li = document.createElement('li');
    if (todo.done) li.classList.add('done');

    // 复选框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    // 文本
    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;

    // 删除按钮
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '删除';
    delBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.append(checkbox, span, delBtn);
    listEl.appendChild(li);
  });

  // 更新未完成计数
  const active = todos.filter(t => !t.done).length;
  activeCountEl.textContent = active;
}

// 事件绑定
addBtn.addEventListener('click', addTodo);
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTodo();
});

// 初始渲染
render();
