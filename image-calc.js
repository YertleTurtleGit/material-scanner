"use strict";

const CHANNEL_ARRAY = ["r", "g", "b", "a"];
class ImageCalc {
   constructor(onlyLuminance = false) {
      cLog("Generating shader source.");
      this.imageShaderConstructor = new ImageShaderConstructor(onlyLuminance);
   }

   add(addend1, addend2) {
      return this.calculate(addend1, addend2, "+");
   }

   substract(minuend, subtrahend) {
      return this.calculate(minuend, subtrahend, "-");
   }

   multiply(multiplier, multiplicand) {
      return this.calculate(multiplier, multiplicand, "*");
   }

   divide(dividend, divisor) {
      return this.calculate(dividend, divisor, "/");
   }

   max(comparable1, comparable2) {
      return this.calculate(comparable1, comparable2, "max");
   }

   min(comparable1, comparable2) {
      return this.calculate(comparable1, comparable2, "min");
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

   calculate(operant1, operant2, operator) {
      return this.imageShaderConstructor.addCalculation(
         operant1,
         operant2,
         operator
      );
   }

   setResult(value) {
      this.imageShaderConstructor.setResult(value);
   }

   setResultChannels(channels) {
      this.imageShaderConstructor.setChannelResult(channels[0], 0);
      this.imageShaderConstructor.setChannelResult(channels[1], 1);
      this.imageShaderConstructor.setChannelResult(channels[2], 2);
      this.imageShaderConstructor.setChannelResult(channels[3], 3);
   }

   getResultAsJsImageObject(onloadCallback) {
      return this.imageShaderConstructor.getResultJsImageObject(onloadCallback);
   }

   getResultAsPixelArray() {
      return this.imageShaderConstructor.getResultPixelArray();
   }

   getResultAsDataUrl() {
      return this.imageShaderConstructor.getResultAsDataUrl();
   }

   purge() {
      this.imageShaderConstructor.purge();
   }
}

class ImageShaderConstructor {
   constructor(onlyLuminance) {
      this.floatPrecision = "highp";
      this.inputPosCoordinate = "inputPosCoordinate";
      this.inputTexCoordinate = "inputTexCoordinate";
      this.tmpFragColor = "tmpFragColor";
      this.fragmentColor = "fragColor";
      this.uvCoordinate = "uv";
      this.lastUniqueVariableNumber = 0;
      this.calculations = [];
      this.sieves = [];
      this.shaderProgram = null;
      this.result = [null, null, null];

      this.resultImage = null;
      this.onlyLuminance = onlyLuminance;
      this.shaderRun = false;
      this.resultDataUrl = null;

      this.glCanvas = document.createElement("CANVAS");
      this.glCanvas.width = WIDTH;
      this.glCanvas.height = HEIGHT;
      //document.body.appendChild(glCanvas);
      this.glContext = this.glCanvas.getContext("webgl2");

      this.resultPixelArray = new Uint8Array(
         this.glCanvas.width * this.glCanvas.height * 4
      );
      this.shaderVariableCollection = new ShaderVariableCollection();
   }

   purge() {
      this.glContext.getExtension("WEBGL_lose_context").loseContext();
   }

   getResultJsImageObject(onloadCallback) {
      if (this.resultImage === null) {
         this.resultImage = new Image();
         this.resultImage.addEventListener("load", onloadCallback);
         this.resultImage.src = this.getResultAsDataUrl();
      }
      return this.resultImage;
   }

   getResultPixelArray() {
      if (!this.shaderRun) {
         this.runShader();
      }
      return this.resultPixelArray;
   }

   getResultAsDataUrl() {
      if (!this.shaderRun) {
         this.runShader();
      }
      if (this.resultDataUrl == null) {
         this.resultDataUrl = this.glCanvas.toDataURL();
      }
      return this.resultDataUrl;
   }

   runShader() {
      this.loadShaderImagesIntoShader();

      var framePositionLocation = this.glContext.getAttribLocation(
         this.getShaderProgram(),
         this.inputPosCoordinate
      );
      var frameTextureLocation = this.glContext.getAttribLocation(
         this.getShaderProgram(),
         this.inputTexCoordinate
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

   getShaderProgram() {
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

         cLog("Compiling shader program.");
         this.glContext.compileShader(vertexShader);
         this.glContext.compileShader(fragmentShader);

         cLog("Linking shader program.");
         var shaderProgram = this.glContext.createProgram();
         this.glContext.attachShader(shaderProgram, vertexShader);
         this.glContext.attachShader(shaderProgram, fragmentShader);
         this.glContext.linkProgram(shaderProgram);

         this.shaderProgram = shaderProgram;
      }
      return this.shaderProgram;
   }

   loadShaderImagesIntoShader() {
      this.glContext.bindTexture(this.glContext.TEXTURE_2D, null);
      this.glContext.useProgram(this.getShaderProgram());
      this.glContext.clear(
         this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT
      );
      cLog("Loading images for GPU.");
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

   addCalculation(operant1, operant2, operator) {
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

   addSieve(image1, factor1, conditionOperator, image2, factor2) {
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

   getVertexShaderSource() {
      return [
         "#version 300 es",
         "",
         "in vec3 " + this.inputPosCoordinate + ";",
         "in vec2 " + this.inputTexCoordinate + ";",
         "",
         "out vec2 " + this.uvCoordinate + ";",
         "",
         "void main() {",
         this.uvCoordinate + " = " + this.inputTexCoordinate + ";",
         "gl_Position = vec4(" + this.inputPosCoordinate + ", 1.0);",
         "}",
      ].join("\n");
   }

   getFragmentShaderSource() {
      var fragmentShaderSource = [];
      fragmentShaderSource.push(this.getPreFragmentShaderSource());
      fragmentShaderSource.push(this.getUniformDeclarationsSource());
      fragmentShaderSource.push(this.getVoidMainFunction());
      //console.log(fragmentShaderSource.join("\n"));
      return fragmentShaderSource.join("\n");
   }

   getVoidMainFunction() {
      var mainSource = [""];
      mainSource.push("void main() {");
      mainSource.push(this.getColorDeclarationSource());
      mainSource.push(this.getCalculationSource());
      mainSource.push("}");
      return mainSource.join("\n");
   }

   getPreFragmentShaderSource() {
      return [
         "#version 300 es",
         "precision " + this.floatPrecision + " float;",
         "",
         "in vec2 " + this.uvCoordinate + ";",
         "out vec4 " + this.fragmentColor + ";",
      ].join("\n");
   }

   getUniformDeclarationsSource() {
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

   getColorDeclarationSource() {
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
               this.uvCoordinate +
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

   setResult(resultValue) {
      resultValue = new ShaderVariable(
         resultValue,
         this.shaderVariableCollection,
         this.glContext
      );

      for (var channel = 0; channel < 4; channel++) {
         this.result[channel] = resultValue.getShaderStringOfChannel(channel);
      }
   }

   setChannelResult(resultValue, channel) {
      resultValue = new ShaderVariable(
         resultValue,
         this.shaderVariableCollection,
         this.glContext
      );
      this.result[channel] = resultValue.getShaderStringOfChannel(channel);
   }

   getCalculationSource() {
      var calculationSource = [""];
      for (var i = 0; i < this.calculations.length; i++) {
         calculationSource.push(this.calculations[i].getShaderString());
      }

      for (var i = 0; i < this.sieves.length; i++) {
         calculationSource.push(this.sieves[i].getShaderString());
      }

      calculationSource.push(
         this.fragmentColor + " = vec4(" + this.result.join(", ") + ");"
      );
      return calculationSource.join("\n");
   }
}

class ShaderCalculation {
   constructor(
      operant1,
      operant2,
      operator,
      shaderVariableCollection,
      glContext
   ) {
      this.operant1 = new ShaderVariable(
         operant1,
         shaderVariableCollection,
         glContext
      );
      this.operant2 = new ShaderVariable(
         operant2,
         shaderVariableCollection,
         glContext
      );
      this.operator = operator;
      this.result = UniqueVariable.getName("color");
   }

   getResult() {
      return this.result;
   }

   getShaderString() {
      if (this.operator == "max" || this.operator == "min") {
         return (
            "vec4 " +
            this.result +
            " = " +
            this.operator +
            "(" +
            this.operant1.getShaderString() +
            ", " +
            this.operant2.getShaderString() +
            ");"
         );
      } else {
         return (
            "vec4 " +
            this.result +
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
   constructor(value, collection, glContext) {
      this.value = value;
      this.glContext = glContext;

      this.shaderString = null;
      this.shaderImage = null;

      if (this.isImage()) {
         for (var i = 0; i < collection.getShaderImages().length; i++) {
            if (
               collection.getShaderImages()[i].getJsImageObject() == this.value
            ) {
               this.shaderImage = collection.getShaderImages()[i];
            }
         }
         if (this.shaderImage == null) {
            this.shaderImage = new ShaderImage(this.value, this.glContext);
            collection.addShaderImage(this.shaderImage);
         }
      }
   }

   isImage() {
      return this.value instanceof HTMLImageElement;
   }

   isNumeric() {
      return !isNaN(this.value) || typeof this.value == "number";
   }

   isString() {
      return typeof this.value == "string";
   }

   getValue() {
      return this.value;
   }

   getShaderString() {
      if (this.shaderString == null) {
         if (this.isImage()) {
            this.shaderString = this.shaderImage.getShaderString();
         } else if (this.isString()) {
            this.shaderString = this.value;
         } else if (this.isNumeric()) {
            if (Math.floor(this.value) == this.value) {
               this.shaderString = this.value.toFixed(1);
            } else {
               this.shaderString = String(this.value);
            }
         }
      }
      return this.shaderString;
   }

   getShaderStringOfChannel(channel) {
      if (this.isImage() || this.isString()) {
         return this.getShaderString() + "." + CHANNEL_ARRAY[channel];
      } else {
         return this.getShaderString();
      }
   }
}

class ShaderImage {
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
ShaderImage.count = 0;

class UniqueVariable {
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
UniqueVariable.uniqueNumber = 0;
