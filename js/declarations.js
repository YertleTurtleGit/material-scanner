"use strict";
/*
Suffixes for file names.
*/
const NORMAL_MAP_FILE_SUFFIX = "normal-map";
const POINT_CLOUD_FILE_SUFFIX = "point-cloud";
/*
The depth factor describes a multiplicand of the z-coordinate
to fit the relation to x- and y-coordinates.
*/
const DEPTH_FACTOR = 0.01;
const WEBCAM_DEPTH_FACTOR = 0.025;
const POINT_CLOUD_MAX_VERTEX_RESOLUTION = 250000;
const POINT_CLOUD_TO_MESH = false;
const MASK_PERCENT = 10;
const WEBCAM_MASK_PERCENT = 10;
const WEBCAM_RESOLUTION = [800, 600];
const WEBCAM_POLAR_ANGLE = 45;
const TEST_POLAR_ANGLE = 36;
const TEST_OBJECT_NAME = "object1";
const TEST_DATASET_FOLDER = "test_dataset/" + TEST_OBJECT_NAME + "/";
const TEST_FILE_EXTENSION = "jpg";
/*
DOM element definitions.
*/
const INPUT_DROP_AREA = document.getElementById("input-drop-area");
const LOADING_AREA = (document.getElementById("loading-area"));
const OUTPUT_AREA = document.getElementById("output-area");
const NORMAL_MAP_AREA = document.getElementById("normal-map");
const NORMAL_MAP_BUTTON = document.getElementById("normal-map-button");
const POINT_CLOUD_AREA = document.getElementById("point-cloud");
const POINT_CLOUD_CANVAS_AREA = document.getElementById("point-cloud-canvas-area");
const CHART_AREA = document.getElementById("chart");
const POINT_CLOUD_BUTTON = document.getElementById("point-cloud-button");
const VERTEX_COLOR_SELECT = document.getElementById("vertex-color-select");
const CAPTURE_BUTTON = document.getElementById("capture-button");
const TEST_BUTTON = document.getElementById("test_dataset-button");
const C_LOG = document.getElementById("c-log");
/*
Width and height are set automatically by the input images.
All images should have the same resolution.
*/
let WIDTH;
let HEIGHT;
