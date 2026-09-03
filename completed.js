// Requires utils.js (getTasks, saveTasks, formatDate, initTasks, apiRequest) to be loaded first

const preloader = document.querySelector('.preloader');
window.addEventListener('load', () => {
    preloader.classList.add('preloader-hidden');
});
// Fully remove the preloader from the layout once its fade-out finishes,
// instead of guessing the timing with a second setTimeout.
preloader.addEventListener('transitionend', () => {
    preloader.style.display = 'none';
}, { once: true });

const taskList = document.querySelector('#taskList');
const emptyState = document.querySelector('#emptyState');
const deleteAllBtn = document.querySelector('#deleteAllBtn');

deleteAllBtn.addEventListener('click', async () => {
    const completed = getTasks().filter((task) => task.status === 'completed');
    if (completed.length === 0) return;

    const confirmed = confirm(`Delete all ${completed.length} completed task(s)? This can't be undone.`);
    if (!confirmed) return;

    const remaining = getTasks().filter((task) => task.status !== 'completed');
    saveTasks(remaining);
    render();

    const result = await apiRequest('deleteAllCompleted');
    if (!result || result.status !== 'success') {
        console.error('Failed to dele;te completed tasks in the database:', result?.message)
    }
});

function render() {
    const tasks = getTasks().filter((task) => task.status === 'completed').sort((a,b) => b.id - a.id); // newest first - higher id = created more recently
    taskList.innerHTML = '';
    emptyState.hidden = tasks.length !== 0;
    tasks.forEach((task) => taskList.appendChild(buildTaskItem(task)));
}

function buildTaskItem(task) {
    const li = document.createElement('li');
    li.className = 'task';
    li.dataset.id = task.id;

    const textEl = document.createElement('p');
    textEl.className = 'task__text task__text--done';
    textEl.textContent = task.text;

    const meta = document.createElement('div');
    meta.className = 'task__meta';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'Completed';

    const date = document.createElement('span');
    date.className = 'task__date';
    date.textContent = formatDate(task.id);

    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.className = 'btn btn--ghost';
    restoreBtn.textContent = 'Restore';
    restoreBtn.addEventListener('click', () => restoreTask(task.id));

    meta.append(badge, date, restoreBtn);
    li.append(textEl, meta);
    return li;
}

async function restoreTask(id) {
    const tasks = getTasks();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.status = 'pending';
    saveTasks(tasks);
    render();

    const result = await apiRequest('updateStatus', {id, status: 'pending'});
    if (!result || result.status !== 'success') {
        console.error('Failed to restore task in the database:', result?.message);
    }
}

(async function start() {
    await initTasks(); // checks localStorage first, nly falls ack to the database if it's empty
    render();
})();
