<?php
header('Content-Type: application/json');

/*
    Table this expects (run once in your MySQL client):

    CREATE TABLE todo (
        task_id BIGINT PRIMARY KEY, -- same value as the JS Date.now() id
        task_list TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
    );
*/

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'task');
define('DB_PORT', '3307');

// The DSN(Data Source Name)
$dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME;

// Options to make PDO behave better
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // Throws errors as exceptions
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, // Returns data as associative arrays
    PDO::ATTR_EMULATE_PREPARES => false, // Uses actual prepared statement for security
];

try {
    // Attempt to create the connection
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    // echo "Connection Successsful";
} catch (\PDOException $e) {
    // If something goes wrong, this block runs instead
    // In production, you'd  log this in a file instead of echoing it
    // Never let a DB failure produce a non-JSON response - the frontend always expect JSON back, even on error.
    http_response_code(500); // Internal Server Error
    echo json_encode(['status' => 'error', 'message' => 'DB connection failed']);
    exit; // Stop further execution
    // throw new \PDOException($e->getMessage(), (int) $e->getCode());
}

// Read and decode the JSON request body
$jsonInput = file_get_contents('php://input');

// Decode the JSON into a PHP array (pass true for array, false for object)
$data = json_decode($jsonInput, true) ?? [];
$action = $data['action'] ?? '';

// if (isset($data['action']) && $data['action'] === 'addTask') {
//     $taskText = trim($data['task'] ?? '');

//     if (!empty($taskText)) {
//         // Insert task using PDO prepared statement
//         $stmt = $pdo->prepare("INSERT INTO todo (task_list) VALUES (:task_list)");
//         $success = $stmt->execute([':task_list' => $taskText]);

//         echo json_encode([
//             'status' => $success ? 'success' : 'error',
//             'message' => $success ? 'Task added successfully' : 'Failed to add task'
//         ]);
//     } else {
//         echo json_encode(['status' => 'error', 'message' => 'Task cannot be empty']);
//     }
//     exit;
// } --NOTE: I changed the if conditional to a switch because of how I want to do the task site

switch ($action) {
// If i ever have a problem check line 72 AS id
    case 'getTasks':
        $stmt = $pdo->query("SELECT task_id AS id, task_list AS text, status FROM todo ORDER BY task_id DESC");
        $tasks = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'tasks' => $tasks]);
        break;

    case 'addTask':
        $taskText = trim($data['text'] ?? '');
        $id = $data['id'] ?? null;

        if (empty($taskText) || !$id) {
            echo json_encode(['status' => 'error', 'message' => 'Task text and id are required']);
            break;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO todo (task_id, task_list, status) VALUES (:task_id, :task_list, 'pending')");
            $stmt->execute([':task_id' => $id, ':task_list' => $taskText]);

            echo json_encode([
                'status' => 'success', 'message' => 'Task added successfully' ]);
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                // Duplicate id - almost always a double submit (same Date.now() sent twice).
                http_response_code(409);
                echo json_encode(['status' => 'error', 'message' => 'A task with this id already exists']);
            } else {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Failed to add task']);
            }
        }
        break;

    case 'updateStatus':
        $id = $data['id'] ?? null;
        $status = $data['status'] ?? '';

        if (!$id || !in_array($status, ['pending', 'completed'], true)) {
                echo json_encode(['status' => 'error', 'message' => 'Valid id and status are required']);
                break;
            }

            $stmt = $pdo->prepare("UPDATE todo SET status = :status WHERE task_id = :task_id");
            $success = $stmt->execute([':status' => $status, ':task_id' => $id]);

            echo json_encode(['status' => $success ? 'success' : 'error']);
            break;

    case 'updateText':
        $id = $data['id'] ?? null;
        $text = trim($data['text'] ?? '');

        if (!$id || empty($text)) {
            echo json_encode(['status' => 'error', 'message' => 'Valid id and text are required']);
            break;
        }

        $stmt = $pdo->prepare("UPDATE todo SET task_list = :task_list WHERE task_id = :task_id");
        $success = $stmt->execute([':task_list' => $text, ':task_id' => $id]);

        echo json_encode(['status' => $success ? 'success' : 'error']);
        break;

    case 'deleteTask':
        $id = $data['id'] ?? null;

        if (!$id) {
            echo json_encode(['status' => 'error', 'message' => 'Valid id is required']);
            break;
        }

        $stmt = $pdo->prepare("DELETE FROM todo WHERE task_id = :task_id");
        $success = $stmt->execute([':task_id' => $id]);

        echo json_encode(['status' => $success ? 'success' : 'error']);
        break;

    case 'deleteAllCompleted':
        $stmt = $pdo->prepare("DELETE FROM todo WHERE status = 'completed'");
        $success = $stmt->execute();

        echo json_encode(['status' => $success ? 'success' : 'error']);
        break;

    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Unknown action']);
        break;
}

// echo "fool";

?>