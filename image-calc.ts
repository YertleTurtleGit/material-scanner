"use strict";

class ImageCalc {
   private glslContext: GlslContext;

   constructor() {
      uiLog("Generating shader source.");
      this.glslContext = new GlslContext(WIDTH, HEIGHT);
   }

   public loadImage(image: HTMLImageElement): GlslVariable {
      const glslImage: GlslVariable = GlslImage.loadFromJsImage(image);
      this.glslContext.addGlslVariable(glslImage);
      return glslImage;
   }

   public loadNumber(number: number): GlslVariable {
      const glslNumber: GlslVariable = GlslNumber.loadFromJsNumber(number);
      this.glslContext.addGlslVariable(glslNumber);
      return glslNumber;
   }

   public add(...operants: GlslVariable[]): GlslVariable {
      const glslVariable: GlslVariable = new GlslAddition(
         operants
      ).getGlslResultVariable();
      this.glslContext.addGlslVariable(glslVariable);
      return glslVariable;
   }

   public substract(...operants: GlslVariable[]): GlslVariable {
      const glslVariable: GlslVariable = new GlslSubstraction(
         operants
      ).getGlslResultVariable();
      this.glslContext.addGlslVariable(glslVariable);
      return glslVariable;
   }

   public multiply(...operants: GlslVariable[]): GlslVariable {
      const glslVariable: GlslVariable = new GlslMultiplication(
         operants
      ).getGlslResultVariable();
      this.glslContext.addGlslVariable(glslVariable);
      return glslVariable;
   }

   public divide(...operants: GlslVariable[]): GlslVariable {
      const glslVariable: GlslVariable = new GlslDivision(
         operants
      ).getGlslResultVariable();
      this.glslContext.addGlslVariable(glslVariable);
      return glslVariable;
   }

   public min(...parameters: GlslVariable[]): GlslVariable {
      const operation = new GlslMethodMin(parameters);
      const glslVariable: GlslVariable = operation.getGlslResultVariable();

      this.glslContext.addGlslVariable(glslVariable);
      // TODO: Beautify
      glslVariable.setDeclaringOperation(operation);
      return glslVariable;
   }

   public max(...parameters: GlslVariable[]): GlslVariable {
      const operation = new GlslMethodMax(parameters);
      const glslVariable: GlslVariable = operation.getGlslResultVariable();

      this.glslContext.addGlslVariable(glslVariable);
      // TODO: Beautify
      glslVariable.setDeclaringOperation(operation);
      return glslVariable;
   }

   normalize(glslVariable: GlslVariable): GlslVariable {
      const operation = new GlslNormalize(glslVariable);
      const glslResult: GlslVariable = operation.getGlslResultVariable();

      this.glslContext.addGlslVariable(glslResult);
      // TODO: Beautify
      glslResult.setDeclaringOperation(operation);
      return glslResult;
   }

   public getGrayscaleFloat(
      image: GlslVariable,
      channelProportions: [number, number, number] = [1 / 3, 1 / 3, 1 / 3]
   ): GlslVariable {
      const glslNumber: GlslVariable = GlslNumber.loadFromGlslImageGrayscale(
         <GlslImage>image,
         channelProportions
      );
      this.glslContext.addGlslVariable(glslNumber);
      return glslNumber;
   }

   public getChannelFromImage(
      image: GlslVariable,
      channel: COLOR_CHANNEL
   ): GlslVariable {
      const glslNumber: GlslVariable = GlslNumber.loadFromGlslImageChannel(
         <GlslImage>image,
         channel
      );
      this.glslContext.addGlslVariable(glslNumber);
      return glslNumber;
   }

   public getImageFromChannels(
      red: GlslVariable,
      green: GlslVariable,
      blue: GlslVariable,
      alpha: GlslVariable
   ): GlslVariable {
      const glslImage = GlslImage.getFromChannels(
         <GlslNumber>red,
         <GlslNumber>green,
         <GlslNumber>blue,
         <GlslNumber>alpha
      );
      this.glslContext.addGlslVariable(glslImage);
      return glslImage;
   }

   public renderToFramebuffer(glslImage: GlslVariable): GlslFramebuffer {
      return this.glslContext.renderFramebuffer(<GlslImage>glslImage);
   }

   public renderToPixelArray(glslImage: GlslVariable): Uint8Array {
      return this.glslContext.renderPixelArray(<GlslImage>glslImage);
   }

   public renderToDataUrl(glslImage: GlslVariable): string {
      return this.glslContext.renderDataUrl(<GlslImage>glslImage);
   }

   public renderToImage(
      glslImage: GlslVariable,
      onloadFunction
   ): HTMLImageElement {
      return this.glslContext.renderImage(<GlslImage>glslImage, onloadFunction);
   }

   public purge(): void {
      this.glslContext.purge();
   }
}

const enum GLSL_VAR {
   UV = "uv",
   TEX = "tex",
   POS = "pos",
   OUT = "fragColor",
}

const enum GLSL_TYPE {
   FLOAT = "float",
   VEC4 = "vec4",
}

const enum COLOR_CHANNEL {
   RED = "r",
   GREEN = "g",
   BLUE = "b",
   ALPHA = "a",
}

class GlslFramebuffer {}

abstract class GlslVariable {
   private static uniqueNumber: number = 0;

   private glslName: string;
   protected declaringOperation: GlslOperation = null;

   constructor() {
      this.glslName = GlslVariable.getUniqueName(this.getGlslVarType());
   }

   public setDeclaringOperation(declaringOperation: GlslOperation) {
      this.declaringOperation = declaringOperation;
   }

   protected hasDeclaringOperation(): boolean {
      return this.declaringOperation !== null;
   }

   public static getUniqueName(prefix: string): string {
      GlslVariable.uniqueNumber++;
      return prefix + "_" + String(GlslVariable.uniqueNumber);
   }

   public getGlslName(): string {
      return this.glslName;
   }

   public abstract getGlslPreMainDeclaration(
      shaderSourceGenerator: GlslShaderSourceGenerator
   ): string;
   public abstract getGlslMainDeclaration(): string;
   public abstract getGlslVarType(): GLSL_TYPE;
}

class GlslImage extends GlslVariable {
   private glslTexture: GlslTexture = null;
   private declarationFromChannels: string = null;

   public static loadFromJsImage(image: HTMLImageElement): GlslImage {
      var glslImage: GlslImage = new GlslImage();
      glslImage.setGlslTexture(new GlslTexture(image));
      return glslImage;
   }

   public static getFromChannels(
      red: GlslNumber,
      green: GlslNumber,
      blue: GlslNumber,
      alpha: GlslNumber
   ): GlslImage {
      var channelImage: GlslImage = new GlslImage();
      channelImage.declarationFromChannels =
         channelImage.getGlslVarType() +
         " " +
         channelImage.getGlslName() +
         " = " +
         "vec4(" +
         red.getGlslName() +
         ", " +
         green.getGlslName() +
         ", " +
         blue.getGlslName() +
         ", " +
         alpha.getGlslName() +
         ");";

      return channelImage;
   }

   public getGlslTexture(): GlslTexture {
      return this.glslTexture;
   }

   public setGlslTexture(glslTexture: GlslTexture) {
      this.glslTexture = glslTexture;
   }

   public getGlslVarType(): GLSL_TYPE {
      return GLSL_TYPE.VEC4;
   }

   public hasTexture(): boolean {
      return this.glslTexture !== null;
   }

   private hasDeclarationFromChannels(): boolean {
      return this.declarationFromChannels !== null;
   }

   public getGlslPreMainDeclaration(): string {
      if (this.hasTexture()) {
         return this.glslTexture.getGlslPreMainDeclaration();
      }
      return null;
   }

   public getGlslMainDeclaration(): string {
      var source = "";
      if (this.hasTexture()) {
         source += this.glslTexture.getGlslMainDeclaration(this.getGlslName());
      }
      if (this.hasDeclaringOperation()) {
         source += this.declaringOperation.getGlslExpression();
      }
      if (this.hasDeclarationFromChannels()) {
         source += this.declarationFromChannels;
      }
      if (source === "") {
         console.warn("Image is somehow not declared on gpu.");
         return null;
      }
      return source;
   }
}

class GlslTexture {
   private image: HTMLImageElement;

   private samplerName: string;

   constructor(image: HTMLImageElement) {
      this.image = image;
      this.samplerName = GlslVariable.getUniqueName("sampler");
   }

   public getDimensions(): [number, number] {
      return [this.image.width, this.image.height];
   }

   public getGlslPreMainDeclaration(): string {
      return "uniform sampler2D " + this.samplerName + ";";
   }

   public getGlslMainDeclaration(outGlslName: string): string {
      return (
         GLSL_TYPE.VEC4 +
         " " +
         outGlslName +
         " = texture(" +
         this.samplerName +
         ", " +
         GLSL_VAR.UV +
         ");"
      );
   }

   public loadTextureIntoShaderProgram(
      glContext: WebGL2RenderingContext,
      shaderProgram: WebGLProgram,
      textureUnit: number
   ): void {
      glContext.activeTexture(glContext.TEXTURE0 + textureUnit);
      glContext.bindTexture(
         glContext.TEXTURE_2D,
         this.createTextureInContext(glContext)
      );

      glContext.uniform1i(
         glContext.getUniformLocation(shaderProgram, this.samplerName),
         textureUnit
      );
   }

   private createTextureInContext(
      glContext: WebGL2RenderingContext
   ): WebGLTexture {
      var texture = glContext.createTexture();
      glContext.bindTexture(glContext.TEXTURE_2D, texture);

      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_WRAP_S,
         glContext.CLAMP_TO_EDGE
      );
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_WRAP_T,
         glContext.CLAMP_TO_EDGE
      );
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_MIN_FILTER,
         glContext.LINEAR
      );
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_MAG_FILTER,
         glContext.LINEAR
      );

      glContext.texImage2D(
         glContext.TEXTURE_2D,
         0,
         glContext.RGBA,
         glContext.RGBA,
         glContext.UNSIGNED_BYTE,
         this.image
      );

      return texture;
   }
}

class GlslNumber extends GlslVariable {
   private glslValue: string = null;

   static loadFromGlslImageGrayscale(
      glslImage: GlslImage,
      channelProportions: [number, number, number]
   ): GlslNumber {
      var glslNumber: GlslNumber = new GlslNumber();
      glslNumber.glslValue =
         glslImage.getGlslName() +
         "." +
         COLOR_CHANNEL.RED +
         "*" +
         channelProportions[0] +
         "+" +
         glslImage.getGlslName() +
         "." +
         COLOR_CHANNEL.GREEN +
         "*" +
         channelProportions[1] +
         "+" +
         glslImage.getGlslName() +
         "." +
         COLOR_CHANNEL.BLUE +
         "*" +
         channelProportions[2];

      return glslNumber;
   }

   static loadFromGlslImageChannel(
      glslImage: GlslImage,
      channel: COLOR_CHANNEL
   ): GlslNumber {
      var glslNumber: GlslNumber = new GlslNumber();
      glslNumber.glslValue = glslImage.getGlslName() + "." + channel;
      return glslNumber;
   }

   static loadFromJsNumber(number: number): GlslNumber {
      var glslNumber = new GlslNumber();
      glslNumber.glslValue = GlslNumber.getNumberAsString(number);
      return glslNumber;
   }

   public static getNumberAsString(number: number): string {
      if (Math.trunc(number) === number) {
         return number.toString() + ".0";
      }
      if (number.toString().includes("e-")) {
         console.warn(number + " is converted to zero.");
         return "0.0";
      }
      return number.toString();
   }

   private hasValueRepresentation(): boolean {
      return this.glslValue !== null;
   }

   public getGlslName(): string {
      if (this.hasValueRepresentation()) {
         return this.glslValue;
      }
      return super.getGlslName();
   }

   public getGlslVarType(): GLSL_TYPE {
      return GLSL_TYPE.FLOAT;
   }

   public getGlslPreMainDeclaration(): string {
      return null;
   }

   public getGlslMainDeclaration(): string {
      if (this.hasValueRepresentation()) {
         return null;
      }

      if (this.hasDeclaringOperation()) {
         return this.declaringOperation.getGlslExpression();
      }

      console.warn("Number is somehow not declared on gpu.");
      return null;
   }
}

//class GlslUniform extends GlslVariable {}

abstract class GlslOperation {
   protected parameters: GlslVariable[];
   protected glslResult: GlslVariable;

   constructor(parameters: GlslVariable[]) {
      this.parameters = parameters;
      this.glslResult = this.createGlslResultVariable();
      this.glslResult.setDeclaringOperation(this);
   }

   public getGlslResultVariable(): GlslVariable {
      return this.glslResult;
   }

   protected abstract createGlslResultVariable(): GlslVariable;
   public abstract getGlslVariables(): GlslVariable[];
   public abstract getGlslExpression(): string;
   protected abstract isValidOperation(): boolean;
}

abstract class GlslArithmeticOperation extends GlslOperation {
   constructor(parameters: GlslVariable[]) {
      super(parameters);
   }

   public getGlslExpression(): string {
      var operantNames: string[] = [];
      for (var i = 0; i < this.parameters.length; i++) {
         var addendName = this.parameters[i].getGlslName();
         if (
            this.parameters[i].getGlslVarType() === GLSL_TYPE.FLOAT &&
            this.anyIsImage()
         ) {
            addendName =
               "vec4(" +
               addendName +
               ", " +
               addendName +
               ", " +
               addendName +
               ", 1.0)";
         }
         operantNames.push(addendName);
      }

      return (
         this.glslResult.getGlslVarType() +
         " " +
         this.glslResult.getGlslName() +
         " = " +
         operantNames.join(" " + this.getGlslOperator() + " ") +
         ";"
      );
   }

   public getGlslVariables(): GlslVariable[] {
      var allGlslVariables: GlslVariable[] = [];
      for (var i = 0; i < this.parameters.length; i++) {
         allGlslVariables.push(this.parameters[i]);
      }
      allGlslVariables.push(this.glslResult);
      return allGlslVariables;
   }

   private anyIsImage(): boolean {
      for (var i = 0; i < this.parameters.length; i++) {
         if (this.parameters[i].getGlslVarType() === GLSL_TYPE.VEC4) {
            return true;
         }
      }
      return false;
   }

   protected createGlslResultVariable(): GlslVariable {
      if (this.anyIsImage()) {
         return new GlslImage();
      }
      return new GlslNumber();
   }

   protected isValidOperation(): boolean {
      return true;
   }

   protected abstract getGlslOperator(): string;
}

class GlslAddition extends GlslArithmeticOperation {
   private static operator: string = "+";

   protected getGlslOperator(): string {
      return GlslAddition.operator;
   }
}

class GlslSubstraction extends GlslArithmeticOperation {
   private static operator: string = "-";

   protected getGlslOperator(): string {
      return GlslSubstraction.operator;
   }
}

class GlslMultiplication extends GlslArithmeticOperation {
   private operator: string = "*";

   protected getGlslOperator(): string {
      return this.operator;
   }
}

class GlslDivision extends GlslArithmeticOperation {
   private operator: string = "/";

   protected getGlslOperator(): string {
      return this.operator;
   }

   public isValidOperation(): boolean {
      for (var i = 0; i < this.parameters.length; i++) {
         if (this.parameters[i].getGlslVarType() === GLSL_TYPE.FLOAT) {
            for (var j = i; j < this.parameters.length; j++) {
               if (this.parameters[j].getGlslVarType() === GLSL_TYPE.VEC4) {
                  console.error(
                     "Value of type float can not be divided by value of type vec4."
                  );
                  return false;
               }
            }
         }
      }
      return true;
   }
}

abstract class GlslMethod extends GlslOperation {
   constructor(parameters: GlslVariable[]) {
      super(parameters);
      this.parameters = parameters;
      this.glslResult = this.createGlslResultVariable();
   }

   public isValidOperation(): boolean {
      return true;
   }

   protected createGlslResultVariable(): GlslVariable {
      if (this.parameters[0].getGlslVarType() === GLSL_TYPE.FLOAT) {
         return new GlslNumber();
      } else if (this.parameters[0].getGlslVarType() === GLSL_TYPE.VEC4) {
         return new GlslImage();
      }
   }

   public getGlslVariables(): GlslVariable[] {
      var allGlslVariables: GlslVariable[] = [];
      for (var i = 0; i < this.parameters.length; i++) {
         allGlslVariables.push(this.parameters[i]);
      }
      allGlslVariables.push(this.glslResult);
      return allGlslVariables;
   }
}

class GlslNormalize extends GlslMethod {
   constructor(parameter: GlslVariable) {
      super([parameter]);
   }

   public getGlslExpression(): string {
      return (
         this.getGlslResultVariable().getGlslVarType() +
         " " +
         this.getGlslResultVariable().getGlslName() +
         " = normalize(" +
         this.parameters[0].getGlslName() +
         ");"
      );
   }
}

abstract class GlslMethodComparison extends GlslMethod {
   constructor(parameters: GlslVariable[]) {
      super(parameters);
   }

   protected getGlslExpressionOfMethodName(methodName: string) {
      if (this.parameters !== null) {
         var paramExpressions: string[] = [];
         for (var i = 0; i < this.parameters.length; i++) {
            paramExpressions.push(this.parameters[i].getGlslName());
         }
         return (
            this.getGlslResultVariable().getGlslVarType() +
            " " +
            this.getGlslResultVariable().getGlslName() +
            " = " +
            this.getGlslExpressionOfParams(methodName, paramExpressions) +
            ";"
         );
      } else {
         console.warn("parameters of method are null");
         return null;
      }
   }

   private getGlslExpressionOfParams(
      methodName: string,
      params: string[]
   ): string {
      if (params.length === 1) {
         return params[0];
      } else if (params.length === 2) {
         return methodName + "(" + params[0] + ", " + params[1] + ")";
      } else {
         return (
            methodName +
            "(" +
            params.pop() +
            ", " +
            this.getGlslExpressionOfParams(methodName, params) +
            ")"
         );
      }
   }

   public isValidOperation(): boolean {
      var lastType = this.parameters[0].getGlslVarType();
      for (var i = 1; i < this.parameters.length; i++) {
         if (lastType !== this.parameters[i].getGlslVarType()) {
            return false;
         }
      }
      return true;
   }
}

class GlslMethodMin extends GlslMethodComparison {
   private static methodName: string = "min";

   constructor(parameters: GlslVariable[]) {
      super(parameters);
   }

   public getGlslExpression(): string {
      return this.getGlslExpressionOfMethodName(GlslMethodMin.methodName);
   }
}

class GlslMethodMax extends GlslMethodComparison {
   private static methodName: string = "max";

   constructor(parameters: GlslVariable[]) {
      super(parameters);
   }

   public getGlslExpression(): string {
      return this.getGlslExpressionOfMethodName(GlslMethodMax.methodName);
   }
}

//class GlslMethodSqrt extends GlslMethod {}
//class GlslCondition extends GlslMethod {}

class GlslShaderSourceGenerator {
   private floatPrecision = "high" + "p";

   private glslVariables: GlslVariable[] = [];

   private checkIfGlslVariableExists(glslVariable: GlslVariable) {
      return this.glslVariables.includes(glslVariable);
   }

   public addGlslVariable(glslVariable: GlslVariable) {
      //if (!this.checkIfGlslVariableExists(glslVariable)) {
      this.glslVariables.push(glslVariable);
      //}
   }

   public getGlslTextures(): GlslTexture[] {
      var glslTextures: GlslTexture[] = [];
      for (var i = 0; i < this.glslVariables.length; i++) {
         if (this.glslVariables[i] instanceof GlslImage) {
            var glslImage = <GlslImage>this.glslVariables[i];
            if (glslImage.hasTexture()) {
               glslTextures.push(glslImage.getGlslTexture());
            }
         }
      }
      return glslTextures;
   }

   public getGlslVertexSource(): string {
      return [
         "#version 300 es",
         "",
         "in vec3 " + GLSL_VAR.POS + ";",
         "in vec2 " + GLSL_VAR.TEX + ";",
         "",
         "out vec2 " + GLSL_VAR.UV + ";",
         "",
         "void main() {",
         " " + GLSL_VAR.UV + " = " + GLSL_VAR.TEX + ";",
         " gl_Position = vec4(" + GLSL_VAR.POS + ", 1.0);",
         "}",
      ].join("\n");
   }

   public getGlslFragmentSource(resultImage: GlslImage): string {
      return [
         this.getGlslPreFragmentShaderSource(),
         this.getGlslFragmentShaderPreMainDeclarationSource(),
         "\nvoid main() {\n",
         this.getGlslFragmentShaderMainDeclarationSource(),
         GLSL_VAR.OUT + " = " + resultImage.getGlslName() + ";",
         "}",
      ].join("\n");
   }

   private getGlslPreFragmentShaderSource(): string {
      return [
         "#version 300 es",
         "precision " + this.floatPrecision + " float;",
         "",
         "in vec2 " + GLSL_VAR.UV + ";",
         "out vec4 " + GLSL_VAR.OUT + ";",
      ].join("\n");
   }

   private getGlslFragmentShaderPreMainDeclarationSource(): string {
      var source: string = "";
      for (var i = 0; i < this.glslVariables.length; i++) {
         const varSource = this.glslVariables[i].getGlslPreMainDeclaration(
            this
         );
         if (varSource !== null) {
            source += varSource + "\n";
         }
      }
      return source;
   }

   private getGlslFragmentShaderMainDeclarationSource(): string {
      var source: string = "";
      for (var i = 0; i < this.glslVariables.length; i++) {
         const varSource = this.glslVariables[i].getGlslMainDeclaration();
         if (varSource !== null) {
            source += varSource + "\n";
         }
      }
      return source;
   }
}

class GlslContext {
   private glContext: WebGL2RenderingContext;
   private glCanvas: HTMLCanvasElement;
   private glShaderProgram: WebGLProgram;
   private shaderSourceGenerator: GlslShaderSourceGenerator;

   private shaderFinished: boolean = false;

   private resultPixelArray: Uint8Array = null;
   private resultDataUrl: string = null;
   private resultImage: HTMLImageElement = null;

   constructor(width: number, height: number) {
      this.shaderSourceGenerator = new GlslShaderSourceGenerator();
      this.createGlContext(width, height);
      this.resultPixelArray = new Uint8Array(
         this.glCanvas.width * this.glCanvas.height * 4
      );
   }

   public addGlslVariable(glslVariable: GlslVariable) {
      this.shaderSourceGenerator.addGlslVariable(glslVariable);
   }

   public renderFramebuffer(image: GlslImage): any {
      throw new Error("Method not implemented.");
   }

   public renderImage(image: GlslImage, onloadFunction): HTMLImageElement {
      if (!this.shaderFinished) {
         this.runShader(image);
      }
      if (this.resultImage === null) {
         this.resultImage = new Image();
         //this.resultImage.crossOrigin = "anonymous";
         this.resultImage.addEventListener("load", onloadFunction);
         this.resultImage.src = this.renderDataUrl(image);
      }
      return this.resultImage;
   }

   public renderDataUrl(image: GlslImage): string {
      if (!this.shaderFinished) {
         this.runShader(image);
      }
      if (this.resultDataUrl === null) {
         this.resultDataUrl = this.glCanvas.toDataURL();
      }
      return this.resultDataUrl;
   }

   public renderPixelArray(image: GlslImage): Uint8Array {
      if (!this.shaderFinished) {
         this.runShader(image);
      }
      return this.resultPixelArray;
   }

   private runShader(resultImage: GlslImage): void {
      this.glShaderProgram = this.createShaderProgram(resultImage);
      this.glContext.useProgram(this.glShaderProgram);
      this.loadGlslTextures(this.shaderSourceGenerator.getGlslTextures());

      uiLog("Rendering on gpu.");

      var framePositionLocation = this.glContext.getAttribLocation(
         this.glShaderProgram,
         GLSL_VAR.POS
      );
      var frameTextureLocation = this.glContext.getAttribLocation(
         this.glShaderProgram,
         GLSL_VAR.TEX
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
         false,
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
         false,
         2 * FLOAT_SIZE,
         0
      );
      this.glContext.enableVertexAttribArray(frameTextureLocation);
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);

      this.glContext.bindVertexArray(null);

      //this.glContext.useProgram(this.glShaderProgram);

      this.glContext.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
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
      this.glContext.flush();
      this.glContext.finish();
      this.shaderFinished = true;
   }

   private createGlContext(width: number, height: number) {
      this.glCanvas = document.createElement("canvas");
      this.glCanvas.width = width;
      this.glCanvas.height = height;
      this.glContext = this.glCanvas.getContext("webgl2");
   }

   private createShaderProgram(resultImage: GlslImage): WebGLProgram {
      var vertexShader = this.glContext.createShader(
         this.glContext.VERTEX_SHADER
      );
      var fragmentShader = this.glContext.createShader(
         this.glContext.FRAGMENT_SHADER
      );

      const vertexShaderSource = this.shaderSourceGenerator.getGlslVertexSource();
      const fragmentShaderSource = this.shaderSourceGenerator.getGlslFragmentSource(
         resultImage
      );

      //uiLog(vertexShaderSource);
      //uiLog(fragmentShaderSource);

      this.glContext.shaderSource(vertexShader, vertexShaderSource);
      this.glContext.shaderSource(fragmentShader, fragmentShaderSource);

      uiLog("Compiling shader program.");
      this.glContext.compileShader(vertexShader);
      this.glContext.compileShader(fragmentShader);

      var shaderProgram = this.glContext.createProgram();
      this.glContext.attachShader(shaderProgram, vertexShader);
      this.glContext.attachShader(shaderProgram, fragmentShader);
      this.glContext.linkProgram(shaderProgram);

      return shaderProgram;
   }

   private loadGlslTextures(glslTextures: GlslTexture[]): void {
      uiLog("Loading " + glslTextures.length + " image(s) for gpu.");
      for (var i = 0; i < glslTextures.length; i++) {
         glslTextures[i].loadTextureIntoShaderProgram(
            this.glContext,
            this.glShaderProgram,
            i
         );
      }
   }

   public purge(): void {
      uiLog("Purging connection to gpu.");
      this.glContext.getExtension("WEBGL_lose_context").loseContext();
   }
}
