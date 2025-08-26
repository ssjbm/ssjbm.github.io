<?php

// Updating sections map
echo "Updating sections map...\r\n";


// Add more memory to the script
ini_set('memory_limit', '2G');


// Load PXDoc utilities
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');


// Load Secrets
$secretFile = PXPros::findRoot(__FILE__, true) . 'secrets.json';
$secrets = json_decode(file_get_contents($secretFile));


// Set dirs
$srcMapDir = realpath(__DIR__ . '../../../maps') . S;
$geoSectionFile = $srcMapDir . 'sections.geojson';
$areasFile = $srcMapDir . 'montreal-areas.geojson';
$sectionsFile = $srcMapDir . 'sections.json';
$sections = json_decode(file_get_contents($sectionsFile));


// Compile and merge areas for sections
foreach($sections->sections as $section) {
    echo 'Create section Geojson: ' . $section->name . RN;
    $sectionFile = $srcMapDir . 'section-' . $section->id . '.geojson';
    shell_exec('mapshaper ' . escapeshellarg($areasFile) . ' -filter "([\'' . join("','", $section->areas) . '\'].indexOf(String(IDUGD)) >= 0)" -snap interval=1e-7 -dissolve -clean -each "id=\'' . addslashes($section->id) . '\'; name=\'' . addslashes($section->name) . '\'" -o format=geojson geojson-type=FeatureCollection id-field=fid ' . escapeshellarg($sectionFile) . ' 2>&1');
}


// Merge sections into one file
echo "Merge section files in one FeatureCollection file..." . RN;
GeoJsonMerge::mergeFiles([$srcMapDir . 'section-*.geojson'], $geoSectionFile, ['skipInvalid' => false]);
GeoJsonSimplify::simplifyFile($geoSectionFile);
GeoJsonBBox::addBBoxesToFile($geoSectionFile);
file_put_contents($geoSectionFile, json_encode(json_decode(file_get_contents($geoSectionFile))));
array_map('unlink', glob($srcMapDir . 'section-*.geojson'));


// Update sections bounds
echo "Update sections bounds..." . RN;
$sectionsFile = $srcMapDir . 'sections.json';
$sectionsFeaturesFile = $srcMapDir . 'sections.geojson';
$sections = json_decode(file_get_contents($sectionsFile));
$sectionsFeatures = json_decode(file_get_contents($sectionsFeaturesFile));
foreach($sectionsFeatures->features as $feature) $bounds[$feature->properties->id] = Geomatic::featureBounds($feature);
foreach($sections->sections as $section) $section->bounds = $bounds[$section->id];
file_put_contents($sectionsFile, json_encode($sections)); 


// Merge Postal Codes with KV API
echo "Merge actual postal codes with KV API..." . RN;
$postalCodesFile = $srcMapDir . 'postal-codes.json';
$postalCodes = json_decode(file_get_contents($postalCodesFile));
if(!$contents = curl_get_contents('https://script.google.com/macros/s/' . $secrets->KV_API_KEY . '/exec?action=get_all&clear=1')) err("Can't get KV API data.");
if(!$results = json_decode($contents)) err("Can't decode KV API server response.");
if(!$results->ok) err("An error occured while crawling KV API: ". $results->error);
if($results->count) {
    foreach($results->items as $item) {
        if(!$data = json_decode($item->value)) continue;
        if($data->status != 'OK') continue;
        if(!$elm = current($data->results)) continue;
        $find = false;
        foreach($elm->address_components as $component) {
            if(!in_array('postal_code', $component->types)) continue;
            $postalcode = $component->short_name;
            $find = true;
            break;
        } if(!$find) continue;
        $postalCodes->{$postalcode} = clone $elm;
    }
}
file_put_contents($postalCodesFile, json_encode($postalCodes));


// Dispatch postal codes in sections
echo "Dispatch postal codes in sections..." . RN;
$sections = json_decode(file_get_contents($sectionsFile));
$geoSections = json_decode(file_get_contents($geoSectionFile));
$defaultPostalCodes = [];
$sectionPostalCodes = [];
foreach($postalCodes as $k => $info) {
    $find = false;
    foreach($geoSections->features as $feature) {
        if(Geomatic::pointInFeature($feature, [$info->geometry->location->lng, $info->geometry->location->lat])) {
            $sectionPostalCodes[$feature->properties->id][] = $k;
            $find = true;
            break;
        }
    }
    if(!$find) $defaultPostalCodes[] = $k;
}
foreach($sections->sections as $section)
    $section->postalcodes = isset($sectionPostalCodes[$section->id]) ? $sectionPostalCodes[$section->id] : [];
$sections->defaultSection->postalcodes = $defaultPostalCodes;
file_put_contents($sectionsFile, json_encode($sections));


// Sort sections for palette intersection
echo "Sort sections for palette intersection..." . RN;
$sections = json_decode(file_get_contents($sectionsFile));
$orderedIds = FeatureOrder::orderIds($geoSectionFile, ['idKeys' => ['id'], 'paletteSize' => 15]);
foreach($sections->sections as $section) $section->color = array_search($section->id, $orderedIds);
file_put_contents($sectionsFile, json_encode($sections));


// EN FRANÇAIS!
echo RN . 'EN FRANÇAIS ✊' . RN;
exit(0);