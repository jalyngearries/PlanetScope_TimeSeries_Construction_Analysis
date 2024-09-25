https://code.earthengine.google.com/6248019f64e22c0e2dc6309000fe9875
        // IMAGE COLLECTION -->  SITE HEALTH DATA

// import image collections
  // 4-Band
var C223_imgcoll_old = ee.ImageCollection('projects/ee-jg3648/assets/C223_imgcoll_4band')
  // 8-Band
var C223_imgcoll = ee.ImageCollection('projects/ee-jg3648/assets/C223_imgcoll_8band')

// import ROIs
var C223_TxPoly_bound_fc = ee.FeatureCollection('projects/ee-jg3648/assets/Polygons/New/C223_TxPoly')

// convert ROI to geometry
var C223_TxPoly = C223_TxPoly_bound_fc.first().geometry();

// define quality bands
var qualitybands = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']
var qualitybands2 = ['Q1', 'Q2', 'Q3', 'Q4']

// define function to remove bands
var selectBands = function(image){
  return image.select(image.bandNames().removeAll(qualitybands));};
var selectBands2 = function(image){
  return image.select(image.bandNames().removeAll(qualitybands2));};

// apply function to image collection
var C223_imgcoll = C223_imgcoll.map(selectBands)
var C223_imgcoll_old = C223_imgcoll_old.map(selectBands)

// define band names for SuperDove sensors
var bands = {'CoastalBlue': 'B1', 'Blue': 'B2', 'GreenI': 'B3', 'Green': 'B4', 'Yellow': 'B5', 'Red': 'B6', 'RedEdge': 'B7', 'NIR': 'B8'};
var bands2 = {'Blue':'B1', 'Green': 'B2', 'Red': 'B3', 'NIR': 'B4'};

// define vegetation index function parameters
/**
 * Function to calculate and return only the custom vegetation index band for each image in a collection.
 * @param {ee.ImageCollection} imageCollection - The input image collection.
 * @param {String} expression - The formula to compute the index, using band tags (e.g., 'NIR', 'Red').
 * @param {Object} bandNames - Object mapping generic band tags to actual band names in the image.
 * @returns {ee.ImageCollection} - The image collection with only the new index band in each image.
 */

 // create adaptable function to compute the index for each image in a collection
function calculateIndexCollection(imageCollection, expression, bandNames) {
  return imageCollection.map(function(image) {
    var expr = expression.replace(/(B1|B2|B3|B4|B5|B6|B6Edge|B8)/g, function(match) {
      return bandNames[match];

    });
var indexImage = image.expression(expr, {
  'CoastalBlue': image.select(bandNames['CoastalBlue']),
  'Blue': image.select(bandNames['Blue']),
  'GreenI': image.select(bandNames['GreenI']),
  'Green': image.select(bandNames['Green']),
  'Yellow': image.select(bandNames['Yellow']),
  'Red': image.select(bandNames['Red']),
  'RedEdge': image.select(bandNames['RedEdge']),
  'NIR': image.select(bandNames['NIR'])

}).rename('index');
return indexImage;  // Returning only the index band
  });
}

function calculateIndexCollection2(imageCollection, expression, bandNames) {
  return imageCollection.map(function(image) {
    var expr = expression.replace(/(B1|B2|B3|B4)/g, function(match) {
      return bandNames[match];

    });
var indexImage = image.expression(expr, {
  'Blue': image.select(bands2['Blue']),
  'Green': image.select(bands2['Green']),
  'Red': image.select(bands2['Red']),
  'NIR': image.select(bands2['NIR'])

}).rename('index');
return indexImage;  // Returning only the index band
  });
}

// define vegetation index band math expression
var MSAVI_exp = '0.5 * (2 * NIR + 1 - sqrt((2 * NIR + 1) ** 2 - 8 * (NIR - Red)))';

// apply veg index calculation function to image collection
var C223_MSAVI_imgcoll_old = calculateIndexCollection(C223_imgcoll_old, MSAVI_exp, bands2);
var C223_MSAVI_imgcoll = calculateIndexCollection(C223_imgcoll, MSAVI_exp, bands);

// merge image collections into multi-band images
var C223_MSAVI_old = C223_MSAVI_imgcoll_old.toBands();
var C223_MSAVI = C223_MSAVI_imgcoll.toBands();

// define function to change band names to dates
function renameBandsByDate(image) {
  var bandNames = image.bandNames();
  var newBandNames = bandNames.map(function(name) {
    var parts = ee.String(name).split('_');
    return parts.get(0);
  });
  return image.rename(newBandNames);
}

// apply function to change band names to dates
var C223_MSAVI_old = renameBandsByDate(C223_MSAVI_old);
var C223_MSAVI = renameBandsByDate(C223_MSAVI)

// combine MSAVI image stacks for full time series
var C223_MSAVI = ee.Image.cat(C223_MSAVI_old, C223_MSAVI)

// print number of image dates in time series
var numBands = C223_MSAVI.bandNames().size();
print('Number of Image Dates in Time Series:', numBands);

// sample values from image collection inside tx polygon geometry
var C223_TxPoly_MSAVI = C223_MSAVI.sample({region: C223_TxPoly, scale:3, geometries:true})

/*
// export table as CSV to Drive
Export.table.toDrive({
  collection: C223_TxPoly_MSAVI,
  description: 'C223_MSAVI_TimeSeries',
  fileFormat: 'CSV',
  folder:'GEE Exports'
})
*/

          // VISUALIZATION

// viz parameters
  // polygons
var outlineStyle = {color: 'red', width: 1, fillColor: '00000000'};
var C223_TxPoly_bound_fc = C223_TxPoly_bound_fc.style(outlineStyle);

  // map layers
var visparam_timeseries = {"opacity":0.75,"bands":["20190424"],"min":-0.5,"max":0.8,"palette":["f70000","f9ff00","0ac800"]};

// adding to map
Map.addLayer(C223_MSAVI, visparam_timeseries, 'MSAVI Time Series')
Map.addLayer(C223_TxPoly_bound_fc, {}, 'Tx Polygon')

// map parameters
Map.setOptions('SATELLITE')
Map.centerObject(C223_MSAVI, 17)
