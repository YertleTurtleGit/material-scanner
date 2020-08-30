"use strict";

class ImageCalc {
   private imageShaderConstructor: ImageShaderConstructor;

   constructor(onlyLuminance = false) {
      console.log("Generating shader source.");
      this.imageShaderConstructor = new ImageShaderConstructor(onlyLuminance);
   }

   public add(addend1, addend2) {
      return this.calculate(addend1, addend2, "+");
   }

   public substract(minuend, subtrahend) {
      return this.calculate(minuend, subtrahend, "-");
   }

   public multiply(multiplier, multiplicand) {
      return this.calculate(multiplier, multiplicand, "*");
   }

   public divide(dividend, divisor) {
      return this.calculate(dividend, divisor, "/");
   }

   public max(comparable1, comparable2) {
      return this.calculate(comparable1, comparable2, "max");
   }

   public min(comparable1, comparable2) {
      return this.calculate(comparable1, comparable2, "min");
   }

   public getChannel(image, channelChar) {
      return this.calculate(image, channelChar, ".");
   }

   sieve(image1, factor1, conditionOperator, image2, factor2) {
      return this.imageShaderConstructor.addSieve(
         image1,
         factor1,
         conditionOperator,
         image2,
         factor2
      );
   }

   private calculate(operant1, operant2, operator) {
      return this.imageShaderConstructor.addCalculation(
         operant1,
         operant2,
         operator
      );
   }

   public setResult(value) {
      this.imageShaderConstructor.setResult(value);
   }

   public setResultChannels(channels: Array<number | ShaderVariable>) {
      this.imageShaderConstructor.setChannelResult(channels[0], 0);
      this.imageShaderConstructor.setChannelResult(channels[1], 1);
      this.imageShaderConstructor.setChannelResult(channels[2], 2);
      this.imageShaderConstructor.setChannelResult(channels[3], 3);
   }

   public getResultAsJsImageObject(onloadCallback: TimerHandler) {
      return this.imageShaderConstructor.getResultJsImageObject(onloadCallback);
   }

   public getResultAsPixelArray() {
      return this.imageShaderConstructor.getResultPixelArray();
   }

   public getResultAsDataUrl() {
      return this.imageShaderConstructor.getResultAsDataUrl();
   }

   public purge() {
      this.imageShaderConstructor.purge();
   }
}

class ImageShaderConstructor {
   public static inputPosCoordinate = "inputPosCoordinate";
   public static inputTexCoordinate = "inputTexCoordinate";
   public static uvCoordinate = "uv";
   public static tmpFragColor = "tmpFragColor";
   public static fragmentColor = "fragColor";

   private floatPrecision: GPU_GL_FLOAT_PRECISION;
   private calculations: Array<ShaderCalculation>;
   private sieves: Array<ShaderSieve>;
   private shaderProgram: WebGLProgram;
   private result: Array<any>;
   private resultImage: HTMLImageElement;
   private onlyLuminance: boolean;
   private shaderRun: boolean;
   private resultDataUrl: string;
   private glCanvas: HTMLCanvasElement;
   private glContext;
   private resultPixelArray: Uint8Array;
   private shaderVariableCollection: ShaderVariableCollection;

   constructor(
      onlyLuminance = false,
      floatPrecision = GPU_GL_FLOAT_PRECISION.HIGH
   ) {
      this.floatPrecision = floatPrecision;
      this.calculations = [];
      this.sieves = [];
      this.shaderProgram = null;
      this.result = [null, null, null];

      this.resultImage = null;
      this.onlyLuminance = onlyLuminance;
      this.shaderRun = false;
      this.resultDataUrl = null;

      this.glCanvas = document.createElement("canvas");
      this.glCanvas.width = WIDTH;
      this.glCanvas.height = HEIGHT;
      //document.body.appendChild(glCanvas);
      this.glContext = this.glCanvas.getContext("webgl2");

      this.resultPixelArray = new Uint8Array(
         this.glCanvas.width * this.glCanvas.height * 4
      );
      this.shaderVariableCollection = new ShaderVariableCollection();
   }

   public purge() {
      this.glContext.getExtension("WEBGL_lose_context").loseContext();
   }

   public getResultJsImageObject(onloadCallback) {
      if (this.resultImage === null) {
         this.resultImage = new Image();
         this.resultImage.addEventListener("load", onloadCallback);
         this.resultImage.src = this.getResultAsDataUrl();
      }
      return this.resultImage;
   }

   public getResultPixelArray() {
      if (!this.shaderRun) {
         this.runShader();
      }
      return this.resultPixelArray;
   }

   public getResultAsDataUrl() {
      if (!this.shaderRun) {
         this.runShader();
      }
      if (this.resultDataUrl == null) {
         this.resultDataUrl = this.glCanvas.toDataURL();
      }
      return this.resultDataUrl;
   }

   private runShader() {
      this.loadShaderImagesIntoShader();

      var framePositionLocation = this.glContext.getAttribLocation(
         this.getShaderProgram(),
         ImageShaderConstructor.inputPosCoordinate
      );
      var frameTextureLocation = this.glContext.getAttribLocation(
         this.getShaderProgram(),
         ImageShaderConstructor.inputTexCoordinate
      );

      const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;

      const frameVertices = [-1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1];

      const frameTextCoords = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];

      var vaoFrame = this.glContext.createVertexArray();
      this.glContext.bindVertexArray(vaoFrame);

      var vboFrameV = this.glContext.createBuffer();
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameV);
      this.glContext.bufferData(
         this.glContext.ARRAY_BUFFER,
         new Float32Array(frameVertices),
         this.glContext.STATIC_DRAW
      );
      this.glContext.vertexAttribPointer(
         framePositionLocation,
         2,
         this.glContext.FLOAT,
         this.glContext.FALSE,
         2 * FLOAT_SIZE,
         0
      );
      this.glContext.enableVertexAttribArray(framePositionLocation);
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);

      var vboFrameT = this.glContext.createBuffer();
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameT);
      this.glContext.bufferData(
         this.glContext.ARRAY_BUFFER,
         new Float32Array(frameTextCoords),
         this.glContext.STATIC_DRAW
      );
      this.glContext.vertexAttribPointer(
         frameTextureLocation,
         2,
         this.glContext.FLOAT,
         this.glContext.FALSE,
         2 * FLOAT_SIZE,
         0
      );
      this.glContext.enableVertexAttribArray(frameTextureLocation);
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);

      this.glContext.bindVertexArray(null);

      this.glContext.useProgram(this.getShaderProgram());

      this.glContext.viewport(
         0,
         0,
         this.glContext.canvas.width,
         this.glContext.canvas.height
      );
      this.glContext.clearColor(0, 0, 0, 0);
      this.glContext.clear(
         this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT
      );

      this.glContext.blendFunc(this.glContext.SRC_ALPHA, this.glContext.ONE);
      this.glContext.enable(this.glContext.BLEND);
      this.glContext.disable(this.glContext.DEPTH_TEST);

      this.glContext.bindVertexArray(vaoFrame);
      this.glContext.drawArrays(this.glContext.TRIANGLES, 0, 6);
      this.glContext.bindVertexArray(null);

      this.glContext.readPixels(
         0,
         0,
         this.glCanvas.width,
         this.glCanvas.height,
         this.glContext.RGBA,
         this.glContext.UNSIGNED_BYTE,
         this.resultPixelArray
      );
      this.glContext.finish();
      this.shaderRun = true;
   }

   private getShaderProgram() {
      if (this.shaderProgram == null) {
         var vertexShader = this.glContext.createShader(
            this.glContext.VERTEX_SHADER
         );
         var fragmentShader = this.glContext.createShader(
            this.glContext.FRAGMENT_SHADER
         );

         this.glContext.shaderSource(
            vertexShader,
            this.getVertexShaderSource()
         );
         this.glContext.shaderSource(
            fragmentShader,
            this.getFragmentShaderSource()
         );

         console.log("Compiling shader program.");
         this.glContext.compileShader(vertexShader);
         this.glContext.compileShader(fragmentShader);

         console.log("Linking shader program.");
         var shaderProgram = this.glContext.createProgram();
         this.glContext.attachShader(shaderProgram, vertexShader);
         this.glContext.attachShader(shaderProgram, fragmentShader);
         this.glContext.linkProgram(shaderProgram);

         this.shaderProgram = shaderProgram;
      }
      return this.shaderProgram;
   }

   private loadShaderImagesIntoShader() {
      this.glContext.bindTexture(this.glContext.TEXTURE_2D, null);
      this.glContext.useProgram(this.getShaderProgram());
      this.glContext.clear(
         this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT
      );
      console.log("Loading images for gpu.");
      for (
         var i = 0;
         i < this.shaderVariableCollection.getShaderImages().length;
         i++
      ) {
         this.glContext.activeTexture(
            this.glContext.TEXTURE0 +
               this.shaderVariableCollection.getShaderImages()[i].getCount() +
               1
         );
         this.glContext.bindTexture(
            this.glContext.TEXTURE_2D,
            this.shaderVariableCollection.getShaderImages()[i].getTexture()
         );

         var uniformPointer = this.glContext.getUniformLocation(
            this.getShaderProgram(),
            this.shaderVariableCollection
               .getShaderImages()
               [i].getUniformVariable()
         );
         this.glContext.uniform1i(
            uniformPointer,
            this.shaderVariableCollection.getShaderImages()[i].getCount() + 1
         );
      }
   }

   public addCalculation(operant1, operant2, operator) {
      var calculation = new ShaderCalculation(
         operant1,
         operant2,
         operator,
         this.shaderVariableCollection,
         this.glContext
      );
      this.calculations.push(calculation);
      return calculation.getResult();
   }

   public addSieve(image1, factor1, conditionOperator, image2, factor2) {
      var sieve = new ShaderSieve(
         image1,
         factor1,
         conditionOperator,
         image2,
         factor2,
         this.shaderVariableCollection,
         this.glContext
      );
      this.sieves.push(sieve);
      return sieve.getResult();
   }

   private getVertexShaderSource() {
      return [
         "#version 300 es",
         "",
         "in vec3 " + ImageShaderConstructor.inputPosCoordinate + ";",
         "in vec2 " + ImageShaderConstructor.inputTexCoordinate + ";",
         "",
         "out vec2 " + ImageShaderConstructor.uvCoordinate + ";",
         "",
         "void main() {",
         ImageShaderConstructor.uvCoordinate +
            " = " +
            ImageShaderConstructor.inputTexCoordinate +
            ";",
         "gl_Position = vec4(" +
            ImageShaderConstructor.inputPosCoordinate +
            ", 1.0);",
         "}",
      ].join("\n");
   }

   private getFragmentShaderSource() {
      var fragmentShaderSource = [];
      fragmentShaderSource.push(this.getPreFragmentShaderSource());
      fragmentShaderSource.push(this.getUniformDeclarationsSource());
      fragmentShaderSource.push(this.getVoidMainFunction());
      console.log(fragmentShaderSource.join("\n"));
      return fragmentShaderSource.join("\n");
   }

   private getVoidMainFunction() {
      var mainSource = [""];
      mainSource.push("void main() {");
      mainSource.push(this.getColorDeclarationSource());
      mainSource.push(this.getCalculationSource());
      mainSource.push("}");
      return mainSource.join("\n");
   }

   private getPreFragmentShaderSource() {
      return [
         "#version 300 es",
         "precision " + this.floatPrecision + " float;",
         "",
         "in vec2 " + ImageShaderConstructor.uvCoordinate + ";",
         "out vec4 " + ImageShaderConstructor.fragmentColor + ";",
      ].join("\n");
   }

   private getUniformDeclarationsSource() {
      var uniformDeclarationsSource = [""];
      for (
         var i = 0;
         i < this.shaderVariableCollection.getShaderImages().length;
         i++
      ) {
         uniformDeclarationsSource.push(
            "uniform sampler2D " +
               this.shaderVariableCollection
                  .getShaderImages()
                  [i].getUniformVariable() +
               ";"
         );
      }
      return uniformDeclarationsSource.join("\n");
   }

   private getColorDeclarationSource() {
      var colorDeclarationSource = [];
      for (
         var i = 0;
         i < this.shaderVariableCollection.getShaderImages().length;
         i++
      ) {
         colorDeclarationSource.push(
            "vec4 " +
               this.shaderVariableCollection
                  .getShaderImages()
                  [i].getColorVariable() +
               " = " +
               "texture(" +
               this.shaderVariableCollection
                  .getShaderImages()
                  [i].getUniformVariable() +
               ", " +
               ImageShaderConstructor.uvCoordinate +
               ");"
         );
         if (this.onlyLuminance) {
            colorDeclarationSource.push(
               "float l_" +
                  this.shaderVariableCollection
                     .getShaderImages()
                     [i].getColorVariable() +
                  " = " +
                  "(" +
                  this.shaderVariableCollection
                     .getShaderImages()
                     [i].getColorVariable() +
                  ".r + " +
                  this.shaderVariableCollection
                     .getShaderImages()
                     [i].getColorVariable() +
                  ".g + " +
                  this.shaderVariableCollection
                     .getShaderImages()
                     [i].getColorVariable() +
                  ".b) / 3.0;"
            );
            colorDeclarationSource.push(
               this.shaderVariableCollection
                  .getShaderImages()
                  [i].getColorVariable() +
                  " = " +
                  "vec4(" +
                  "l_" +
                  this.shaderVariableCollection
                     .getShaderImages()
                     [i].getColorVariable() +
                  ", " +
                  "l_" +
                  this.shaderVariableCollection
                     .getShaderImages()
                     [i].getColorVariable() +
                  ", " +
                  "l_" +
                  this.shaderVariableCollection
                     .getShaderImages()
                     [i].getColorVariable() +
                  ", 1.0);"
            );
         }
      }
      return colorDeclarationSource.join("\n");
   }

   public setResult(resultValue: any) {
      resultValue = new ShaderVariable(
         resultValue,
         this.shaderVariableCollection,
         this.glContext
      );

      for (var channel = 0; channel < 4; channel++) {
         this.result[channel] = resultValue.getShaderStringOfChannel(channel);
      }
   }

   public setChannelResult(resultValue: any, channel: number) {
      resultValue = new ShaderVariable(
         resultValue,
         this.shaderVariableCollection,
         this.glContext
      );
      this.result[channel] = resultValue.getShaderStringOfChannel(channel);
   }

   private getCalculationSource() {
      var calculationSource = [""];
      for (var i = 0; i < this.calculations.length; i++) {
         calculationSource.push(this.calculations[i].getShaderString());
      }

      for (var i = 0; i < this.sieves.length; i++) {
         calculationSource.push(this.sieves[i].getShaderString());
      }

      calculationSource.push(
         ImageShaderConstructor.fragmentColor +
            " = vec4(" +
            this.result.join(", ") +
            ");"
      );
      return calculationSource.join("\n");
   }
}

class ShaderCalculation {
   private operant1: any;
   private operant2: any;
   private operator: String;
   private result: ShaderVariable;

   constructor(
      operant1: any,
      operant2: any,
      operator: string,
      shaderVariableCollection: ShaderVariableCollection,
      glContext: WebGL2RenderingContext
   ) {
      this.operant1 = this.castShaderVariable(
         operant1,
         shaderVariableCollection,
         glContext
      );
      this.operant2 = this.castShaderVariable(
         operant2,
         shaderVariableCollection,
         glContext
      );
      this.operator = operator;
      this.result = new ShaderVariable(
         null,
         shaderVariableCollection,
         glContext,
         this.getResultType()
      );
   }

   private castShaderVariable(
      castFrom: any,
      shaderVariableCollection: ShaderVariableCollection,
      glContext: WebGL2RenderingContext
   ) {
      if (castFrom instanceof ShaderVariable) {
         return castFrom;
      } else {
         return new ShaderVariable(
            castFrom,
            shaderVariableCollection,
            glContext
         );
      }
   }

   public getResult() {
      return this.result;
   }

   private getResultType() {
      if (this.operator === ".") {
         return "float";
      }
      if (this.operant1.isImage() || this.operant2.isImage()) {
         return "vec4";
      } else if (this.operant1.isFloat() && this.operant2.isFloat()) {
         return "float";
      }
   }

   public getShaderString() {
      if (this.operator == "max" || this.operator == "min") {
         return (
            this.getResultType() +
            " " +
            this.result.getShaderString() +
            " = " +
            this.operator +
            "(" +
            this.operant1.getShaderString() +
            ", " +
            this.operant2.getShaderString() +
            ");"
         );
      } else if (this.operator == ".") {
         return (
            "float " +
            this.result.getShaderString() +
            " = " +
            this.operant1.getShaderString() +
            this.operator +
            this.operant2.getShaderString() +
            ";"
         );
      } else {
         return (
            this.getResultType() +
            " " +
            this.result.getShaderString() +
            " = " +
            this.operant1.getShaderString() +
            " " +
            this.operator +
            " " +
            this.operant2.getShaderString() +
            ";"
         );
      }
   }
}

class ShaderSieve {
   private compare1: ShaderVariable;
   private compare2: ShaderVariable;
   private factor1;
   private factor2;
   private condition: string;
   private result: string;

   constructor(
      compare1,
      factor1,
      conditionOperator,
      compare2,
      factor2,
      shaderVariableCollection,
      glContext
   ) {
      this.compare1 = new ShaderVariable(
         compare1,
         shaderVariableCollection,
         glContext
      );
      this.compare2 = new ShaderVariable(
         compare2,
         shaderVariableCollection,
         glContext
      );
      this.factor1 = factor1;
      this.factor2 = factor2;
      this.condition = conditionOperator;
      this.result = UniqueVariable.getName("s_color");
   }

   getResult() {
      return this.result;
   }

   getShaderString() {
      return [
         "vec4 " + this.result + " = vec4(0.0, 0.0, 0.0, 1.0);",
         "if(" +
            this.compare1.getShaderStringOfChannel(0) +
            " * " +
            this.factor1 +
            " " +
            this.condition +
            " " +
            this.compare2.getShaderStringOfChannel(0) +
            " * " +
            this.factor2 +
            ") {",
         this.result + " = vec4(0.0, 0.0, 0.0, 0.0);",
         "}",
      ].join("\n");
   }
}

class ShaderVariableCollection {
   private shaderImages: Array<ShaderImage>;
   constructor() {
      this.shaderImages = [];
   }

   getShaderImages() {
      return this.shaderImages;
   }

   addShaderImage(shaderImage) {
      this.shaderImages.push(shaderImage);
   }
}

class ShaderVariable {
   private value;
   private collection;
   private manuallySetType;
   private glContext: WebGL2RenderingContext;
   private shaderString: string;
   private shaderImage: ShaderImage;
   constructor(value, collection, glContext, manuallySetType = null) {
      if (!this.cast(value)) {
         this.value = value;
         this.collection = collection;
         this.manuallySetType = manuallySetType;
         this.glContext = glContext;
         this.shaderString = null;
         this.shaderImage = null;

         if (this.value == null && this.manuallySetType == null) {
            console.error(
               "If shader variable value is not provided, manually type has to be set."
            );
         }
         if (this.value != null && this.manuallySetType != null) {
            console.warn(
               "If shader variable value is provided, manually type should not be set."
            );
            this.manuallySetType = null;
         }
         if (this.value == null) {
            this.value = UniqueVariable.getName("var_" + manuallySetType);
         }

         if (this.isImageWithData()) {
            this.setAsShaderImage();
         }
      }
   }

   cast(castFrom) {
      if (castFrom instanceof ShaderVariable) {
         this.value = castFrom.value;
         this.collection = castFrom.collection;
         this.manuallySetType = castFrom.manuallySetType;
         this.glContext = castFrom.glContext;
         this.shaderString = castFrom.shaderString;
         this.shaderImage = castFrom.shaderImage;
         return true;
      }
      return false;
   }

   setAsShaderImage() {
      for (var i = 0; i < this.collection.getShaderImages().length; i++) {
         if (
            this.collection.getShaderImages()[i].getJsImageObject() ==
            this.value
         ) {
            this.shaderImage = this.collection.getShaderImages()[i];
         }
      }
      if (this.shaderImage == null) {
         this.shaderImage = new ShaderImage(this.value, this.glContext);
         this.collection.addShaderImage(this.shaderImage);
      }
   }

   isStringWithData() {
      return this.value instanceof String || typeof this.value === "string";
   }

   isImage() {
      return (
         this.value instanceof HTMLImageElement ||
         this.manuallySetType == "vec4"
      );
   }

   isFloat() {
      return (
         !isNaN(this.value) ||
         typeof this.value == "number" ||
         this.manuallySetType == "float"
      );
   }

   isImageWithData() {
      return this.value instanceof HTMLImageElement;
   }

   isFloatWithData() {
      return !isNaN(this.value) || typeof this.value == "number";
   }

   isUnset() {
      return this.manuallySetType != null;
   }

   getValue() {
      return this.value;
   }

   getShaderStringFromType(type) {
      switch (type) {
         case "vec4":
            return this.shaderImage.getShaderString();
         case "float":
            return this.value.toFixed(1);
         case "name":
            return this.value;
         default:
            console.warn("Shader variable type not implemented.");
      }
   }

   getShaderString() {
      if (this.shaderString == null) {
         if (this.isUnset() || this.isStringWithData()) {
            this.shaderString = this.getShaderStringFromType("name");
         } else if (this.isImageWithData()) {
            this.shaderString = this.getShaderStringFromType("vec4");
         } else if (this.isFloatWithData()) {
            this.shaderString = this.getShaderStringFromType("float");
         }
      }
      return this.shaderString;
   }

   getShaderStringOfChannel(channel) {
      if (this.isImage()) {
         return this.getShaderString() + "." + COLOR_CHANNELS[channel];
      } else {
         return this.getShaderString();
      }
   }
}

class ShaderImage {
   public static count = 0;

   private jsImageObject: HTMLImageElement;
   private glContext: WebGL2RenderingContext;
   private imageVariable: string;
   private colorVariable: string;
   private texture: WebGLTexture;
   private count: number;

   constructor(jsImageObject, glContext) {
      this.jsImageObject = jsImageObject;
      this.glContext = glContext;
      this.imageVariable = UniqueVariable.getName("uniform");
      this.colorVariable = UniqueVariable.getName("color");
      this.texture = this.loadTexture();
      this.count = ShaderImage.count;
      ShaderImage.count++;
   }

   loadTexture() {
      var texture = this.glContext.createTexture();
      this.glContext.bindTexture(this.glContext.TEXTURE_2D, texture);

      this.glContext.texParameteri(
         this.glContext.TEXTURE_2D,
         this.glContext.TEXTURE_WRAP_S,
         this.glContext.CLAMP_TO_EDGE
      );
      this.glContext.texParameteri(
         this.glContext.TEXTURE_2D,
         this.glContext.TEXTURE_WRAP_T,
         this.glContext.CLAMP_TO_EDGE
      );
      this.glContext.texParameteri(
         this.glContext.TEXTURE_2D,
         this.glContext.TEXTURE_MIN_FILTER,
         this.glContext.LINEAR
      );
      this.glContext.texParameteri(
         this.glContext.TEXTURE_2D,
         this.glContext.TEXTURE_MAG_FILTER,
         this.glContext.LINEAR
      );

      this.glContext.texImage2D(
         this.glContext.TEXTURE_2D,
         0,
         this.glContext.RGBA,
         this.glContext.RGBA,
         this.glContext.UNSIGNED_BYTE,
         this.jsImageObject
      );

      return texture;
   }

   getTexture() {
      return this.texture;
   }

   getCount() {
      return this.count;
   }

   getUniformVariable() {
      return this.imageVariable;
   }

   getColorVariable() {
      return this.colorVariable;
   }

   getJsImageObject() {
      return this.jsImageObject;
   }

   getShaderString() {
      return this.getColorVariable();
   }
}

class UniqueVariable {
   public static uniqueImageNumber = 0;

   static get uniqueNumber() {
      return UniqueVariable.uniqueImageNumber;
   }

   static set uniqueNumber(newValue) {
      UniqueVariable.uniqueImageNumber = newValue;
   }

   static getName(prefix = "variable") {
      UniqueVariable.uniqueNumber++;
      return (
         prefix.toString() + "_" + UniqueVariable.uniqueImageNumber.toString()
      );
   }
}
