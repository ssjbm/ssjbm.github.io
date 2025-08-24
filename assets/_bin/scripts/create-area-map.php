<?php


// Add more memory to the script
ini_set('memory_limit', '2G');


// Define Official Aggregate dissemination area shape file URL
const ZIP_FILE_AGGDISAREAS = 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lada000b21a_f.zip'; // "properties":{"ADAIDU":"24040002","IDUGD":"2021S051624040002","SUPTERRE":263.5086,"PRIDU":"24"}},


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

];


// Load PXDoc utilities
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');


// Updating sections map
echo "Create area map...\r\n";


// Set dirs
$srcMapDir = realpath(__DIR__ . '../../../maps') . S;


// Get offical aggreate dissemination areas SHP file
$shpFile = get_shp_file(ZIP_FILE_AGGDISAREAS, $srcMapDir);


// Generate greater Montréal area Geojson
echo "Generate greater Montréal area Geojson..." . RN;
$montrealAreaFile = $srcMapDir . 'montreal-areas.geojson';
$divisionsString = "'" . join("','", DIVISIONS) . "'";
shell_exec('mapshaper ' . escapeshellarg($shpFile) . ' -proj wgs84 from=EPSG:3347 -filter "[' . $divisionsString . '].indexOf(String(ADAIDU).slice(0,4)) >= 0" -o format=geojson ' . escapeshellarg($montrealAreaFile) . ' 2>&1');


// Generate greater Montréal area Geojson
echo "Optimize Geojson file..." . RN;
GeoJsonSimplify::simplifyFile($montrealAreaFile);
GeoJsonBBox::addBBoxesToFile($montrealAreaFile);
file_put_contents($montrealAreaFile, json_encode(json_decode(file_get_contents($montrealAreaFile))));


// EN FRANÇAIS!
echo RN . 'EN FRANÇAIS ✊' . RN;
exit(0);


// Download help functions
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
    throw err("Can't find shp file in the zip.");
}


// Create a fnmatch pattern from StatCan zip file
function shp_pattern_from_zip(string $url): string {
    $filename = pathinfo($url, PATHINFO_FILENAME);
    return substr($filename, 0, 4) . '*_f.shp';
}