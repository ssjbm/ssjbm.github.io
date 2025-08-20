<?php
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');

// const GEOCODER_API_KEY = 'AIzaSyDUbLCfJfcZtNGs0Zaml_LJiL_AQLKnuWI';


// $fsasFile = realpath(__DIR__ . '/../../../trouver-sa-section/data/fsas.json');


// $data = getFSAGeocode('H3K');

// print_r($data);

// return;

$dataFile = realpath(__DIR__ . '/../../../trouver-sa-section/data/rules.json');
$data = json_decode(file_get_contents($dataFile));

$fsas = [];
foreach ($data->sections as $section) $fsas = array_merge($fsas, $section->fsa);
$fsas = array_values(array_unique($fsas));
sort($fsas);

// $list = '["' . join('", "', $fsas) . '"]';
// echo $list.RN;
// print_r($fsas);


// https://www150.statcan.gc.ca/n1/en/catalogue/92-179-X?utm_source=chatgpt.com
// mapshaper path/to/FSA_2021.shp -o format=geojson cfsa_2021.geojson
// mapshaper cfsa_2021.geojson -info
// passthru('mapshaper cfsa_2021.geojson -filter "/^(' . join('|', $fsas) . ')$/.test(RTACIDU)" -o cfsa_subset.geojson');
// mapshaper cfsa_subset.geojson -proj wgs84 from=EPSG:3347 -o geotruc.geojson

// mapshaper cfsa_subset.geojson -proj wgs84 from=EPSG:3347 -buffer 100 -buffer -100 -dissolve -o cfsa_subset_buffer.geojson
// mapshaper cfsa_subset_buffer.geojson -dissolve -simplify visvalingam 5% keep-shapes -clean -o format=geojson geotruc_full.geojson
// mapshaper geotruc_full.geojson -proj wgs84 from=EPSG:3347 -o geotruc_full_repair.geojson


// mapshaper geotruc.geojson -dissolve -simplify visvalingam 5% keep-shapes -clean -o format=geojson geojson-type=FeatureCollection geotruc_full.geojson







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