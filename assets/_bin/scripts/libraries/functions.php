<?php

const ZIP_FILE_DIVISIONS = 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/ldr_000b21a_f.zip';   // "properties":{"DRIDU":"2448","IDUGD":"2021A00032448","DRNOM":"Acton","DRGENRE":"MRC","SUPTERRE":579.6411,"PRIDU":"24"}},
const ZIP_FILE_DISAREAS = 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lad_000b21a_f.zip';    // "properties":{"ADIDU":"24010028","IDUGD":"2021S051224010028","SUPTERRE":2.3127,"PRIDU":"24"}},
const ZIP_FILE_AGGDISAREAS = 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lada000b21a_f.zip'; // "properties":{"ADAIDU":"24040002","IDUGD":"2021S051624040002","SUPTERRE":263.5086,"PRIDU":"24"}},

const GEOJSON_FILE_ARRONDISSEMENTS = 'https://donnees.montreal.ca/dataset/9797a946-9da8-41ec-8815-f6b276dec7e9/resource/e18bfd07-edc8-4ce8-8a5a-3b617662a794/download/limites-administratives-agglomeration.geojson';

function shp_pattern_from_zip(string $url): string {
    $filename = pathinfo($url, PATHINFO_FILENAME);
    return substr($filename, 0, 4) . '*_f.shp';
}


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




function get_great_montreal_divisions($greater = false) {

    // Noyau métropolitain (CMM ~approximée au niveau MRC/TE)
    $divisions = [
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
    ];

    // Débordement immédiat (couronne élargie, utile selon tes besoins)
    if($greater) {
        $divisions = array_merge($divisions, [
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
        ]);
    }

    return $divisions;
}




function slug($k) {
    $k = str_normalize($k);
    $k = strtolower($k);
    $k = preg_replace('#[^\w]+#i', '-', $k);
    return $k;
}