"use strict";

const DEPTH_FACTOR = 0.005;

var WIDTH;
var HEIGHT;

/*
Spherical Coordinates
ISO 80000-2

The polar angle is denoted by θ (theta):
It is the angle between the z-axis and the radial vector connecting the origin to the point in question.

The azimuthal angle is denoted by φ (phi):
It is the angle between the x-axis and the projection of the radial vector onto the xy-plane.

In the following, the notation [θ, φ] is used in arrays.

https://www.geogebra.org/m/FzkZPN3K
https://en.wikipedia.org/wiki/Del_in_cylindrical_and_spherical_coordinates
*/
//INPUT:
const TOP = [0, 0]; // 0° in 2d
const BOTTOM = [180, 0]; // 180° in 2d
const TOP_RIGHT = [45, 90]; // 45° in 2d
const BOTTOM_LEFT = [135, 270]; // 225° in 2d
const LEFT = [90, 270]; // 270° in 2d
const RIGHT = [90, 90]; // 90° in 2d
const BOTTOM_RIGHT = [135, 90]; // 135° in 2d
const TOP_LEFT = [45, 270]; // 315° in 2d

const LIGHTING_DEGREES = [
   TOP,
   BOTTOM,
   TOP_RIGHT,
   BOTTOM_LEFT,
   LEFT,
   RIGHT,
   BOTTOM_RIGHT,
   TOP_LEFT,
];

const IMAGE_NAMES = [
   "north",
   "south",
   "northeast",
   "southwest",
   "west",
   "east",
   "southeast",
   "northwest",
];

//CALCULATED:
/*const FRONT = [90, 0];
const ALL = [Infinity, Infinity];
const NONE = [null, null];*/

const DEGREE_TO_RADIANS_FACTOR = Math.PI / 180;
const RADIANS_TO_DEGREE_FACTOR = 180 / Math.PI;

const INPUT_DROP_AREA = document.getElementById("input-drop-area");
const LOADING_AREA = document.getElementById("loading-area");
const OUTPUT_AREA = document.getElementById("output-area");
const NORMAL_MAP_AREA = document.getElementById("normal-map");
const POINT_CLOUD_BUTTON = document.getElementById("point-cloud-button");
const NORMAL_MAP_BUTTON = document.getElementById("normal-map-button");
const C_LOG = document.getElementById("c-log");

document.getElementById("image-names").innerHTML =
   '"' + IMAGE_NAMES.join('", "') + '"';

const dataset = new Dataset(LIGHTING_DEGREES, INPUT_DROP_AREA, allImagesLoaded);

function allImagesLoaded() {
   WIDTH = dataset.getImage(TOP).width;
   HEIGHT = dataset.getImage(TOP).height;
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
   normalMap.downloadAsImage();
}

function downloadPointCloud(pointCloud) {
   pointCloud.downloadObj("point-cloud");
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
