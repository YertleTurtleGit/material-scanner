"use strict";

document.getElementById("image-names").innerHTML =
   "{object name}_{azimuthal angle}_{polar_angle}.ext" +
   "<br />" +
   "e.g. testObject_000_000.png" +
   "<br />" +
   "<br />" +
   "A single dropped image is handled as normal mapping.";

const dataset = new Dataset(LIGHTING_AZIMUTHAL_ANGLES, allImagesLoaded);
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
   uiLog("Calculating normal map.");
   uiBaseLayer++;
   calculateNormalMap();
}

function calculateNormalMap() {
   if (dataset.isOnlyNormalMap()) {
      document.getElementById("vertex-color-albedo").remove();
      const normalMap: NormalMap = NormalMap.getFromJsImageObject(
         dataset.getNormalMapImage()
      );
      colorPixelArray = normalMap.getAsPixelArray();
      calculatePointCloud(normalMap);
   } else {
      const normalMap = new NormalMap(dataset);
      normalMap.calculate(calculatePointCloud.bind(null, normalMap));
   }
}

function calculatePointCloud(normalMap: NormalMap) {
   NORMAL_MAP_AREA.appendChild(normalMap.getAsJsImageObject());
   uiBaseLayer--;
   uiLog("Calculating point cloud.");
   uiBaseLayer++;
   var depthFactor = DEPTH_FACTOR;
   if (IS_WEBCAM) {
      depthFactor = WEBCAM_DEPTH_FACTOR;
   }

   const pointCloud = new PointCloud(
      normalMap,
      WIDTH,
      HEIGHT,
      depthFactor,
      POINT_CLOUD_MAX_VERTEX_RESOLUTION
   );

   pointCloud.getAsObjString(getColorPixelArray());
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
      POINT_CLOUD_CANVAS_AREA
   );

   VERTEX_COLOR_SELECT.addEventListener(
      "change",
      vertexColorSelectChanged.bind(null, pointCloudRenderer)
   );

   console.log("Finished.");
}

function vertexColorSelectChanged(pointCloudRenderer: PointCloudRenderer) {
   var vertexColorSelect = <HTMLSelectElement>VERTEX_COLOR_SELECT;
   var vertexColorSelectValue = vertexColorSelect.value;
   var vertexColor: VERTEX_COLOR = vertexColorSelectValue as VERTEX_COLOR;
   pointCloudRenderer.updateVertexColor(vertexColor);
}

function downloadNormalMap(normalMap: NormalMap) {
   normalMap.downloadAsImage(
      dataset.getObjectName() + "_" + NORMAL_MAP_FILE_SUFFIX
   );
}

function downloadPointCloud(pointCloud: PointCloud) {
   pointCloud.downloadObj(
      dataset.getObjectName() + "_" + POINT_CLOUD_FILE_SUFFIX,
      getColorPixelArray()
   );
}

var colorPixelArray: Uint8Array = null;
function getColorPixelArray() {
   if (colorPixelArray === null) {
      uiLog("Calculating albedo.");
      uiBaseLayer++;

      var albedoShader = new Shader();
      albedoShader.bind();

      var images: GlslVector4[] = [];
      for (var i = 0; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
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
