<?php


// For further use
function getFSAGeocode($fsa) {
    if(!$data = Cache::get(($key = 'fsa_' . strtolower($fsa)))) {
        if(!$data = json_decode(curl_get_contents('https://maps.googleapis.com/maps/api/geocode/json?' . http_build_query([
            'components' => "country:CA|postal_code:" . strtoupper($fsa),
            'language'   => 'fr-CA',
            // 'key'        => GEOCODER_API_KEY,
        ], '', '&', PHP_QUERY_RFC3986)))) return false;
        Cache::set($key, $data);
    }
    return $data->status == 'OK' ? $data->results[0] : false;
}















die();
try {
    

    // Get offical aggreate dissimination areas SHP file
    $shpFile = get_shp_file(ZIP_FILE_AGGDISAREAS, $srcMapDir);


    // Generate greater Montréal area Geojson
    echo "Generate greater Montréal area Geojson..." . RN;
    $montrealAreaFile = $srcMapDir . 'montreal-areas.geojson';
    $divisions = get_great_montreal_divisions(true);
    $divisionsString = "'" . join("','", $divisions) . "'";
    if(!is_file($montrealAreaFile) || !PASS_THRU) shell_exec('mapshaper ' . escapeshellarg($shpFile) . ' -proj wgs84 from=EPSG:3347 -filter "[' . $divisionsString . '].indexOf(String(ADAIDU).slice(0,4)) >= 0" -o format=geojson ' . escapeshellarg($montrealAreaFile) . ' 2>&1');


    // Generate area info file
    echo "Generate area info Json..." . RN;
    $infos = [];
    $montrealAreaInfoFile = $srcMapDir . 'montreal-areas.json';
    if(!is_file($montrealAreaInfoFile) || !PASS_THRU) {
        $areas = json_decode(file_get_contents($montrealAreaFile));
        foreach($areas->features as $feature) {
            $info = clone $feature->properties;
            $info->BOUNDS = Geomatic::featureBounds($feature);
            $infos[] = $info;
        }
        file_put_contents($montrealAreaInfoFile, json_encode($infos, JSON_PRETTY_PRINT));
    }






// GEOJSON_FILE_ARRONDISSEMENTS



    // $sectionsFile = $srcMapDir . 'sections.json';
    // $sections = json_decode(file_get_contents($sectionsFile));

    // foreach($sections->sections as $section) {
    //     if(!isset($sectionsAreas[$section->id])) {
    //         // print_r($section);
    //         echo $section->name.RN;
    //     }
        
    //     $section->areas = $sectionsAreas[$section->id];
    // }

// print_r($sections);



} catch(Exception $e) {
    err($e->getMessage());
}











die();
// https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/ldr_000b21a_f.zip
// "properties":{"DRIDU":"2448","IDUGD":"2021A00032448","DRNOM":"Acton","DRGENRE":"MRC","SUPTERRE":579.6411,"PRIDU":"24"}},

// Load PXDoc utilities
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');

$srcMapDir = realpath(__DIR__ . '../../../maps'). S;
$shpFile = realpath($srcMapDir . 'ldr_000b21a_f.shp');


$divisionFile = $srcMapDir . 'division-global.geojson';
// passthru('mapshaper ' . escapeshellarg($shpFile) . ' -proj wgs84 from=EPSG:3347 -filter "/^24$/.test(PRIDU)" -o format=geojson ' . escapeshellarg($divisionFile) . ' 2>&1');



$contents = file_get_contents($divisionFile);
$divisions = json_decode($contents);
foreach($divisions->features as $feature) {
    print_r($feature->properties);
}








// https://www12.statcan.gc.ca/census-recensement/2011/geo/bound-limit/files-fichiers/lsdr000a25a_f.zip


$areaFile = $srcMapDir . 'area-global.geojson';
passthru('mapshaper ' . escapeshellarg($shpFile) . ' -proj wgs84 from=EPSG:3347 -filter "/^24$/.test(PRIDU)" -o format=geojson ' . escapeshellarg($areaFile) . ' 2>&1');






// https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lad_000b21a_f.zip

// passthru('mapshaper ' . escapeshellarg($shpFile) . ' -proj wgs84 from=EPSG:3347 -filter "/^24$/.test(PRIDU)" -o format=geojson ' . escapeshellarg($subdivisionFile) . ' 2>&1');


die();


$baseCMA = 'https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/6/query';

$cmageo = json_decode(file_get_contents($baseCMA . '?' . http_build_query([
  'where' => "CMAUID='462'",
  'outFields' => 'CMAUID,CMANAME',
  'returnGeometry' => 'true',
  'f' => 'pjson'
])) , true);

print_r($cmageo);


die();






$subdivisionFile = $srcMapDir . 'subdivisions-global.geojson';
// passthru('mapshaper ' . escapeshellarg($shpFile) . ' -proj wgs84 from=EPSG:3347 -filter "/^24$/.test(PRIDU)" -o format=geojson ' . escapeshellarg($subdivisionFile) . ' 2>&1');

$contents = file_get_contents($subdivisionFile);
$subdivisions = json_decode($contents);
foreach($subdivisions->features as $feature) {
    print_r($feature->properties);
}


// PRIDU = province/territoire (anglais : PRUID)
// DRIDU = division de recensement (anglais : CDUID)
// SDRIDU = subdivision de recensement (anglais : CSDUID)





// $secretFile = PXPros::findRoot(__FILE__, true) . 'secrets.json';
// $secrets = json_decode(file_get_contents($secretFile));
// foreach($secrets as $k => $v) define($k, $v);

// echo $secretFile.RN;
// print_r($secrets);
// echo MAPS_API_KEY.RN;

// print_r(getPostalGeocode('J0L 0B8'));

// function getPostalGeocode($postalcode) {
//     if(!$data = Cache::get(($key = 'postalcode_' . strtolower($postalcode)))) {
//         if(!$data = json_decode(curl_get_contents('https://maps.googleapis.com/maps/api/geocode/json?' . http_build_query([
//             'components' => "country:CA|postal_code:" . strtoupper($postalcode),
//             'language'   => 'fr-CA',
//             'key'        => MAPS_API_KEY,
//         ], '', '&', PHP_QUERY_RFC3986)))) return false;
//         Cache::set($key, $data);
//     }
//     return $data->status == 'OK' ? $data->results[0] : false;
// }





/* ============= UPDATE SECTIONS BOUNDS ==============
$bounds = [];
$sectionsFeaturesFile = $srcMapDir . 'sections.geojson';
$sectionsFeatures = json_decode(file_get_contents($sectionsFeaturesFile));

foreach($sectionsFeatures->features as $feature) {
    $info = Geomatic::featureBounds($feature);
    $bounds[$feature->properties->id] = $info;
}

$sectionsFile = $srcMapDir . 'sections.json';
$sections = json_decode(file_get_contents($sectionsFile));
foreach($sections->sections as $section) {$section->bounds = $bounds[$section->id];
file_put_contents($sectionsFile, json_encode($sections, JSON_PRETTY_PRINT)); 
*/



/* =============== Reset sections to ChatGPT Render ===========
$sectionsAreasByChatgptFile = $srcMapDir . 'sections-areas-by-chatgpt.json';
$sectionsAreasByChatgpt = json_decode(file_get_contents($sectionsAreasByChatgptFile));

$sectionsFile = $srcMapDir . 'sections.json';
$sections = json_decode(file_get_contents($sectionsFile));

$sectionsAreas = [];
foreach($sectionsAreasByChatgpt as $k => $areas) $sectionsAreas[slug($k)] = $areas;
foreach($sections->sections as $section) $section->areas = $sectionsAreas[$section->id];
file_put_contents($sectionsFile, json_encode($sections, JSON_PRETTY_PRINT));
*/



