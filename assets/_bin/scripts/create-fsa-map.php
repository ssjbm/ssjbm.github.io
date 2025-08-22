<?php

// Official Statcan FSA Geo Map
const SHP_ZIP_URL = 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lrta000b21a_f.zip';


// Load PXDoc utilities
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');


$srcMapDir = realpath(__DIR__ . '../../../maps'). S;


// Download shape file from Statcan
if(!$shpFile = current(glob($srcMapDir . 'lrt*_f.shp'))) {
    echo 'Downloading ' . pathinfo(SHP_ZIP_URL, PATHINFO_BASENAME) . ': 0% ';
    $tmpFile = sys_get_temp_dir() . S . pathinfo(SHP_ZIP_URL, PATHINFO_BASENAME);
    if(!curl_get_contents(SHP_ZIP_URL, $tmpFile, function($prog){
        static $display = 'Downloading...';
        $newDisplay = 'Downloading ' . pathinfo(SHP_ZIP_URL, PATHINFO_BASENAME) . ': ' . round($prog * 100) . '%';
        if($display != $newDisplay) {
            $display = $newDisplay;
            echo R . $display . ' ';
        }
    })) err("Can't download shape file. Try to download it manualy and unzip it into /assets/_bin/maps/ https://www150.statcan.gc.ca/n1/en/catalogue/92-179-X");
    echo RN . 'Unzip ' . pathinfo(SHP_ZIP_URL, PATHINFO_BASENAME) . '...' . RN;
    if(!unzip($tmpFile, $srcMapDir, pathinfo(SHP_ZIP_URL, PATHINFO_FILENAME))) err("Can't unzip shape file.");
    unlink($tmpFile);
    if(!$shpFile = current(glob($srcMapDir . 'lrt*_f.shp'))) err("Cant't find shape file. Please download it at: Try to download it manualy and unzip it into /assets/_bin/maps/ https://www150.statcan.gc.ca/n1/en/catalogue/92-179-X");
}



// Convert Shape file to Geojson format & keep only global FSAs
echo "Convert Shape file and filters FSAs..." . RN;
$montrealFSAFile = $srcMapDir . 'montreal-fsas.geojson';
passthru('mapshaper ' . escapeshellarg($shpFile) . ' -proj wgs84 from=EPSG:3347 -filter "/^(?:H[1-9][A-Z]|J0[JKLNPV]|J2[WXY]|J3[ABEGHLMNVXYZ]|J4[A-Z]|J5[ABCKLMNPRTWXYZ]|J6[AEJKNRSTVWXYZ]|J7[ABCEGHJKLMNPRTVWXYZ])$/.test(RTACIDU)" -o format=geojson ' . escapeshellarg($montrealFSAFile) . ' 2>&1');





