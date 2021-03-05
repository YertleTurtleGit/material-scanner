"use strict";

document.getElementById("image-names").innerHTML =
   "{object name}_{azimuthal angle}_{polar_angle}.ext" +
   "<br />" +
   "e.g. testObject_000_000.png" +
   "<br />" +
   "<br />" +
   "A single dropped image is handled as normal mapping.";

DOMStatusElement.setParentDiv(LOADING_AREA);

const dataset = new Dataset(
   LIGHTING_AZIMUTHAL_ANGLES,
   TEST_POLAR_ANGLE,
   WEBCAM_POLAR_ANGLE,
   allImagesLoaded,
   LOADING_AREA,
   TEST_OBJECT_NAME,
   TEST_FILE_EXTENSION,
   INPUT_DROP_AREA,
   TEST_DATASET_FOLDER
);
dataset.listenForDrop(INPUT_DROP_AREA);
dataset.listenForTestButtonClick(TEST_BUTTON);
//dataset.listenForWebcamButtonClick(CAPTURE_BUTTON, WEBCAM_RESOLUTION);

function allImagesLoaded() {
   INPUT_DROP_AREA.remove();
   LOADING_AREA.style.display = "inherit";
   WIDTH = dataset.getImageDimensions()[0];
   HEIGHT = dataset.getImageDimensions()[1];
   startCalculation();
}

async function startCalculation() {
   const normalMap: NormalMap = await calculateNormalMap();
   calculatePointCloud(normalMap);
}

async function calculateNormalMap() {
   let normalMap: NormalMap;
   if (dataset.isOnlyNormalMap()) {
      document.getElementById("vertex-color-albedo").remove();
      normalMap = NormalMap.getFromJsImageObject(dataset.getNormalMapImage());
      colorPixelArray = normalMap.getAsPixelArray();
   } else {
      normalMap = new NormalMap(
         dataset,
         NORMAL_CALCULATION_METHOD.PHOTOMETRIC_STEREO
      );
      await normalMap.calculate();
   }
   return normalMap;
}

async function calculatePointCloud(normalMap: NormalMap) {
   let depthFactor = DEPTH_FACTOR;
   if (dataset.getType() === DATATYPE.WEBCAM) {
      depthFactor = WEBCAM_DEPTH_FACTOR;
   }

   const angleDistance: number = 3;
   const angles: number[] = new Array(360 / angleDistance).fill(null);

   let angleOffset: number = 0;
   for (let i = 0; i < angles.length; i++) {
      angles[i] = angleOffset;
      angleOffset += angleDistance;
   }

   const pointCloud = new PointCloud(
      normalMap,
      WIDTH,
      HEIGHT,
      depthFactor,
      POINT_CLOUD_MAX_VERTEX_RESOLUTION,
      angles,
      getColorPixelArray()
   );

   await pointCloud.calculate();

   //pointCloud.getAsObjString(getColorPixelArray());
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

   const pointCloudRenderer = new PointCloudRenderer(
      pointCloud,
      POINT_CLOUD_CANVAS_AREA,
      dataset.getType() === DATATYPE.WEBCAM
   );

   VERTEX_COLOR_SELECT.addEventListener(
      "change",
      vertexColorSelectChanged.bind(null, pointCloudRenderer)
   );

   const pointCloudChart: PointCloudChart = new PointCloudChart(
      pointCloud,
      CHART_AREA
   );

   NORMAL_MAP_AREA.appendChild(normalMap.getAsJsImageObject());
   setTimeout(pointCloudRenderer.startRendering.bind(pointCloudRenderer));
   setTimeout(pointCloudChart.load.bind(pointCloudChart));
}

function vertexColorSelectChanged(pointCloudRenderer: PointCloudRenderer) {
   let vertexColorSelect = <HTMLSelectElement>VERTEX_COLOR_SELECT;
   let vertexColorSelectValue = vertexColorSelect.value;
   let vertexColor: VERTEX_COLOR = vertexColorSelectValue as VERTEX_COLOR;
   pointCloudRenderer.updateVertexColor(vertexColor);
}

function downloadNormalMap(normalMap: NormalMap) {
   normalMap.downloadAsImage(
      dataset.getObjectName() + "_" + NORMAL_MAP_FILE_SUFFIX,
      NORMAL_MAP_BUTTON
   );
}

function downloadPointCloud(pointCloud: PointCloud) {
   pointCloud.downloadObj(
      dataset.getObjectName() + "_" + POINT_CLOUD_FILE_SUFFIX,
      getColorPixelArray(),
      POINT_CLOUD_BUTTON
   );
}

let colorPixelArray: Uint8Array = null;
function getColorPixelArray() {
   if (colorPixelArray === null) {
      let albedoShader = new Shader(WIDTH, HEIGHT);
      albedoShader.bind();

      let images: GlslVector4[] = [];
      for (let i = 0; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
         images.push(
            GlslImage.load(dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[i]))
         );
      }

      const maxImage = images[0].maximum(...images);

      colorPixelArray = GlslRendering.render(maxImage).getPixelArray();

      albedoShader.purge();
   }
   return colorPixelArray;
}
