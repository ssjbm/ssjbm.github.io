<?php


// Load PXDoc utilities
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');
require(__DIR__ . '/libraries/functions.php');


// Set dirs
$srcMapDir = realpath(__DIR__ . '../../../maps'). S;
$areasFile = $srcMapDir . 'montreal-areas.geojson';
$sectionsFile = $srcMapDir . 'sections.json';
$sections = json_decode(file_get_contents($sectionsFile));


// Compile and merge areas for sections
foreach($sections->sections as $section) {
    echo 'Create section Geojson: ' . $section->name.RN;
    $sectionFile = $srcMapDir . 'section-' . $section->id . '.geojson';
    $sectionFiles[] = escapeshellarg($sectionFile);
    shell_exec('mapshaper ' . escapeshellarg($areasFile) . ' -filter "/^(' . join('|', $section->areas) . ')$/.test(IDUGD)" -dissolve -simplify visvalingam 5% keep-shapes -clean -each "id=\'' . addslashes($section->id) . '\'; name=\'' . addslashes($section->name) . '\'" -o format=geojson geojson-type=FeatureCollection id-field=fid ' . escapeshellarg($sectionFile) . ' 2>&1');
}


// Merge sections into one file
echo "Merge section files in one FeatureCollection file..." . RN;
$globalSectionFile = $srcMapDir . 'sections.geojson';
shell_exec('geojson-merge ' . join(' ', $sectionFiles) . ' > ' . escapeshellarg($globalSectionFile));
file_put_contents($globalSectionFile, json_encode(json_decode(file_get_contents($globalSectionFile))));


// Cleanup
echo "Cleanup..." . RN;
array_map('unlink', glob($srcMapDir . 'section-*.geojson'));



$bounds = [];
$sectionsFeaturesFile = $srcMapDir . 'sections.geojson';
$sectionsFeatures = json_decode(file_get_contents($sectionsFeaturesFile));

foreach($sectionsFeatures->features as $feature) {
    $info = Geomatic::featureBounds($feature);
    $bounds[$feature->properties->id] = $info;
}

$sectionsFile = $srcMapDir . 'sections.json';
$sections = json_decode(file_get_contents($sectionsFile));
foreach($sections->sections as $section) $section->bounds = $bounds[$section->id];
file_put_contents($sectionsFile, json_encode($sections, JSON_PRETTY_PRINT)); 

// print_r($bounds);


// EN FRANÇAIS!
echo RN . 'EN FRANÇAIS ✊' . RN;