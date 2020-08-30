"use strict";
/*
Spherical Coordinates
ISO 80000-2

The polar angle is denoted by θ (theta):
It is the angle between the z-axis and the radial vector
connecting the origin to the point in question.

The azimuthal angle is denoted by φ (phi):
It is the angle between the x-axis and the projection
of the radial vector onto the xy-plane.

In the following, the notation [θ, φ] is used in arrays.

Visualization in mathematical notation (switched θ and φ):
https://www.geogebra.org/m/FzkZPN3K

Source:
https://en.wikipedia.org/wiki/Del_in_cylindrical_and_spherical_coordinates
*/
/*
const EAST = [90, 90]; // 0° in 2d
const NORTH_EAST = [45, 90]; // 45° in 2d
const NORTH = [0, 0]; // 90° in 2d
const NORTH_WEST = [45, 270]; // 135° in 2d
const WEST = [90, 270]; // 180° in 2d
const SOUTH_WEST = [135, 270]; // 225° in 2d
const SOUTH = [180, 0]; // 270° in 2d
const SOUTH_EAST = [135, 90]; // 315° in 2d
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
They should be in the same order like the IMAGE_NAMES array.
*/
const LIGHTING_DEGREES = [
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
The image names array is used for the input file names.
They should be in the same order like the LIGHTING_DEGREES array.
*/
const IMAGE_NAMES = ["000", "045", "090", "135", "180", "225", "270", "315"];
/*
Suffixes for file names.
*/
const NORMAL_MAP_SUFFIX = "normal-map";
const POINT_CLOUD_SUFFIX = "point-cloud";
/*
The depth factor describes a multiplicand of the z-coordinate
to fit the relation to x- and y-coordinates.
*/
const DEPTH_FACTOR = 0.025;
/*
The point cloud quality describes the amount of used data.
When set to 100, the point cloud vertex count equals to image pixel count.
*/
//const POINT_CLOUD_SAMPLING_RATE_PERCENT = 10;
const POINT_CLOUD_SAMPLING_RATE_PERCENT = 100;
/*
The resolution used when capturing data with a webcam.
*/
const WEBCAM_RESOLUTION = [800, 600];
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
const POINT_CLOUD_BUTTON = document.getElementById("point-cloud-button");
const NORMAL_MAP_BUTTON = document.getElementById("normal-map-button");
const CAPTURE_BUTTON = document.getElementById("capture-button");
const C_LOG = document.getElementById("c-log");
/*
Width and height are set automatically by the input images.
All images should have the same resolution.
*/
var WIDTH;
var HEIGHT;
