<?php
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');

const GEOCODER_API_KEY = 'AIzaSyDUbLCfJfcZtNGs0Zaml_LJiL_AQLKnuWI';


$fsasFile = realpath(__DIR__ . '/../../../trouver-sa-section/data/fsas.json');


$data = getFSAGeocode('H3K');

print_r($data);

return;

$dataFile = realpath(__DIR__ . '/../../../trouver-sa-section/data/rules.json');
$data = json_decode(file_get_contents($dataFile));

$fsas = [];
foreach ($data->sections as $section) $fsas = array_merge($fsas, $section->fsa);
$fsas = array_values(array_unique($fsas));
sort($fsas);



print_r($fsas);
















function getFSAGeocode($fsa) {
    if(!$data = Cache::get(($key = 'fsa_' . strtolower($fsa)))) {
        if(!$data = json_decode(curl_get_contents('https://maps.googleapis.com/maps/api/geocode/json?' . http_build_query([
            'components' => "country:CA|postal_code:" . strtoupper($fsa),
            'language'   => 'fr-CA',
            'key'        => GEOCODER_API_KEY,
        ], '', '&', PHP_QUERY_RFC3986)))) return false;
        Cache::set($key, $data);
    }
    return $data->status == 'OK' ? $data->results[0] : false;
}