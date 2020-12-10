"use strict";

class PointCloud {
   private normalMap: NormalMap;
   private depthFactor: number;

   private width: number;
   private height: number;
   private zValues: number[];
   private meshFaces: [number, number, number][] = [];
   private objString: string;

   private errorValues: number[];
   private maxError: number = 0;

   private samplingRate: number;

   private gpuVertices: number[];
   private gpuVertexAlbedoColors: number[];
   private gpuVertexNormalColors: number[] = [];
   private gpuVertexErrorColors: number[] = [];

   constructor(
      normalMap: NormalMap,
      width: number,
      height: number,
      depthFactor: number,
      samplingRate: number
   ) {
      this.normalMap = normalMap;
      this.depthFactor = depthFactor;
      this.width = width;
      this.height = height;
      this.zValues = null;
      this.objString = null;
      this.samplingRate = samplingRate;
   }

   downloadObj(filename: string, vertexColorArray: Uint8Array) {
      filename += ".obj";

      var element = document.createElement("a");
      element.style.display = "none";

      var blob = new Blob([this.getAsObjString(vertexColorArray)], {
         type: "text/plain; charset = utf-8",
      });

      var url = window.URL.createObjectURL(blob);
      element.setAttribute("href", window.URL.createObjectURL(blob));
      element.setAttribute("download", filename);

      document.body.appendChild(element);

      element.click();

      window.URL.revokeObjectURL(url);
      element.remove();
   }

   getAsObjString(vertexColorArray: Uint8Array) {
      if (this.objString == null) {
         this.gpuVertices = [];
         this.gpuVertexAlbedoColors = [];
         this.getZValues();

         uiBaseLayer--;
         uiLog("Writing point cloud file string.");
         uiBaseLayer--;
         var objString = "";
         var objFacesString = "";
         const SAMPLING_RATE_STEP = Math.round(100 / this.samplingRate);

         for (var x = 0; x < this.width; x += SAMPLING_RATE_STEP) {
            for (var y = 0; y < this.height; y += SAMPLING_RATE_STEP) {
               const index = x + y * this.width;
               if (!(this.getZValues()[index] == null)) {
                  const colorIndex = index * 4;
                  const z = this.getZValues()[index];

                  var r: number, g: number, b: number;

                  const currentErrorColor: number =
                     this.errorValues[index] / this.maxError;
                  this.gpuVertexErrorColors.push(
                     currentErrorColor,
                     1 - currentErrorColor,
                     0
                  );

                  r = vertexColorArray[colorIndex];
                  g = vertexColorArray[colorIndex + 1];
                  b = vertexColorArray[colorIndex + 2];

                  const rNormal = this.normalMap.getAsPixelArray()[colorIndex];
                  const gNormal = this.normalMap.getAsPixelArray()[
                     colorIndex + 1
                  ];
                  const bNormal = this.normalMap.getAsPixelArray()[
                     colorIndex + 2
                  ];

                  objString +=
                     "v " +
                     x +
                     " " +
                     y +
                     " " +
                     z +
                     " " +
                     r +
                     " " +
                     g +
                     " " +
                     b +
                     "\n";

                  this.gpuVertices.push(
                     x / this.width - 0.5,
                     y / this.width - 0.5,
                     z / this.width - 0.5
                  );

                  this.gpuVertexAlbedoColors.push(r / 255, g / 255, b / 255);
                  this.gpuVertexNormalColors.push(
                     rNormal / 255,
                     gNormal / 255,
                     bNormal / 255
                  );
               }
            }
         }

         if (POINT_CLOUD_TO_MESH) {
            throw new Error("POINT_CLOUD_TO_MESH: Method not implemented.");

            for (var x = 0; x < this.width; x++) {
               for (var y = 0; y < this.height; y++) {
                  const i = (x + y * this.width) * 2;

                  if (this.meshFaces[i] !== undefined) {
                     objFacesString +=
                        "f " + this.meshFaces[i].join(" ") + "\n";
                     /*objFacesString +=
                        "f " + this.meshFaces[i + 1].join(" ") + "\n";*/
                  }
               }
            }
         }

         this.objString = objString + objFacesString;
      }
      return this.objString;
   }

   getZValues() {
      if (this.zValues == null) {
         this.calculate();
      }
      return this.zValues;
   }

   calculate() {
      uiBaseLayer--;
      uiLog("Integrating normal map.");
      uiBaseLayer++;
      uiLog("Applying local gradient factor.");
      uiBaseLayer++;

      var pointCloudShader = new Shader();
      pointCloudShader.bind();

      const glslNormalMap = GlslImage.load(this.normalMap.getAsJsImageObject());

      const red = glslNormalMap.channel(GLSL_CHANNEL.RED);
      const green = glslNormalMap.channel(GLSL_CHANNEL.GREEN);
      const blue = glslNormalMap.channel(GLSL_CHANNEL.BLUE);

      const result = new GlslVector3([
         red.divideFloat(blue),
         green.divideFloat(blue),
         blue,
      ]);

      const gradientPixelArray = GlslRendering.render(
         result.getVector4()
      ).getPixelArray();

      pointCloudShader.purge();

      uiBaseLayer--;
      uiLog("Calculating anisotropic integrals.");

      this.zValues = Array(this.width * this.height).fill(0);

      var measureDenominator: number = 7;

      var leftZValues = Array(Math.round(this.width / measureDenominator)).fill(
         0
      );
      var rightZValues = Array(
         Math.round(this.width / measureDenominator)
      ).fill(0);
      var topZValues = Array(Math.round(this.width / measureDenominator)).fill(
         0
      );
      var bottomZValues = Array(
         Math.round(this.width / measureDenominator)
      ).fill(0);

      this.errorValues = Array(this.width * this.height).fill(0);
      var xZValues = Array(this.width * this.height).fill(0);
      var yZValues = Array(this.width * this.height).fill(0);

      const Z_FACTOR = -this.depthFactor / 4;
      const GRADIENT_SHIFT = -(255 / 2);

      var zLineOffset: number;
      var zLineOffsetI: number;

      for (var y = 0; y < this.height; y++) {
         zLineOffset = 0;
         zLineOffsetI = 0;
         for (var x = 0; x < this.width; x++) {
            const index = x + y * this.width;
            const baseColorIndex = index * 4;
            const colorIndex = baseColorIndex + GLSL_CHANNEL.RED;
            const maskIndex = baseColorIndex + GLSL_CHANNEL.BLUE;

            var maskPassed: boolean;
            if (IS_WEBCAM) {
               maskPassed =
                  gradientPixelArray[maskIndex] >
                  255 * (WEBCAM_MASK_PERCENT / 100);
            } else {
               maskPassed =
                  (colorPixelArray[colorIndex] +
                     colorPixelArray[colorIndex + 1] +
                     colorPixelArray[colorIndex + 2]) /
                     3 >
                  255 * (MASK_PERCENT / 100);
            }

            if (maskPassed && this.zValues[index] !== null) {
               const gradient = gradientPixelArray[colorIndex] + GRADIENT_SHIFT;
               zLineOffset += gradient * Z_FACTOR;

               if (xZValues[index] !== 0) {
                  const currentError: number = Math.abs(
                     xZValues[index] - zLineOffset
                  );
                  const combinedCurrentError =
                     currentError + this.errorValues[index];
                  this.errorValues[index] = combinedCurrentError;
                  this.maxError = Math.max(this.maxError, combinedCurrentError);
               } else {
                  xZValues[index] = zLineOffset;
               }

               if (
                  y === Math.round(this.height / 2) &&
                  x / measureDenominator === Math.round(x / measureDenominator)
               ) {
                  leftZValues[x / measureDenominator] = zLineOffset;
               }
               this.zValues[index] += zLineOffset;
            } else {
               this.zValues[index] = null;
               zLineOffset = 0;
            }

            const xi = this.width - x - 1;
            const indexI = xi + y * this.width;
            const baseColorIndexI = indexI * 4;

            if (this.zValues[indexI] !== null) {
               const colorIndexI = baseColorIndexI + GLSL_CHANNEL.RED;
               const gradientI =
                  gradientPixelArray[colorIndexI] + GRADIENT_SHIFT;
               zLineOffsetI += gradientI * -Z_FACTOR;

               if (xZValues[indexI] !== 0) {
                  const currentError: number = Math.abs(
                     xZValues[indexI] - zLineOffsetI
                  );
                  const combinedCurrentError =
                     currentError + this.errorValues[indexI];
                  this.errorValues[indexI] = combinedCurrentError;
                  this.maxError = Math.max(this.maxError, combinedCurrentError);
               } else {
                  xZValues[indexI] = zLineOffsetI;
               }

               if (
                  y === Math.round(this.height / 2) &&
                  xi / measureDenominator ===
                     Math.round(xi / measureDenominator)
               ) {
                  rightZValues[xi / measureDenominator] = zLineOffset;
               }
               this.zValues[indexI] += zLineOffsetI;
            } else {
               this.zValues[indexI] = null;
               zLineOffsetI = 0;
            }
         }
      }
      xZValues = undefined;

      for (var x = 0; x < this.width; x++) {
         zLineOffset = 0;
         zLineOffsetI = 0;
         for (var y = 0; y < this.height; y++) {
            const index = x + y * this.width;

            const baseColorIndex = index * 4;
            const colorIndex = baseColorIndex + GLSL_CHANNEL.GREEN;
            const maskIndex = baseColorIndex + GLSL_CHANNEL.BLUE;

            var maskPassed: boolean;
            if (IS_WEBCAM) {
               maskPassed =
                  gradientPixelArray[maskIndex] >
                  255 * (WEBCAM_MASK_PERCENT / 100);
            } else {
               maskPassed =
                  (colorPixelArray[colorIndex] +
                     colorPixelArray[colorIndex + 1] +
                     colorPixelArray[colorIndex + 2]) /
                     3 >
                  255 * (MASK_PERCENT / 100);
            }

            if (maskPassed && this.zValues[index] !== null) {
               const gradient = gradientPixelArray[colorIndex] + GRADIENT_SHIFT;
               zLineOffset += gradient * Z_FACTOR;

               if (yZValues[index] !== 0) {
                  const currentError: number = Math.abs(
                     yZValues[index] - zLineOffset
                  );
                  const combinedCurrentError =
                     currentError + this.errorValues[index];
                  this.errorValues[index] = combinedCurrentError;
                  this.maxError = Math.max(this.maxError, combinedCurrentError);
               } else {
                  yZValues[index] = zLineOffset;
               }

               if (
                  y === Math.round(this.height / 2) &&
                  x / measureDenominator === Math.round(x / measureDenominator)
               ) {
                  topZValues[x / measureDenominator] = zLineOffset;
               }
               this.zValues[index] += zLineOffset;
            } else {
               this.zValues[index] = null;
               zLineOffset = 0;
            }

            const yi = this.height - y - 1;
            const indexI = x + yi * this.width;
            const baseColorIndexI = indexI * 4;

            if (this.zValues[indexI] !== null) {
               const colorIndexI = baseColorIndexI + GLSL_CHANNEL.GREEN;
               const gradientI =
                  gradientPixelArray[colorIndexI] + GRADIENT_SHIFT;
               zLineOffsetI += gradientI * -Z_FACTOR;

               if (yZValues[indexI] !== 0) {
                  const currentError: number = Math.abs(
                     yZValues[indexI] - zLineOffsetI
                  );
                  const combinedCurrentError =
                     currentError + this.errorValues[indexI];
                  this.errorValues[indexI] = combinedCurrentError;
                  this.maxError = Math.max(this.maxError, combinedCurrentError);
               } else {
                  yZValues[indexI] = zLineOffsetI;
               }

               if (
                  yi === Math.round(this.height / 2) &&
                  x / measureDenominator === Math.round(x / measureDenominator)
               ) {
                  bottomZValues[x / measureDenominator] = zLineOffsetI;
               }
               this.zValues[indexI] += zLineOffsetI;
            } else {
               this.zValues[indexI] = null;
               zLineOffsetI = 0;
            }
         }
      }

      if (POINT_CLOUD_TO_MESH) {
         for (var x = 1; x < 10; x++) {
            for (var y = 1; y < 10; y++) {
               const i: number = x + y * this.width;

               const thisVertex: number = i;
               const rightVertex: number = i + 1;
               const bottomVertex: number = i + this.width;
               const topRightVertex: number = i - this.width + 1;

               const firstFace: [number, number, number] = [
                  thisVertex,
                  rightVertex,
                  bottomVertex,
               ];
               const secondFace: [number, number, number] = [
                  thisVertex,
                  topRightVertex,
                  rightVertex,
               ];

               this.meshFaces.push(firstFace, secondFace);
            }
         }
      }
   }

   getNextPixelAndVector(
      currentPixel: any,
      currentVector: any,
      gradient: any[]
   ) {
      var nextPixel = currentPixel;
      var nextVector = currentVector;
      while (nextPixel == currentPixel) {
         nextVector[0] += gradient[0];
         nextVector[1] += gradient[1];
         nextPixel = [Math.round(nextVector[0]), Math.round(nextVector[1])];
      }
      return [nextPixel, nextVector];
   }

   isPixelIsInDimensions(pixel: number[]) {
      if (isNaN(pixel[0]) || isNaN(pixel[0])) {
         return false;
      }
      if (pixel[0] == null || pixel[1] == null) {
         return false;
      }
      if (
         pixel[0] < 0 ||
         pixel[1] < 0 ||
         pixel[0] > this.width - 1 ||
         pixel[1] > this.height - 1
      ) {
         return false;
      }
      return true;
   }

   public getGpuVertices(): number[] {
      return this.gpuVertices;
   }

   public getGpuVertexAlbedoColors(): number[] {
      return this.gpuVertexAlbedoColors;
   }

   public getGpuVertexNormalColors(): number[] {
      return this.gpuVertexNormalColors;
   }

   public getGpuVertexErrorColors(): number[] {
      return this.gpuVertexErrorColors;
   }
}

class PointCloudRenderer {
   private pointCloud: PointCloud;
   private vertexCount: number;

   private rotationSpeed: number = 0.001;
   private rotation: number = 0;
   private deltaTime: number = 0;
   private then: number = 0;

   private div: HTMLElement;

   private gl: WebGL2RenderingContext;
   private canvas: HTMLCanvasElement;
   private rotationUniform: WebGLUniformLocation;
   private vertexColorBuffer: WebGLBuffer;

   constructor(pointCloud: PointCloud, previewDiv: HTMLElement) {
      this.pointCloud = pointCloud;
      this.div = previewDiv;
      this.vertexCount = this.pointCloud.getGpuVertices().length / 3;
      this.initializeContext();
   }

   public updateVertexColor(newColor: VERTEX_COLOR): void {
      var colors: number[];

      switch (newColor) {
         case VERTEX_COLOR.ALBEDO: {
            colors = this.pointCloud.getGpuVertexAlbedoColors();
            console.log("updating vertex color to albedo...");
            break;
         }
         case VERTEX_COLOR.NORMAL_MAPPING: {
            colors = this.pointCloud.getGpuVertexNormalColors();
            console.log("updating vertex color to normal mapping...");
            break;
         }
         case VERTEX_COLOR.ERROR_PRONENESS: {
            colors = this.pointCloud.getGpuVertexErrorColors();
            console.log("updating vertex color to error proneness...");
            break;
         }
      }

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
      this.gl.bufferData(
         this.gl.ARRAY_BUFFER,
         new Float32Array(colors),
         this.gl.STATIC_DRAW
      );
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
   }

   private initializeContext(): void {
      this.canvas = document.createElement("canvas");
      this.canvas.style.transition = "all 1s";
      this.div.appendChild(this.canvas);
      this.gl = this.canvas.getContext("webgl2");

      document.body.addEventListener(
         "resize",
         this.refreshViewportSize.bind(this)
      );

      var vertices = this.pointCloud.getGpuVertices();
      var colors = this.pointCloud.getGpuVertexAlbedoColors();

      var vertex_buffer = this.gl.createBuffer();

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertex_buffer);

      this.gl.bufferData(
         this.gl.ARRAY_BUFFER,
         new Float32Array(vertices),
         this.gl.STATIC_DRAW
      );

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

      this.vertexColorBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
      this.gl.bufferData(
         this.gl.ARRAY_BUFFER,
         new Float32Array(colors),
         this.gl.STATIC_DRAW
      );
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

      var xRot = -90;
      if (IS_WEBCAM) {
         xRot = -45;
      }
      xRot *= Math.PI / 180;

      var vertCode = [
         "#version 300 es",
         "",
         "in vec3 coordinates;",
         "in vec3 v_color;",
         "uniform float rot;",
         "out vec3 f_color;",
         "",
         "void main() {",
         " f_color = v_color;",
         "",
         " float sinRotY = sin(rot);",
         " float cosRotY = cos(rot);",
         " ",
         " float sinRotX = " +
            GlslFloat.getJsNumberAsString(Math.sin(xRot)) +
            ";",
         " float cosRotX = " +
            GlslFloat.getJsNumberAsString(Math.cos(xRot)) +
            ";",
         " ",
         " mat3 yRot;",
         " yRot[0] = vec3(cosRotY, 0.0, sinRotY);",
         " yRot[1] = vec3(0.0, 1.0, 0.0);",
         " yRot[2] = vec3(-sinRotY, 0.0, cosRotY);",
         " ",
         " mat3 xRot;",
         " xRot[0] = vec3(1.0, 0.0, 0.0);",
         " xRot[1] = vec3(0.0, cosRotX, -sinRotX);",
         " xRot[2] = vec3(0.0, sinRotX, cosRotX);",
         " vec3 pos = coordinates * xRot * yRot;",
         " gl_Position = vec4(pos.x *2.0, (pos.y + 0.5) *2.0, pos.z *2.0, 1.0);",
         " gl_PointSize = 1.0;",
         "}",
      ].join("\n");

      var vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);

      this.gl.shaderSource(vertShader, vertCode);
      this.gl.compileShader(vertShader);

      var fragCode = [
         "#version 300 es",
         "precision " + GPU_GL_FLOAT_PRECISION.MEDIUM + " float;",
         "",
         "in vec3 f_color;",
         "out vec4 fragColor;",
         "",
         "void main() {",
         " fragColor = vec4(f_color, 1.0);",
         "}",
      ].join("\n");

      var fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
      this.gl.shaderSource(fragShader, fragCode);
      this.gl.compileShader(fragShader);

      var shaderProgram = this.gl.createProgram();
      this.gl.attachShader(shaderProgram, vertShader);
      this.gl.attachShader(shaderProgram, fragShader);
      this.gl.linkProgram(shaderProgram);
      this.gl.useProgram(shaderProgram);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertex_buffer);

      var coordinates = this.gl.getAttribLocation(shaderProgram, "coordinates");
      this.gl.vertexAttribPointer(coordinates, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(coordinates);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
      var color = this.gl.getAttribLocation(shaderProgram, "v_color");
      this.gl.vertexAttribPointer(color, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(color);

      this.rotationUniform = this.gl.getUniformLocation(shaderProgram, "rot");

      this.gl.clearColor(0, 0, 0, 0);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.refreshViewportSize();

      window.addEventListener("resize", this.refreshViewportSize.bind(this));

      this.render(0);
   }

   private refreshViewportSize(): void {
      if (this.canvas.width > this.canvas.height) {
         this.canvas.width = this.div.clientHeight;
         this.canvas.height = this.div.clientHeight;
      } else {
         this.canvas.width = this.div.clientWidth;
         this.canvas.height = this.div.clientWidth;
      }

      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
   }

   private render(now: number): void {
      now *= 1.001;
      this.deltaTime = now - this.then;
      this.then = now;

      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      this.rotation += this.deltaTime * this.rotationSpeed;

      this.gl.uniform1f(this.rotationUniform, this.rotation);

      this.gl.drawArrays(this.gl.POINTS, 0, this.vertexCount);
      window.requestAnimationFrame(this.render.bind(this));
   }
}
