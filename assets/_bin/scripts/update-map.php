<?php

// Official Statcan FSA Geo Map
const SHP_ZIP_URL = 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lrta000b21a_f.zip';


// Load PXDoc utilities
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');


// --> Load FSA rules for sections
echo "Load FSA rules...".RN;
$srcMapDir = realpath(__DIR__ . '../../../maps'). S;
if(!$rulesFile = realpath($srcMapDir . 'sections.json')) err("Can't find rules file.");
if(!$rules = json_decode(file_get_contents($rulesFile))) err("Invalid rules file.");


// Prepare Global FSAs
$globalFSAs = [];
foreach ($rules->sections as $section) $globalFSAs = array_merge($globalFSAs, $section->fsa);
$globalFSAs = array_values(array_unique($globalFSAs));
sort($globalFSAs);


// Download shape file from Statcan
if(!$shpFile = current(glob($srcMapDir . '*.shp'))) {
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
    if(!$shpFile = current(glob($srcMapDir . '*.shp'))) err("Cant't find shape file. Please download it at: Try to download it manualy and unzip it into /assets/_bin/maps/ https://www150.statcan.gc.ca/n1/en/catalogue/92-179-X");
}


// Convert Shape file to Geojson format & keep only global FSAs
echo "Convert Shape file and filters FSAs..." . RN;
$masterGeojsonFile = $srcMapDir . 'fsa_subset_master.geojson';
shell_exec('mapshaper ' . escapeshellarg($shpFile) . ' -proj wgs84 from=EPSG:3347 -filter "/^(' . join('|', $globalFSAs) . ')$/.test(RTACIDU)" -o format=geojson ' . escapeshellarg($masterGeojsonFile) . ' 2>&1');


// Generate sections maps
foreach($rules->sections as $section) {
    echo "Generate section map: " . $section->name.RN;
    $sectionFile = $srcMapDir . 'section-' . $section->id . '.geojson';
    $sectionFiles[] = escapeshellarg($sectionFile);
    shell_exec('mapshaper ' . escapeshellarg($masterGeojsonFile) . ' -filter "/^(' . join('|', $section->fsa) . ')$/.test(RTACIDU)" -dissolve -simplify visvalingam 5% keep-shapes -clean -each "id=\'' . addslashes($section->id) . '\'; name=\'' . addslashes($section->name) . '\'" -o format=geojson geojson-type=FeatureCollection id-field=fid ' . escapeshellarg($sectionFile) . ' 2>&1');
}


// Merge sections into one file
echo "Merge section files in one FeatureCollection file..." . RN;
$globalSectionFile = $srcMapDir . 'sections.geojson';
shell_exec('geojson-merge ' . join(' ', $sectionFiles) . ' > ' . escapeshellarg($globalSectionFile));
file_put_contents($globalSectionFile, json_encode(json_decode(file_get_contents($globalSectionFile))));


// Cleanup
echo "Cleanup..." . RN;
unlink($masterGeojsonFile);
array_map('unlink', glob($srcMapDir . 'section-*.geojson'));


// EN FRANÇAIS!
echo RN . 'EN FRANÇAIS ✊' . RN;