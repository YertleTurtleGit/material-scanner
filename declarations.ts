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
const DEPTH_FACTOR = 0.0125;

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

/*
The float precision used on the gpu. Set to medium when facing errors.
*/
const enum GPU_GL_FLOAT_PRECISION {
   MEDIUM = "medium" + "p",
   HIGH = "high" + "p",
}
const FLOAT_PRECISION = GPU_GL_FLOAT_PRECISION.HIGH;

const LUMINANCE_CHANNEL_QUANTIFIER: [number, number, number] = [
   1 / 3,
   1 / 3,
   1 / 3,
];

enum SYMBOL {
   ADD = " + ",
   SUBTRACT = " - ",
   MULTIPLY = " * ",
   DIVIDE = " / ",
}

enum METHOD {
   MAXIMUM = "max",
   MINIMUM = "min",
   INVERSE = "inverse",
   NORMALIZE = "normalize",
   LENGTH = "length",
   SINE = "sin",
   COSINE = "cos",
   RADIANS = "radians",
}

enum CUSTOM {
   LUMINANCE = "luminance",
   CHANNEL = "channel",
   VEC3_TO_VEC4 = "vec3_to_vec4",
}

interface GLSL_OPERATOR {
   readonly NAME: string;
   readonly TYPE: typeof SYMBOL | typeof METHOD | typeof CUSTOM;
}

class GLSL_OPERATORS {
   public static readonly ADD: GLSL_OPERATOR = {
      NAME: SYMBOL.ADD,
      TYPE: SYMBOL,
   };
   public static readonly SUBTRACT: GLSL_OPERATOR = {
      NAME: SYMBOL.SUBTRACT,
      TYPE: SYMBOL,
   };
   public static readonly MULTIPLY: GLSL_OPERATOR = {
      NAME: SYMBOL.MULTIPLY,
      TYPE: SYMBOL,
   };
   public static readonly DIVIDE: GLSL_OPERATOR = {
      NAME: SYMBOL.DIVIDE,
      TYPE: SYMBOL,
   };

   public static readonly MAXIMUM: GLSL_OPERATOR = {
      NAME: METHOD.MAXIMUM,
      TYPE: METHOD,
   };
   public static readonly MINIMUM: GLSL_OPERATOR = {
      NAME: METHOD.MINIMUM,
      TYPE: METHOD,
   };
   public static readonly INVERSE: GLSL_OPERATOR = {
      NAME: METHOD.INVERSE,
      TYPE: METHOD,
   };
   public static readonly NORMALIZE: GLSL_OPERATOR = {
      NAME: METHOD.NORMALIZE,
      TYPE: METHOD,
   };
   public static readonly LENGTH: GLSL_OPERATOR = {
      NAME: METHOD.LENGTH,
      TYPE: METHOD,
   };
   public static readonly SINE: GLSL_OPERATOR = {
      NAME: METHOD.SINE,
      TYPE: METHOD,
   };
   public static readonly COSINE: GLSL_OPERATOR = {
      NAME: METHOD.COSINE,
      TYPE: METHOD,
   };
   public static readonly RADIANS: GLSL_OPERATOR = {
      NAME: METHOD.RADIANS,
      TYPE: METHOD,
   };
   public static readonly LUMINANCE: GLSL_OPERATOR = {
      NAME: CUSTOM.LUMINANCE,
      TYPE: CUSTOM,
   };

   public static readonly CHANNEL: GLSL_OPERATOR = {
      NAME: CUSTOM.CHANNEL,
      TYPE: CUSTOM,
   };
   public static readonly VEC3_TO_VEC4: GLSL_OPERATOR = {
      NAME: CUSTOM.VEC3_TO_VEC4,
      TYPE: CUSTOM,
   };

   private constructor() {}
}

const enum GLSL_VAR {
   UV = "uv",
   TEX = "tex",
   POS = "pos",
   OUT = "fragColor",
}

const enum GLSL_TYPE {
   FLOAT = "float",
   VEC3 = "vec3",
   VEC4 = "vec4",
   MAT3 = "mat3",
   INT = "int",
}

const enum GLSL_CHANNEL {
   X = 0,
   Y = 1,
   Z = 2,
   W = 3,
   RED = 0,
   GREEN = 1,
   BLUE = 2,
   ALPHA = 3,
   C0 = 0,
   C1 = 1,
   C2 = 2,
   C3 = 3,
}

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
var WIDTH: number;
var HEIGHT: number;

// TODO: Good logging.
const LOG_ELEMENT = document.getElementById("current-task-info");
LOG_ELEMENT.style.display = "none";

var uiBaseLayer: number = 0;
function uiLog(message: string, layer: number = uiBaseLayer) {
   for (var i = 0; i < layer; i++) {
      message = "- " + message;
   }
   console.log(message);
}
