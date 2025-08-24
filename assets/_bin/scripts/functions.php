<?php



function get_shp_file($url, $dest) {
    if($shpFile = current(glob($dest . shp_pattern_from_zip($url)))) return realpath($shpFile);

    echo 'Downloading ' . pathinfo($url, PATHINFO_BASENAME) . ': 0% ';
    $tmpFile = sys_get_temp_dir() . S . pathinfo($url, PATHINFO_BASENAME);

    if(!curl_get_contents($url, $tmpFile, function($prog) use($url) {
        static $display = 'Downloading...';
        $newDisplay = 'Downloading ' . pathinfo($url, PATHINFO_BASENAME) . ': ' . round($prog * 100) . '%';
        if($display != $newDisplay) {
            $display = $newDisplay;
            echo R . $display . ' ';
        }
    })) throw new RuntimeException("Can't download shape file. Try to download it manualy and unzip it into /assets/_bin/maps/ " . $url);

    echo RN . 'Unzip ' . pathinfo($url, PATHINFO_BASENAME) . '...' . RN;
    $files = unzip_flat($tmpFile, $dest, ['*.dbf', '*.shp']);
    unlink($tmpFile);

    foreach($files as $file) if(pathinfo($file, PATHINFO_EXTENSION) == 'shp') return realpath($file);
    throw new RuntimeException("Can't find shp file in the zip.");
}


function shp_pattern_from_zip(string $url): string {
    $filename = pathinfo($url, PATHINFO_FILENAME);
    return substr($filename, 0, 4) . '*_f.shp';
}