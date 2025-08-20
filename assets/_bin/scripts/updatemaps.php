<?php
const SHP_ZIP_URL = 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lrta000b21a_f.zip';

require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');

$srcMapDir = realpath(__DIR__ . '../../maps'). S;
$destMapDir = realpath(__DIR__ . '../../../maps'). S;


// --> Load FSA rules for sections
echo "Load FSA rules...".RN;
if(!$rulesFile = realpath($destMapDir . 'rules.json')) err("Can't find rules file.");
if(!$rules = json_decode(file_get_contents($rulesFile))) err("Invalid rules file.");


// Prepare Global FSAs
$globalFSAs = [];
foreach ($rules->sections as $section) $globalFSAs = array_merge($globalFSAs, $section->fsa);
$globalFSAs = array_values(array_unique($globalFSAs));
sort($globalFSAs);
$globalFSAsString = join('|', $globalFSAs);


// Download shape file from Statcan
if(!$shpFile = current(glob($srcMapDir . '*.shp'))) {
    echo 'Downloading ' . pathinfo(SHP_ZIP_URL, PATHINFO_BASENAME) . ': 0%';
    $tmpFile = sys_get_temp_dir() . S . pathinfo(SHP_ZIP_URL, PATHINFO_BASENAME);
    if(!curl_get_contents(SHP_ZIP_URL, $tmpFile, function($prog){
        echo R . 'Downloading ' . pathinfo(SHP_ZIP_URL, PATHINFO_BASENAME) . ': ' . round($prog * 100) . '%';
    })) err("Can't download shape file. Try to download it manualy and unzip it into /assets/_bin/maps/ https://www150.statcan.gc.ca/n1/en/catalogue/92-179-X");
    echo RN . 'Unzip ' . pathinfo(SHP_ZIP_URL, PATHINFO_BASENAME) . '...' . RN;
    if(!unzip($tmpFile, $srcMapDir, pathinfo(SHP_ZIP_URL, PATHINFO_FILENAME))) err("Can't unzip shape file.");
    unlink($tmpFile);
    if(!$shpFile = current(glob($srcMapDir . '*.shp'))) err("Cant't find shape file. Please download it at: Try to download it manualy and unzip it into /assets/_bin/maps/ https://www150.statcan.gc.ca/n1/en/catalogue/92-179-X");
}


// Convert Shape file to Geojson format & keep only global FSAs
echo "Convert Shape file to Geojson format..." . RN;
$masterGeojsonFile = $srcMapDir . 'fsa_subset_master.geojson';
shell_exec('mapshaper ' . escapeshellarg($shpFile) . ' -proj wgs84 from=EPSG:3347 -filter "/^(' . $globalFSAsString . ')$/.test(RTACIDU)" -o format=geojson ' . escapeshellarg($masterGeojsonFile) . ' 2>&1');


// Create global territory map
echo "Create global territory map file..." . RN;
$globalAreaFile = $destMapDir . 'global-area.geojson';
shell_exec('mapshaper ' . escapeshellarg($masterGeojsonFile) . ' -dissolve -simplify visvalingam 5% keep-shapes -clean -o format=geojson geojson-type=FeatureCollection ' . escapeshellarg($globalAreaFile) . ' 2>&1');


// Generate sections maps
foreach($rules->sections as $section) {
    echo "Generate section map: " . $section->name.RN;
    $sectionFile = $destMapDir . 'section-' . $section->id . '.geojson';
    shell_exec('mapshaper ' . escapeshellarg($masterGeojsonFile) . ' -filter "/^(' . join('|', $section->fsa) . ')$/.test(RTACIDU)" -dissolve -simplify visvalingam 5% keep-shapes -clean -o format=geojson geojson-type=FeatureCollection ' . escapeshellarg($sectionFile) . ' 2>&1');
}






// $list = '["' . join('", "', $fsas) . '"]';
// echo $list.RN;
// print_r($fsas);


// https://www150.statcan.gc.ca/n1/en/catalogue/92-179-X
// https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lrta000b21a_f.zip
// mapshaper path/to/FSA_2021.shp -o format=geojson cfsa_2021.geojson
// mapshaper cfsa_2021.geojson -info
// passthru('mapshaper cfsa_2021.geojson -filter "/^(' . join('|', $fsas) . ')$/.test(RTACIDU)" -o cfsa_subset.geojson');
// mapshaper cfsa_subset.geojson -proj wgs84 from=EPSG:3347 -o geotruc.geojson

// mapshaper cfsa_subset.geojson -proj wgs84 from=EPSG:3347 -buffer 100 -buffer -100 -dissolve -o cfsa_subset_buffer.geojson
// mapshaper cfsa_subset_buffer.geojson -dissolve -simplify visvalingam 5% keep-shapes -clean -o format=geojson geotruc_full.geojson
// mapshaper geotruc_full.geojson -proj wgs84 from=EPSG:3347 -o geotruc_full_repair.geojson


// mapshaper geotruc.geojson -dissolve -simplify visvalingam 5% keep-shapes -clean -o format=geojson geojson-type=FeatureCollection geotruc_full.geojson



// const GEOCODER_API_KEY = 'AIzaSyDUbLCfJfcZtNGs0Zaml_LJiL_AQLKnuWI';


// $fsasFile = realpath(__DIR__ . '/../../../trouver-sa-section/data/fsas.json');


// $data = getFSAGeocode('H3K');

// print_r($data);

// return;



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




function unzip($zipfile, $dest, $subdir = '')
{
    $zip = new ZipArchive;
    if ($zip->open($zipfile) === TRUE) {
        $subdir = ltrim(rtrim($subdir, '/'), '/'); // nettoie le paramètre
        $prefix = $subdir !== '' ? $subdir . '/' : '';

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $name = $stat['name'];

            // si on a défini un sous-dossier → filtre
            if ($prefix === '' || strpos($name, $prefix) === 0) {
                // chemin relatif dans l’archive
                $relativePath = $prefix !== '' ? substr($name, strlen($prefix)) : $name;

                if ($relativePath === '') {
                    continue; // ignore le dossier lui-même
                }

                $targetPath = rtrim($dest, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $relativePath;

                // Créer les dossiers si besoin
                if (substr($name, -1) === '/') {
                    @mkdir($targetPath, 0777, true);
                } else {
                    @mkdir(dirname($targetPath), 0777, true);
                    copy("zip://".$zipfile."#".$name, $targetPath);
                }
            }
        }

        $zip->close();
        return true;
    } else {
        return false;
    }
}
