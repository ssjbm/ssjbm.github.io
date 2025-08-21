<?php

// Load PXDoc utilities
require(__DIR__ . '/../../../pxdoc/_bin/scripts/utils.php');


// Initialize contents
$srcMapDir = realpath(__DIR__ . '../../../maps'). S;
if(!$rulesFile = realpath($srcMapDir . 'sections.json')) err("Can't find rules file.");
if(!$rules = json_decode(file_get_contents($rulesFile))) err("Invalid rules file.");
$rules->sections[] = $rules->defaultSection;


// Crawl each sections for infos
foreach($rules->sections as $section) {
    echo 'Crawl: ' . $section->name . '...' . RN;
    $page = new Scraper($section->url);
    
    $section->description = trim($page->query('//section[1]/div/div[2]/div/div/div/div/section[2]')->item(0)->textContent);

    $infos = new stdClass;
    $results = $page->query('//section[3]/div//table');
    if(!$results->length) $results = $page->query('//section[4]/div//table');
    $table = $results->item(0);
    foreach($table->getElementsByTagName('tr') as $row) {
        $key = $row->getElementsByTagName('td')->item(0)->textContent;
        $key = trim($key);
        $key = str_normalize($key);
        $key = strtolower($key);
        $key = trim(preg_replace('#[^\w]+#i', '_', $key), '_');
        if(!$key) continue;

        $values = [];
        $cell = $row->getElementsByTagName('td')->item(1);
        $paragraphs = $cell->getElementsByTagName('p');
        if($paragraphs->length) {
            foreach($paragraphs as $parag){
                $value = trim($parag->textContent);
                if($value) $values[] = $value;
            }
        } else {
            foreach($cell->childNodes as $elm) {
                if($elm->nodeType !== XML_TEXT_NODE) continue;
                if(($value = trim($elm->textContent))) $values[] = $value;
            }
        }

        // Cleanup
        foreach($values as $k => $v) if(!trim($v,' ')) unset($values[$k]);
        $infos->{$key} = $values;
        $section->id = preg_replace('#[^\w]+#i', '-', $section->id);
    }
    $section->infos = $infos;
}


// Save the new result
array_pop($rules->sections);
file_put_contents($rulesFile, json_encode($rules, JSON_PRETTY_PRINT));


// EN FRANÇAIS!
echo RN . 'EN FRANÇAIS ✊' . RN;