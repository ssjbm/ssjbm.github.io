<?php
/**
 * @type     article
 * @title    Trouver sa section
 * @icon     images/icon3.svg
 * @abstract Outil pour trouver le nom de sa section avec son code postal
 */
?>



<!-- <grostitre>Territoires</grostitre>

<table>
    <thead>
        <tr>
            <th>Territoire</th>
            <th>Section</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>MRC L'Assomption (Repentigny, L'Assomption, L'Épiphanie, Charlemagne, St-Sulpice)</td>
            <td>Pierre-Le-Gardeur</td>
        </tr>
        <tr>
            <td>MRC Les Moulins (Terrebonne, Mascouche)</td>
            <td>Yves-Blais</td>
        </tr>
        <tr>
            <td>MRC Deux-Montagnes (St-Eustache, Ste-Marthe, etc.) et Mirabel</td>
            <td>Joseph-Olivier Chênier</td>
        </tr>
        <tr>
            <td>Laval</td>
            <td>Laval</td>
        </tr>
        <tr>
            <td>Arrondissements Pierrefonds-Roxoboro et Île-Bizard-Ste-Geneviève, villes de Kirkland, Saint-Anne-de-Bellevue, Beaconsfield, Baie-d'Urfé, Pointe-Claire, Dorval, Dollard-des-Ormeaux</td>
            <td>Ouest-de-l'île</td>
        </tr>
        <tr>
            <td>Arrondissements Ahuntsic-Cartierville et Saint-Laurent</td>
            <td>Nicolas-Viel</td>
        </tr>
        <tr>
            <td>Arrondissements Montréal-Nord et Saint-Léonard</td>
            <td>Henri-Bourassa</td>
        </tr>
        <tr>
            <td>Arrondissements RDP-PAT et Anjou, ville de Montréal-Est</td>
            <td>Louis-Riel</td>
        </tr>
        <tr>
            <td>Arrondissement Mercier-Hochelaga-Maisonneuve</td>
            <td>Chomedey-de-Maisonneuve-Jeanne-Mance</td>
        </tr>
        <tr>
            <td>Arrondissements Villeray-Saint-Michel-Parc-Extension et Rosemont-Petite-Patrie</td>
            <td>Andrée-Ferretti</td>
        </tr>
        <tr>
            <td>Arrondissements CDN-NDG et Outremont, Mont-Royal, Hampstead, Côte-Saint-Luc et Montréal-Ouest</td>
            <td>Jacques-Viger</td>
        </tr>
        <tr>
            <td>Arrondissements Sud-Ouest, Verdun, LaSalle et Lachine</td>
            <td>Marguerite-Bourgeoys</td>
        </tr>
        <tr>
            <td>Arrondissements Plateau-Mont-Royal, Ville-Marie et Westmount</td>
            <td>Chevalier-de-Lorimier</td>
        </tr>
        <tr>
            <td>Agglomération de Longueuil (sauf Brossard)</td>
            <td>Pierre-Lemoyne-D'Iberville</td>
        </tr>
        <tr>
            <td>MRC Roussillon (villes de La Prairie, St-Constant, Candiac, Ste-Catherine, Châteauguay, Delson, etc.) et Brossard</td>
            <td>Doris-Lussier</td>
        </tr>
    </tbody>
</table>

<dots></dots> -->


<grostitre>Outil de recherche</grostitre>

<div class="searchtool">
    <div class="searchtool__header">
        Entrez votre <strong>code postal:&nbsp;&nbsp;</strong>
        <span class="searchtool__nowrap">
            <input id="searchtool_postalcode" class="searchtool__header__postalcode" name="postalcode" type="text" placeholder="H2K 2V6" maxlength="7" required pattern="^^[Hh][0-9][ABCEGHJ-NPRSTV-Zabceghj-nprstv-z][ ]?[0-9][ABCEGHJ-NPRSTV-Zabceghj-nprstv-z][0-9]$" title="Entrez un code postal valide du Québec (ex: H2K 2V6)">
            <span class="searchtool__header__validmark"></span>
        </span>
    </div>
</div>


<dots></dots>

<script src="./jscripts/script.js"></script>
<script>
    ready(() => {
        SearchTool.init();
    });
</script>