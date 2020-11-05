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
const TEST_POLAR_ANGLE = 36;
const TEST_OBJECT_NAME = "object1";
const TEST_DATASET_FOLDER = "test_dataset/" + TEST_OBJECT_NAME + "/";
const TEST_FILE_EXTENSION = "jpg";
const FLOAT_PRECISION = "highp" /* HIGH */;
const LUMINANCE_CHANNEL_QUANTIFIER = [
    1 / 3,
    1 / 3,
    1 / 3,
];
var SYMBOL;
(function (SYMBOL) {
    SYMBOL["ADD"] = " + ";
    SYMBOL["SUBTRACT"] = " - ";
    SYMBOL["MULTIPLY"] = " * ";
    SYMBOL["DIVIDE"] = " / ";
})(SYMBOL || (SYMBOL = {}));
var METHOD;
(function (METHOD) {
    METHOD["MAXIMUM"] = "max";
    METHOD["MINIMUM"] = "min";
    METHOD["INVERSE"] = "inverse";
    METHOD["NORMALIZE"] = "normalize";
    METHOD["LENGTH"] = "length";
    METHOD["SINE"] = "sin";
    METHOD["COSINE"] = "cos";
    METHOD["RADIANS"] = "radians";
})(METHOD || (METHOD = {}));
var CUSTOM;
(function (CUSTOM) {
    CUSTOM["LUMINANCE"] = "luminance";
    CUSTOM["CHANNEL"] = "channel";
    CUSTOM["VEC3_TO_VEC4"] = "vec3_to_vec4";
})(CUSTOM || (CUSTOM = {}));
class GLSL_OPERATORS {
    constructor() { }
}
GLSL_OPERATORS.ADD = {
    NAME: SYMBOL.ADD,
    TYPE: SYMBOL,
};
GLSL_OPERATORS.SUBTRACT = {
    NAME: SYMBOL.SUBTRACT,
    TYPE: SYMBOL,
};
GLSL_OPERATORS.MULTIPLY = {
    NAME: SYMBOL.MULTIPLY,
    TYPE: SYMBOL,
};
GLSL_OPERATORS.DIVIDE = {
    NAME: SYMBOL.DIVIDE,
    TYPE: SYMBOL,
};
GLSL_OPERATORS.MAXIMUM = {
    NAME: METHOD.MAXIMUM,
    TYPE: METHOD,
};
GLSL_OPERATORS.MINIMUM = {
    NAME: METHOD.MINIMUM,
    TYPE: METHOD,
};
GLSL_OPERATORS.INVERSE = {
    NAME: METHOD.INVERSE,
    TYPE: METHOD,
};
GLSL_OPERATORS.NORMALIZE = {
    NAME: METHOD.NORMALIZE,
    TYPE: METHOD,
};
GLSL_OPERATORS.LENGTH = {
    NAME: METHOD.LENGTH,
    TYPE: METHOD,
};
GLSL_OPERATORS.SINE = {
    NAME: METHOD.SINE,
    TYPE: METHOD,
};
GLSL_OPERATORS.COSINE = {
    NAME: METHOD.COSINE,
    TYPE: METHOD,
};
GLSL_OPERATORS.RADIANS = {
    NAME: METHOD.RADIANS,
    TYPE: METHOD,
};
GLSL_OPERATORS.LUMINANCE = {
    NAME: CUSTOM.LUMINANCE,
    TYPE: CUSTOM,
};
GLSL_OPERATORS.CHANNEL = {
    NAME: CUSTOM.CHANNEL,
    TYPE: CUSTOM,
};
GLSL_OPERATORS.VEC3_TO_VEC4 = {
    NAME: CUSTOM.VEC3_TO_VEC4,
    TYPE: CUSTOM,
};
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
const TEST_BUTTON = document.getElementById("test_dataset-button");
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
