<?php
// ---------------------------
// Configuration
// ---------------------------
$urls = [
    "https://celestrak.com/pub/TLE/catalog.txt",
    "https://celestrak.org/NORAD/elements/gp.php?SPECIAL=full-catalog&FORMAT=tle",
    "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE",
];

$cache_file = __DIR__ . '/catalog.cache';
$cache_time = 60 * 60 * 24; // 24 hours

// ---------------------------
// Fetch or use cache
// ---------------------------
if (file_exists($cache_file) && (time() - filemtime($cache_file) < $cache_time)) {
    // Cache still fresh
    $data = file_get_contents($cache_file);
} else {
    $data = false;

    // Try each URL in order
    foreach ($urls as $url) {
        $data = fetch_tle_data($url);
        if (is_valid_tle($data)) {
            break; // stop once a valid TLE is found
        }
    }

    // If none worked, fallback to old cache if possible
    if (!is_valid_tle($data)) {
        if (file_exists($cache_file)) {
            $data = file_get_contents($cache_file);
        } else {
            http_response_code(500);
            die("Error: Unable to fetch valid TLE data from all sources.");
        }
    } else {
        // Success — cache and refresh ISS file
        file_put_contents($cache_file, $data);
        refresh_iss_tle($data);
    }
}

// Output TLE data
header("Content-Type: text/plain");
echo $data;

// ---------------------------
// Helper Functions
// ---------------------------

function fetch_tle_data(string $url)
{
    $context = stream_context_create([
        'http' => ['timeout' => 10, 'ignore_errors' => true],
        'https' => ['timeout' => 10, 'ignore_errors' => true],
    ]);
    return @file_get_contents($url, false, $context);
}

function is_valid_tle(?string $data): bool
{
    if ($data === false || strlen(trim($data)) < 100) return false;
    // Detect HTML or forbidden pages
    if (stripos($data, '<html') !== false) return false;
    // Detect valid TLE line structure
    if (!preg_match('/^1\s+\d{5}/m', $data) || !preg_match('/^2\s+\d{5}/m', $data)) return false;
    return true;
}

function refresh_iss_tle(string $data): void
{
    $lines = array_map('trim', explode("\n", $data));
    $count = count($lines);

    for ($i = 0; $i < $count - 2; $i++) {
        if (strcasecmp($lines[$i], "ISS (ZARYA)") === 0) {
            $tle = $lines[$i] . "\n" . $lines[$i + 1] . "\n" . $lines[$i + 2];
            $output_path = realpath(__DIR__ . '/../assets/tle');
            if ($output_path && is_dir($output_path)) {
                file_put_contents($output_path . '/25544.txt', $tle);
            }
            break;
        }
    }
}
