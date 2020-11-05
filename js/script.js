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
    setTimeout(startCalculation, 0);
}
function startCalculation() {
    uiLog("Calculating normal map.");
    uiBaseLayer++;
    calculateNormalMap();
}
function calculateNormalMap() {
    const normalMap = new NormalMap(dataset);
    normalMap.calculate(calculatePointCloud.bind(null, normalMap));
}
function calculatePointCloud(normalMap) {
    NORMAL_MAP_AREA.appendChild(normalMap.getAsJsImageObject());
    uiBaseLayer--;
    uiLog("Calculating point cloud.");
    uiBaseLayer++;
    const pointCloud = new PointCloud(normalMap, [WIDTH, HEIGHT], DEPTH_FACTOR, getColorPixelArray());
    pointCloud.getAsObjString();
    NORMAL_MAP_BUTTON.addEventListener("click", downloadNormalMap.bind(null, normalMap));
    POINT_CLOUD_BUTTON.addEventListener("click", downloadPointCloud.bind(null, pointCloud));
    LOADING_AREA.style.display = "none";
    OUTPUT_AREA.style.display = "grid";
    getColorPixelArray();
    pointCloud.renderPreviewTo(POINT_CLOUD_AREA);
    console.log("Finished.");
}
function downloadNormalMap(normalMap) {
    normalMap.downloadAsImage(dataset.getObjectName() + "_" + NORMAL_MAP_FILE_SUFFIX);
}
function downloadPointCloud(pointCloud) {
    pointCloud.downloadObj(dataset.getObjectName() + "_" + POINT_CLOUD_FILE_SUFFIX);
}
var colorPixelArray = null;
function getColorPixelArray() {
    if (colorPixelArray === null) {
        uiLog("Calculating albedo.");
        uiBaseLayer++;
        var albedoShader = new Shader();
        albedoShader.bind();
        var images = [];
        for (var i = 0; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
            images.push(GlslImage.load(dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[i])));
        }
        const maxImage = images[0].maximum(...images);
        colorPixelArray = GlslRendering.render(maxImage).getPixelArray();
        albedoShader.purge();
    }
    return colorPixelArray;
}
