"use strict";
/*
Spherical Coordinates

The azimuthal angle is denoted by φ (phi).
The polar angle is denoted by θ (theta).

In the following, the notation [φ, θ] is used.

Visualization in mathematical notation:
https://www.geogebra.org/m/FzkZPN3K
*/
const EAST = 0;
const NORTH_EAST = 45;
const NORTH = 90;
const NORTH_WEST = 135;
const WEST = 180;
const SOUTH_WEST = 225;
const SOUTH = 270;
const SOUTH_EAST = 315;
/*
The lighting degrees array describes all spherical degrees.
*/
const LIGHTING_AZIMUTHAL_ANGLES = [
    EAST,
    NORTH_EAST,
    NORTH,
    NORTH_WEST,
    WEST,
    SOUTH_WEST,
    SOUTH,
    SOUTH_EAST,
];
/*
Suffixes for file names.
*/
const NORMAL_MAP_FILE_SUFFIX = "normal-map";
const POINT_CLOUD_FILE_SUFFIX = "point-cloud";
/*
The depth factor describes a multiplicand of the z-coordinate
to fit the relation to x- and y-coordinates.
*/
const DEPTH_FACTOR = 0.025;
/*
The point cloud sampling rate describes the amount of data used.
When set to 100, the point cloud vertex count equates to the image pixel count.
*/
const POINT_CLOUD_SAMPLING_RATE_PERCENT = 10;
/*
The resolution used when capturing data with a webcam.
*/
const WEBCAM_RESOLUTION = [800, 600];
const WEBCAM_POLAR_ANGLE = 45;
const GPU_PRECISION = "highp" /* HIGH */;
/*
The color channels array is used to represent the used color channels.
*/
const COLOR_CHANNELS = ["r", "g", "b", "a"];
/*
DOM element definitions.
*/
const INPUT_DROP_AREA = document.getElementById("input-drop-area");
const LOADING_AREA = document.getElementById("loading-area");
const OUTPUT_AREA = document.getElementById("output-area");
const NORMAL_MAP_AREA = document.getElementById("normal-map");
const NORMAL_MAP_BUTTON = document.getElementById("normal-map-button");
const POINT_CLOUD_AREA = document.getElementById("point-cloud");
const POINT_CLOUD_BUTTON = document.getElementById("point-cloud-button");
const CAPTURE_BUTTON = document.getElementById("capture-button");
const C_LOG = document.getElementById("c-log");
/*
Width and height are set automatically by the input images.
All images should have the same resolution.
*/
var WIDTH;
var HEIGHT;
// TODO: Good logging.
const LOG_ELEMENT = document.getElementById("current-task-info");
LOG_ELEMENT.style.display = "none";
var uiBaseLayer = 0;
function uiLog(message, layer = uiBaseLayer) {
    for (var i = 0; i < layer; i++) {
        message = "- " + message;
    }
    console.log(message);
}
