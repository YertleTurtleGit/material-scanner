"use strict";
document.getElementById("image-names").innerHTML =
    "{object name}_{azimuthal angle}_{polar_angle}.ext" +
        "<br />" +
        "e.g. testObject_000_000.png";
const dataset = new Dataset(LIGHTING_AZIMUTHAL_ANGLES, allImagesLoaded);
dataset.listenForDrop(INPUT_DROP_AREA);
//dataset.listenForWebcamButtonClick(CAPTURE_BUTTON, WEBCAM_RESOLUTION);
function allImagesLoaded() {
    INPUT_DROP_AREA.remove();
    WIDTH = dataset.getImageDimensions()[0];
    HEIGHT = dataset.getImageDimensions()[1];
    startCalculation();
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
    const pointCloud = new PointCloud(normalMap, [WIDTH, HEIGHT], DEPTH_FACTOR, getColorPixelArray());
    pointCloud.getAsObjString();
    NORMAL_MAP_BUTTON.addEventListener("click", downloadNormalMap.bind(null, normalMap));
    POINT_CLOUD_BUTTON.addEventListener("click", downloadPointCloud.bind(null, pointCloud));
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
    var maxImage = dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[0]);
    for (var i = 1; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
        maxImage = ic.max(maxImage, dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[i]));
    }
    ic.setResult(maxImage);
    const colorPixelArray = ic.getResultAsPixelArray();
    ic.purge();
    return colorPixelArray;
}
