// Shared helpers used by index.js and completed.js
const STORAGE_KEY = 'tasks';

// Registers the service worker (enables offline support + installability).
// Safe to call on every page load - the browser handle re-registration.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => {
            console.error('Service worker registration failed:', err);
        });
    });
}

// Path to the PHP backend. Change this if you move database.php
// (e.g. to 'config/database.php').
const API_URL = 'config/database.php';

function getTasks() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (err) {
        console.error('Could not read tasks from storage:', err);
        return [];
    }
}

function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// task.id doubles as its creation timestamp (Date.now()), so we can
// format a readable date straight from it without storing a second field.
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const day = date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${time}`;
}


// Sends one action to database.php and returns the parsed JSON response, 
// or null if the request failed (network error, bad JSON, non-2xx, etc).
async function apiRequest(action, payload = {}) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action, ...payload })
        });
        if (!response.ok) throw new Error('Server responded ${response.status}');
        return await response.json();
    } catch (err) {
        console.error(`API request "${action}" failed:`, err);
        return null;
    }
}

// Local-first startup: if localStorage already hold tasks, use them 
// immediately and never touch the database. Only when localStorage is 
// empty (first visit, or storage was cleared) do we ask database.php for 
// the task list - and once we get one, we cache it in localStorage so 
// every load after that goes local-first again.
async function initTasks() {
    const local = getTasks();
    if (local.length > 0) {
        return local;
    }

    const result = await apiRequest('getTasks');
    if (result && result.status === 'success' && Array.isArray(result.tasks)) {
        const tasks = result.tasks.map((t) => ({
            id: Number(t.id),
            text: t.text,
            status: t.status
        }));
        saveTasks(tasks);
        return tasks;
    }

    return [];
}