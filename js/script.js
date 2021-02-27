"use strict";
document.getElementById("image-names").innerHTML =
    "{object name}_{azimuthal angle}_{polar_angle}.ext" +
        "<br />" +
        "e.g. testObject_000_000.png" +
        "<br />" +
        "<br />" +
        "A single dropped image is handled as normal mapping.";
const dataset = new Dataset(LIGHTING_AZIMUTHAL_ANGLES, TEST_POLAR_ANGLE, WEBCAM_POLAR_ANGLE, allImagesLoaded, LOADING_AREA, TEST_OBJECT_NAME, TEST_FILE_EXTENSION, INPUT_DROP_AREA, TEST_DATASET_FOLDER);
dataset.listenForDrop(INPUT_DROP_AREA);
dataset.listenForTestButtonClick(TEST_BUTTON);
dataset.listenForWebcamButtonClick(CAPTURE_BUTTON, WEBCAM_RESOLUTION);
function allImagesLoaded() {
    INPUT_DROP_AREA.remove();
    WIDTH = dataset.getImageDimensions()[0];
    HEIGHT = dataset.getImageDimensions()[1];
    setTimeout(startCalculation, 0);
}
function startCalculation() {
    LOG_ELEMENT.style.display = "block";
    uiLog("Calculating normal map.");
    uiBaseLayer++;
    calculateNormalMap();
}
function calculateNormalMap() {
    if (dataset.isOnlyNormalMap()) {
        document.getElementById("vertex-color-albedo").remove();
        const normalMap = NormalMap.getFromJsImageObject(dataset.getNormalMapImage());
        colorPixelArray = normalMap.getAsPixelArray();
        calculatePointCloud(normalMap);
    }
    else {
        const normalMap = new NormalMap(dataset, 1 /* PHOTOMETRIC_STEREO */);
        normalMap.calculate(calculatePointCloud.bind(null, normalMap));
    }
}
function calculatePointCloud(normalMap) {
    uiBaseLayer--;
    uiLog("Calculating point cloud.");
    uiBaseLayer++;
    let depthFactor = DEPTH_FACTOR;
    if (dataset.getType() === "webcam" /* WEBCAM */) {
        depthFactor = WEBCAM_DEPTH_FACTOR;
    }
    const angleDistance = 3;
    const angles = new Array(360 / angleDistance).fill(null);
    let angleOffset = 0;
    for (let i = 0; i < angles.length; i++) {
        angles[i] = angleOffset;
        angleOffset += angleDistance;
    }
    const pointCloud = new PointCloud(normalMap, WIDTH, HEIGHT, depthFactor, POINT_CLOUD_MAX_VERTEX_RESOLUTION, angles, getColorPixelArray());
    //pointCloud.getAsObjString(getColorPixelArray());
    NORMAL_MAP_BUTTON.addEventListener("click", downloadNormalMap.bind(null, normalMap));
    POINT_CLOUD_BUTTON.addEventListener("click", downloadPointCloud.bind(null, pointCloud));
    LOADING_AREA.style.display = "none";
    OUTPUT_AREA.style.display = "grid";
    const pointCloudRenderer = new PointCloudRenderer(pointCloud, POINT_CLOUD_CANVAS_AREA, dataset.getType() === "webcam" /* WEBCAM */);
    VERTEX_COLOR_SELECT.addEventListener("change", vertexColorSelectChanged.bind(null, pointCloudRenderer));
    const pointCloudChart = new PointCloudChart(pointCloud, CHART_AREA);
    NORMAL_MAP_AREA.appendChild(normalMap.getAsJsImageObject());
    setTimeout(pointCloudRenderer.startRendering.bind(pointCloudRenderer));
    setTimeout(pointCloudChart.load.bind(pointCloudChart));
    console.log("Finished.");
    LOG_ELEMENT.style.display = "none";
}
function vertexColorSelectChanged(pointCloudRenderer) {
    let vertexColorSelect = VERTEX_COLOR_SELECT;
    let vertexColorSelectValue = vertexColorSelect.value;
    let vertexColor = vertexColorSelectValue;
    pointCloudRenderer.updateVertexColor(vertexColor);
}
function downloadNormalMap(normalMap) {
    normalMap.downloadAsImage(dataset.getObjectName() + "_" + NORMAL_MAP_FILE_SUFFIX);
}
function downloadPointCloud(pointCloud) {
    pointCloud.downloadObj(dataset.getObjectName() + "_" + POINT_CLOUD_FILE_SUFFIX, getColorPixelArray());
}
let colorPixelArray = null;
function getColorPixelArray() {
    if (colorPixelArray === null) {
        uiLog("Calculating albedo.");
        uiBaseLayer++;
        let albedoShader = new Shader(WIDTH, HEIGHT);
        albedoShader.bind();
        let images = [];
        for (let i = 0; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
            images.push(GlslImage.load(dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[i])));
        }
        const maxImage = images[0].maximum(...images);
        colorPixelArray = GlslRendering.render(maxImage).getPixelArray();
        albedoShader.purge();
    }
    return colorPixelArray;
}
