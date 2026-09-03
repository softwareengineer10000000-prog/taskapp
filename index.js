// Requires utils.js (getTasks, saveTasks, formatDate) to be loaded first

const preloader = document.querySelector('.preloader');
window.addEventListener('load', () => {
    preloader.classList.add('preloader-hidden');
});
// Fully remove the preloader from the layout once its fade-out finishes,
// instead of guessing the timing with a second setTimeout.
preloader.addEventListener('transitionend', () => {
    preloader.style.display = 'none';
}, { once: true });

const createTaskBtn = document.querySelector('#createTaskBtn');
const addTaskForm = document.querySelector('#addTaskForm');
const taskInput = document.querySelector('#taskInput');
const taskList = document.querySelector('#taskList');
const emptyState = document.querySelector('#emptyState');
const editTasksBtn = document.querySelector('#editTasksBtn');

let editMode = false;

createTaskBtn.addEventListener('click', () => {
    addTaskForm.hidden = !addTaskForm.hidden;
    if (!addTaskForm.hidden) taskInput.focus();
});

editTasksBtn.addEventListener('click', () => {
    editMode = !editMode;
    editTasksBtn.textContent = editMode ? 'Done editing' : 'Edit tasks';
    render();
});

const addTaskSubmitBtn = addTaskForm.querySelector('button[type="submit"]');

addTaskForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Guards against a fast double-click/doule-tap firing this handler
    // twice before thefirst request finishes, which would generate two
    // tasks with the same Date.now() id and collide on insert.
    if (addTaskSubmitBtn.disabled) return;

    const text = taskInput.value.trim();
    if (!text) return;

    const task = {id: Date.now(), text, status: 'pending'}; // id doubles as the creation timestamp

    addTaskSubmitBtn.disabled = true;

    // Update localStorage immediately so the UI feels instant...
    const tasks = getTasks();
    tasks.push(task);
    saveTasks(tasks);

    taskInput.value = '';
    addTaskForm.hidden = true;
    render();

    // ...then persist it to the database in the background.
    const result = await apiRequest('addTask', {id: task.id, text: task.text});
    if (!result || result.status !== 'success') {
        console.error('Failed to save task to the database:', result?.message);
    }

    addTaskSubmitBtn.disabled = false;
})

function render() {
    const tasks = getTasks().filter((task) => task.status !== 'completed').sort((a,b) => b.id - a.id); // newest first - higher id = created more recently
    taskList.innerHTML = '';
    emptyState.hidden = tasks.length !== 0;
    tasks.forEach((task) => taskList.appendChild(buildTaskItem(task)));
}

function buildTaskItem(task) {
    const li = document.createElement('li');
    li.className = 'task';
    li.dataset.id = task.id;

    const textEl = document.createElement('p');
    textEl.className = 'task__text';
    textEl.textContent = task.text; // textContent, not innerHTML — avoids script injection

    const meta = document.createElement('div');
    meta.className = 'task__meta';

    const select = document.createElement('select');
    select.className = 'task__status';
    select.setAttribute('aria-label', 'Task status');
    ['pending', 'completed'].forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value === 'pending' ? 'Pending' : 'Completed';
        option.selected = task.status === value;
        select.appendChild(option);
    });
    select.addEventListener('change', () => updateStatus(task.id, select.value));

    const date = document.createElement('span');
    date.className = 'task__date';
    date.textContent = formatDate(task.id);

    meta.append(select, date);

    if (editMode) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn--icon';
        deleteBtn.setAttribute('aria-label', 'Delete task');
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        meta.append(deleteBtn);
    }

    li.append(textEl, meta);

    if (editMode) {
        li.appendChild(buildEditRow(task));
    }

    return li;
}

function buildEditRow(task) {
    const row = document.createElement('div');
    row.className = 'task__edit';

    const textarea = document.createElement('textarea');
    textarea.value = task.text;
    textarea.rows = 2;
    textarea.setAttribute('aria-label', 'Edit task text');

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn--accent';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
        const newText = textarea.value.trim();
        if (!newText) return;
        updateText(task.id, newText);
    });

    row.append(textarea, saveBtn);
    return row;
}

async function updateStatus(id, status) {
    const tasks = getTasks();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.status = status;
    saveTasks(tasks);
    render();

    const result = await apiRequest('updateStatus', {id, status});
    if (!result || result.status !== 'success') {
        console.error('Failed to update status in the database:', result?.message);
    }
}

async function updateText(id, text) {
    const tasks = getTasks();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.text = text;
    saveTasks(tasks);
    render();

    const result = await apiRequest('updateText', {id, text});
    if (!result || result.status !== 'success') {
        console.error('Failed to update text in the database:', result?.message);
    }
}

async function deleteTask(id) {
    const tasks = getTasks().filter((t) => t.id !== id);
    saveTasks(tasks);
    render();

    const result = await apiRequest('deleteTask', {id});
    if (!result || result.status !== 'success') {
        console.error('Failed to delete task in the database:', result?.message);
    }
}

(async function start() {
    await initTasks(); // checks localStorage first, only falls back to the database if it's empty
    render();
})();