"use strict";

document.getElementById("image-names").innerHTML =
   '"' + IMAGE_NAMES.join('_{OBJECT_NAME}", "') + '_{OBJECT_NAME}"';

const dataset = new Dataset(LIGHTING_DEGREES, INPUT_DROP_AREA, allImagesLoaded);

function allImagesLoaded() {
   WIDTH = dataset.getImage(NORTH).width;
   HEIGHT = dataset.getImage(NORTH).height;
   startCalculation();
}

var log = [];
function cLog(message) {
   console.log(message);
   log.push(message);
}

function startCalculation() {
   calculateNormalMap();
}

function calculateNormalMap() {
   const normalMap = new NormalMap(dataset);
   normalMap.calculate(calculatePointCloud.bind(null, normalMap));
}

function calculatePointCloud(normalMap) {
   NORMAL_MAP_AREA.appendChild(normalMap.getAsJsImageObject());
   const pointCloud = new PointCloud(
      normalMap,
      [WIDTH, HEIGHT],
      DEPTH_FACTOR,
      getColorPixelArray()
   );
   pointCloud.getAsObjString();
   NORMAL_MAP_BUTTON.addEventListener(
      "click",
      downloadNormalMap.bind(null, normalMap)
   );
   POINT_CLOUD_BUTTON.addEventListener(
      "click",
      downloadPointCloud.bind(null, pointCloud)
   );
   LOADING_AREA.style.display = "none";
   OUTPUT_AREA.style.display = "grid";
   console.log("finished.");
}

function downloadNormalMap(normalMap) {
   normalMap.downloadAsImage(dataset.getObjectName() + "_" + NORMAL_MAP_SUFFIX);
}

function downloadPointCloud(pointCloud) {
   pointCloud.downloadObj(dataset.getObjectName() + "_" + POINT_CLOUD_SUFFIX);
}

function getColorPixelArray() {
   var ic = new ImageCalc();
   var maxImage = dataset.getImage(LIGHTING_DEGREES[0]);
   for (var i = 1; i < LIGHTING_DEGREES.length; i++) {
      maxImage = ic.max(maxImage, dataset.getImage(LIGHTING_DEGREES[i]));
   }
   ic.setResult(maxImage);
   const colorPixelArray = ic.getResultAsPixelArray();
   ic.purge();
   return colorPixelArray;
}
