<?php
// sms-webhook.php
header('Content-Type: application/json; charset=utf-8');

// دریافت بدنه درخواست
$input = file_get_contents('php://input');
$data  = json_decode($input, true);

// بررسی توکن امنیتی
$expected_token = 'YOUR_SECRET_TOKEN'; // همان که در Params گذاشتید
if (!isset($data['token']) || $data['token'] !== $expected_token) {
    http_response_code(403);
    echo 'error';
    exit;
}

$body = $data['body'] ?? '';

// ذخیره پیامک در فایل JSON
$inbox_file = __DIR__ . '/sms_inbox.json';
$inbox = file_exists($inbox_file)
    ? json_decode(file_get_contents($inbox_file), true)
    : [];
if (!is_array($inbox)) $inbox = [];

$inbox[] = [
    'body'        => $body,
    'received_at' => date('Y-m-d H:i:s'),
    'unread'      => true,
];

file_put_contents(
    $inbox_file,
    json_encode($inbox, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
);

// پاسخ موفق - این کلمه باید با Successful Response Keyword یکی باشد
echo 'success';
?>
