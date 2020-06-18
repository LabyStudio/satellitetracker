<?php
$url = "https://celestrak.com/pub/TLE/catalog.txt";
$cache_file = 'catalog.cache';
$cache_time = 60 * 60 * 24; // In seconds
if (file_exists($cache_file)) {
    if (time() - filemtime($cache_file) > 60 * 60 * 24) { // 1 Day
        // too old , re-fetch
        $cache = file_get_contents($url);
        file_put_contents($cache_file, $cache);
        refreshISS($cache);

        echo $cache;
    } else {
        // cache is still fresh
        echo file_get_contents($cache_file);
    }
} else {
    // no cache, create one
    $cache = file_get_contents($url);
    file_put_contents($cache_file, $cache);
    refreshISS($cache);

    echo $cache;
}

function refreshISS($cache)
{
    $lines = explode("\n", $cache);
    for ($i = 0; $i < count($lines); $i++) {
        $name = trim($lines[$i]);
        if ($name == "ISS (ZARYA)") {
            $tle = $name . "\n" . $lines[$i + 1] . "\n" . $lines[$i + 2];
            file_put_contents("../assets/tle/25544.txt", $tle);
        }
    }
}