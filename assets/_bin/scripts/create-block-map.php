<?php

// Add more memory to the script
ini_set('memory_limit', '2G');


// Define Official Aggregate dissemination area shape file URL
const ZIP_FILE_DISBLOCKS = 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lid_000b21a_f.zip'; // "properties":{"IDIDU":"24230001025","IDUGD":"2021S051324230001025","IDPRLAMX":7758022.75714286,"IDPRLAMY":1455571.86571429,"SUPTERRE":0.0171,"PRIDU":"24"}},


// Define Greater Montréal divisions
const DIVISIONS = [

    // Noyau métropolitain (CMM ~approximée au niveau MRC/TE)
    2466, // Montréal
    2465, // Laval
    2458, // Longueuil
    2472, // Deux-Montagnes
    2473, // Thérèse-De Blainville
    2474, // Mirabel
    2475, // La Rivière-du-Nord
    2464, // Les Moulins
    2460, // L’Assomption
    2463, // Montcalm
    2467, // Roussillon
    2468, // Les Jardins-de-Napierville
    2456, // Le Haut-Richelieu
    2457, // La Vallée-du-Richelieu
    2455, // Rouville
    2471, // Vaudreuil-Soulanges
    2470, // Beauharnois-Salaberry

    // Débordement immédiat (couronne élargie)
    2469, // Le Haut-Saint-Laurent
    2453, // Pierre-De Saurel
    2454, // Les Maskoutains
    2461, // Joliette
    2476, // Argenteuil
    2477, // Les Pays-d’en-Haut
    2447, // La Haute-Yamaska
    2446, // Brome-Missisquoi
    2448, // Acton
    2459, // Marguerite-D’Youville
    2452, // MRC D'Autray
    2462, // MRC de Matawinie

    // Autres
    2423, // Wendake

];


// Load PXDoc utilities
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');


// Updating sections map
echo "Create area map...\r\n";


// Set dirs
$srcMapDir = realpath(__DIR__ . '../../../maps') . S;


// Get offical aggreate dissemination areas SHP file
$shpFile = get_shp_file(ZIP_FILE_DISBLOCKS, $srcMapDir);



// Generate greater Montréal area Geojson
echo "Generate greater Montréal blocks Geojson..." . RN;
$montrealBlockFile = $srcMapDir . 'montreal-blocks.geojson';
// $divisionsString = "'" . join("','", DIVISIONS) . "'";
// passthru('mapshaper ' . escapeshellarg($shpFile) . ' -filter "[' . $divisionsString . '].indexOf(String(IDIDU).slice(0,4)) >= 0" -proj wgs84 from=EPSG:3347 -snap interval=1e-9 -simplify visvalingam 5% keep-shapes -clean -o precision=0.00000001 format=geojson ' . escapeshellarg($montrealBlockFile) . ' 2>&1');
// GeoJsonBBox::addBBoxesToFile($montrealBlockFile);
// file_put_contents($montrealBlockFile, json_encode(json_decode(file_get_contents($montrealBlockFile))));



$sectionsFile = $srcMapDir . 'sections.json';
$sectionsFeaturesFile = $srcMapDir . 'sections.geojson';

$blocks = json_decode(file_get_contents($montrealBlockFile));
$sections = json_decode(file_get_contents($sectionsFile));
$sectionsFeatures = json_decode(file_get_contents($sectionsFeaturesFile));

// echo count($blocks->features).RN;

foreach($blocks->features as $feature) {
    list($lngmin, $latmin, $lngmax, $latmax) = $feature->bbox;
    $lat = $latmin + (($latmax - $latmin) / 2);
    $lng = $lngmin + (($lngmax - $lngmin) / 2);

    foreach($sectionsFeatures->features as $sectionFeature) {

    }

    // if(Geomatic::pointInFeature($feature, [$info->geometry->location->lng, $info->geometry->location->lat])) {

    // echo '{ ' . $lat . ', ' . $lng . ' }' . RN;
    // print_r($feature->bbox);
}


// EN FRANÇAIS!
echo RN . 'EN FRANÇAIS ✊' . RN;
exit(0);


























// Download helper functions
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
    })) err("Can't download shape file. Try to download it manualy and unzip it into /assets/_bin/maps/ " . $url);

    echo RN . 'Unzip ' . pathinfo($url, PATHINFO_BASENAME) . '...' . RN;
    $files = unzip_flat($tmpFile, $dest, ['*.dbf', '*.shp']);
    unlink($tmpFile);

    foreach($files as $file) if(pathinfo($file, PATHINFO_EXTENSION) == 'shp') return realpath($file);
    err("Can't find shp file in the zip.");
}


// Create a fnmatch pattern from StatCan zip file
function shp_pattern_from_zip(string $url): string {
    $filename = pathinfo($url, PATHINFO_FILENAME);
    return substr($filename, 0, 4) . '*_f.shp';
}