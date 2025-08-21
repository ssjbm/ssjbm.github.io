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