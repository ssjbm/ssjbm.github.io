<?php

// Load PXDoc utilities
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');

$srcMapDir = realpath(__DIR__ . '../../../maps'). S;
if(!$rulesFile = realpath($srcMapDir . 'sections.json')) err("Can't find rules file.");
if(!$rules = json_decode(file_get_contents($rulesFile))) err("Invalid rules file.");
$rules->sections[] = $rules->defaultSection;



foreach($rules->sections as $section) {
    $page = new Scraper($section->url);
    
    echo $section->name.RN;
    $section->description = trim($page->query('//section[1]/div/div[2]/div/div/div/div/section[2]')->item(0)->textContent);

    $results = $page->query('//section[3]/div//table');
    if(!$results->length) $results = $page->query('//section[4]/div//table');
    // $table = $;

    // $rows = $page->query($results->item(0)->getNodePath() . '//tr');
    $table = $results->item(0);
    foreach($table->getElementsByTagName('tr') as $row) {
        $key = $row->getElementsByTagName('td')->item(0)->textContent;
        $key = trim($key);
        $key = str_normalize($key);
        $key = strtolower($key);
        $key = trim(preg_replace('#[^\w]+#i', '_', $key), '_');

        echo $key.RN;

    }
}



// $index = new Scraper('https://ssjb.com/sections/');

// foreach($index->query('//div[@class="elementor-widget-container"]/ul/li/*/a') as $secElm) {
//     $section
//     $text = trim($secElm->textContent);
//     // echo $secElm->getNodePath().RN;

// }


