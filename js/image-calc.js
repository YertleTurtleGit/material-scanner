"use strict";
class ImageCalc {
    constructor() {
        uiLog("Generating shader source.");
        this.glslContext = new GlslContext(WIDTH, HEIGHT);
    }
    loadImage(image) {
        const glslImage = GlslImage.loadFromJsImage(image);
        this.glslContext.addGlslVariable(glslImage);
        return glslImage;
    }
    loadNumber(number) {
        const glslNumber = GlslNumber.loadFromJsNumber(number);
        this.glslContext.addGlslVariable(glslNumber);
        return glslNumber;
    }
    add(...operants) {
        const glslVariable = new GlslAddition(operants).getGlslResultVariable();
        this.glslContext.addGlslVariable(glslVariable);
        return glslVariable;
    }
    substract(...operants) {
        const glslVariable = new GlslSubstraction(operants).getGlslResultVariable();
        this.glslContext.addGlslVariable(glslVariable);
        return glslVariable;
    }
    multiply(...operants) {
        const glslVariable = new GlslMultiplication(operants).getGlslResultVariable();
        this.glslContext.addGlslVariable(glslVariable);
        return glslVariable;
    }
    divide(...operants) {
        const glslVariable = new GlslDivision(operants).getGlslResultVariable();
        this.glslContext.addGlslVariable(glslVariable);
        return glslVariable;
    }
    min(...parameters) {
        const operation = new GlslMethodMin(parameters);
        const glslVariable = operation.getGlslResultVariable();
        this.glslContext.addGlslVariable(glslVariable);
        // TODO: Beautify
        glslVariable.setDeclaringOperation(operation);
        return glslVariable;
    }
    max(...parameters) {
        const operation = new GlslMethodMax(parameters);
        const glslVariable = operation.getGlslResultVariable();
        this.glslContext.addGlslVariable(glslVariable);
        // TODO: Beautify
        glslVariable.setDeclaringOperation(operation);
        return glslVariable;
    }
    normalize(glslVariable) {
        const operation = new GlslNormalize(glslVariable);
        const glslResult = operation.getGlslResultVariable();
        this.glslContext.addGlslVariable(glslResult);
        // TODO: Beautify
        glslResult.setDeclaringOperation(operation);
        return glslResult;
    }
    getGrayscaleFloat(image, channelProportions = [1 / 3, 1 / 3, 1 / 3]) {
        const glslNumber = GlslNumber.loadFromGlslImageGrayscale(image, channelProportions);
        this.glslContext.addGlslVariable(glslNumber);
        return glslNumber;
    }
    getChannelFromImage(image, channel) {
        const glslNumber = GlslNumber.loadFromGlslImageChannel(image, channel);
        this.glslContext.addGlslVariable(glslNumber);
        return glslNumber;
    }
    getImageFromChannels(red, green, blue, alpha) {
        const glslImage = GlslImage.getFromChannels(red, green, blue, alpha);
        this.glslContext.addGlslVariable(glslImage);
        return glslImage;
    }
    renderToFramebuffer(glslImage) {
        return this.glslContext.renderFramebuffer(glslImage);
    }
    renderToPixelArray(glslImage) {
        return this.glslContext.renderPixelArray(glslImage);
    }
    renderToDataUrl(glslImage) {
        return this.glslContext.renderDataUrl(glslImage);
    }
    renderToImage(glslImage, onloadFunction) {
        return this.glslContext.renderImage(glslImage, onloadFunction);
    }
    purge() {
        this.glslContext.purge();
    }
}
class GlslFramebuffer {
}
class GlslVariable {
    constructor() {
        this.declaringOperation = null;
        this.glslName = GlslVariable.getUniqueName(this.getGlslVarType());
    }
    setDeclaringOperation(declaringOperation) {
        this.declaringOperation = declaringOperation;
    }
    hasDeclaringOperation() {
        return this.declaringOperation !== null;
    }
    static getUniqueName(prefix) {
        GlslVariable.uniqueNumber++;
        return prefix + "_" + String(GlslVariable.uniqueNumber);
    }
    getGlslName() {
        return this.glslName;
    }
}
GlslVariable.uniqueNumber = 0;
class GlslImage extends GlslVariable {
    constructor() {
        super(...arguments);
        this.glslTexture = null;
        this.declarationFromChannels = null;
    }
    static loadFromJsImage(image) {
        var glslImage = new GlslImage();
        glslImage.setGlslTexture(new GlslTexture(image));
        return glslImage;
    }
    static getFromChannels(red, green, blue, alpha) {
        var channelImage = new GlslImage();
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
    getGlslTexture() {
        return this.glslTexture;
    }
    setGlslTexture(glslTexture) {
        this.glslTexture = glslTexture;
    }
    getGlslVarType() {
        return "vec4" /* VEC4 */;
    }
    hasTexture() {
        return this.glslTexture !== null;
    }
    hasDeclarationFromChannels() {
        return this.declarationFromChannels !== null;
    }
    getGlslPreMainDeclaration() {
        if (this.hasTexture()) {
            return this.glslTexture.getGlslPreMainDeclaration();
        }
        return null;
    }
    getGlslMainDeclaration() {
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
    constructor(image) {
        this.image = image;
        this.samplerName = GlslVariable.getUniqueName("sampler");
    }
    getDimensions() {
        return [this.image.width, this.image.height];
    }
    getGlslPreMainDeclaration() {
        return "uniform sampler2D " + this.samplerName + ";";
    }
    getGlslMainDeclaration(outGlslName) {
        return ("vec4" /* VEC4 */ +
            " " +
            outGlslName +
            " = texture(" +
            this.samplerName +
            ", " +
            "uv" /* UV */ +
            ");");
    }
    loadTextureIntoShaderProgram(glContext, shaderProgram, textureUnit) {
        glContext.activeTexture(glContext.TEXTURE0 + textureUnit);
        glContext.bindTexture(glContext.TEXTURE_2D, this.createTextureInContext(glContext));
        glContext.uniform1i(glContext.getUniformLocation(shaderProgram, this.samplerName), textureUnit);
    }
    createTextureInContext(glContext) {
        var texture = glContext.createTexture();
        glContext.bindTexture(glContext.TEXTURE_2D, texture);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.LINEAR);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.LINEAR);
        glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, this.image);
        return texture;
    }
}
class GlslNumber extends GlslVariable {
    constructor() {
        super(...arguments);
        this.glslValue = null;
    }
    static loadFromGlslImageGrayscale(glslImage, channelProportions) {
        var glslNumber = new GlslNumber();
        glslNumber.glslValue =
            glslImage.getGlslName() +
                "." +
                "r" /* RED */ +
                "*" +
                channelProportions[0] +
                "+" +
                glslImage.getGlslName() +
                "." +
                "g" /* GREEN */ +
                "*" +
                channelProportions[1] +
                "+" +
                glslImage.getGlslName() +
                "." +
                "b" /* BLUE */ +
                "*" +
                channelProportions[2];
        return glslNumber;
    }
    static loadFromGlslImageChannel(glslImage, channel) {
        var glslNumber = new GlslNumber();
        glslNumber.glslValue = glslImage.getGlslName() + "." + channel;
        return glslNumber;
    }
    static loadFromJsNumber(number) {
        var glslNumber = new GlslNumber();
        glslNumber.glslValue = GlslNumber.getNumberAsString(number);
        return glslNumber;
    }
    static getNumberAsString(number) {
        if (Math.trunc(number) === number) {
            return number.toString() + ".0";
        }
        if (number.toString().includes("e-")) {
            console.warn(number + " is converted to zero.");
            return "0.0";
        }
        return number.toString();
    }
    hasValueRepresentation() {
        return this.glslValue !== null;
    }
    getGlslName() {
        if (this.hasValueRepresentation()) {
            return this.glslValue;
        }
        return super.getGlslName();
    }
    getGlslVarType() {
        return "float" /* FLOAT */;
    }
    getGlslPreMainDeclaration() {
        return null;
    }
    getGlslMainDeclaration() {
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
class GlslOperation {
    constructor(parameters) {
        this.parameters = parameters;
        this.glslResult = this.createGlslResultVariable();
        this.glslResult.setDeclaringOperation(this);
    }
    getGlslResultVariable() {
        return this.glslResult;
    }
}
class GlslArithmeticOperation extends GlslOperation {
    constructor(parameters) {
        super(parameters);
    }
    getGlslExpression() {
        var operantNames = [];
        for (var i = 0; i < this.parameters.length; i++) {
            var addendName = this.parameters[i].getGlslName();
            if (this.parameters[i].getGlslVarType() === "float" /* FLOAT */ &&
                this.anyIsImage()) {
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
        return (this.glslResult.getGlslVarType() +
            " " +
            this.glslResult.getGlslName() +
            " = " +
            operantNames.join(" " + this.getGlslOperator() + " ") +
            ";");
    }
    getGlslVariables() {
        var allGlslVariables = [];
        for (var i = 0; i < this.parameters.length; i++) {
            allGlslVariables.push(this.parameters[i]);
        }
        allGlslVariables.push(this.glslResult);
        return allGlslVariables;
    }
    anyIsImage() {
        for (var i = 0; i < this.parameters.length; i++) {
            if (this.parameters[i].getGlslVarType() === "vec4" /* VEC4 */) {
                return true;
            }
        }
        return false;
    }
    createGlslResultVariable() {
        if (this.anyIsImage()) {
            return new GlslImage();
        }
        return new GlslNumber();
    }
    isValidOperation() {
        return true;
    }
}
class GlslAddition extends GlslArithmeticOperation {
    getGlslOperator() {
        return GlslAddition.operator;
    }
}
GlslAddition.operator = "+";
class GlslSubstraction extends GlslArithmeticOperation {
    getGlslOperator() {
        return GlslSubstraction.operator;
    }
}
GlslSubstraction.operator = "-";
class GlslMultiplication extends GlslArithmeticOperation {
    constructor() {
        super(...arguments);
        this.operator = "*";
    }
    getGlslOperator() {
        return this.operator;
    }
}
class GlslDivision extends GlslArithmeticOperation {
    constructor() {
        super(...arguments);
        this.operator = "/";
    }
    getGlslOperator() {
        return this.operator;
    }
    isValidOperation() {
        for (var i = 0; i < this.parameters.length; i++) {
            if (this.parameters[i].getGlslVarType() === "float" /* FLOAT */) {
                for (var j = i; j < this.parameters.length; j++) {
                    if (this.parameters[j].getGlslVarType() === "vec4" /* VEC4 */) {
                        console.error("Value of type float can not be divided by value of type vec4.");
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
class GlslMethod extends GlslOperation {
    constructor(parameters) {
        super(parameters);
        this.parameters = parameters;
        this.glslResult = this.createGlslResultVariable();
    }
    isValidOperation() {
        return true;
    }
    createGlslResultVariable() {
        if (this.parameters[0].getGlslVarType() === "float" /* FLOAT */) {
            return new GlslNumber();
        }
        else if (this.parameters[0].getGlslVarType() === "vec4" /* VEC4 */) {
            return new GlslImage();
        }
    }
    getGlslVariables() {
        var allGlslVariables = [];
        for (var i = 0; i < this.parameters.length; i++) {
            allGlslVariables.push(this.parameters[i]);
        }
        allGlslVariables.push(this.glslResult);
        return allGlslVariables;
    }
}
class GlslNormalize extends GlslMethod {
    constructor(parameter) {
        super([parameter]);
    }
    getGlslExpression() {
        return (this.getGlslResultVariable().getGlslVarType() +
            " " +
            this.getGlslResultVariable().getGlslName() +
            " = normalize(" +
            this.parameters[0].getGlslName() +
            ");");
    }
}
class GlslMethodComparison extends GlslMethod {
    constructor(parameters) {
        super(parameters);
    }
    getGlslExpressionOfMethodName(methodName) {
        if (this.parameters !== null) {
            var paramExpressions = [];
            for (var i = 0; i < this.parameters.length; i++) {
                paramExpressions.push(this.parameters[i].getGlslName());
            }
            return (this.getGlslResultVariable().getGlslVarType() +
                " " +
                this.getGlslResultVariable().getGlslName() +
                " = " +
                this.getGlslExpressionOfParams(methodName, paramExpressions) +
                ";");
        }
        else {
            console.warn("parameters of method are null");
            return null;
        }
    }
    getGlslExpressionOfParams(methodName, params) {
        if (params.length === 1) {
            return params[0];
        }
        else if (params.length === 2) {
            return methodName + "(" + params[0] + ", " + params[1] + ")";
        }
        else {
            return (methodName +
                "(" +
                params.pop() +
                ", " +
                this.getGlslExpressionOfParams(methodName, params) +
                ")");
        }
    }
    isValidOperation() {
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
    constructor(parameters) {
        super(parameters);
    }
    getGlslExpression() {
        return this.getGlslExpressionOfMethodName(GlslMethodMin.methodName);
    }
}
GlslMethodMin.methodName = "min";
class GlslMethodMax extends GlslMethodComparison {
    constructor(parameters) {
        super(parameters);
    }
    getGlslExpression() {
        return this.getGlslExpressionOfMethodName(GlslMethodMax.methodName);
    }
}
GlslMethodMax.methodName = "max";
//class GlslMethodSqrt extends GlslMethod {}
//class GlslCondition extends GlslMethod {}
class GlslShaderSourceGenerator {
    constructor() {
        this.floatPrecision = "high" + "p";
        this.glslVariables = [];
    }
    checkIfGlslVariableExists(glslVariable) {
        return this.glslVariables.includes(glslVariable);
    }
    addGlslVariable(glslVariable) {
        //if (!this.checkIfGlslVariableExists(glslVariable)) {
        this.glslVariables.push(glslVariable);
        //}
    }
    getGlslTextures() {
        var glslTextures = [];
        for (var i = 0; i < this.glslVariables.length; i++) {
            if (this.glslVariables[i] instanceof GlslImage) {
                var glslImage = this.glslVariables[i];
                if (glslImage.hasTexture()) {
                    glslTextures.push(glslImage.getGlslTexture());
                }
            }
        }
        return glslTextures;
    }
    getGlslVertexSource() {
        return [
            "#version 300 es",
            "",
            "in vec3 " + "pos" /* POS */ + ";",
            "in vec2 " + "tex" /* TEX */ + ";",
            "",
            "out vec2 " + "uv" /* UV */ + ";",
            "",
            "void main() {",
            " " + "uv" /* UV */ + " = " + "tex" /* TEX */ + ";",
            " gl_Position = vec4(" + "pos" /* POS */ + ", 1.0);",
            "}",
        ].join("\n");
    }
    getGlslFragmentSource(resultImage) {
        return [
            this.getGlslPreFragmentShaderSource(),
            this.getGlslFragmentShaderPreMainDeclarationSource(),
            "\nvoid main() {\n",
            this.getGlslFragmentShaderMainDeclarationSource(),
            "fragColor" /* OUT */ + " = " + resultImage.getGlslName() + ";",
            "}",
        ].join("\n");
    }
    getGlslPreFragmentShaderSource() {
        return [
            "#version 300 es",
            "precision " + this.floatPrecision + " float;",
            "",
            "in vec2 " + "uv" /* UV */ + ";",
            "out vec4 " + "fragColor" /* OUT */ + ";",
        ].join("\n");
    }
    getGlslFragmentShaderPreMainDeclarationSource() {
        var source = "";
        for (var i = 0; i < this.glslVariables.length; i++) {
            const varSource = this.glslVariables[i].getGlslPreMainDeclaration(this);
            if (varSource !== null) {
                source += varSource + "\n";
            }
        }
        return source;
    }
    getGlslFragmentShaderMainDeclarationSource() {
        var source = "";
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
    constructor(width, height) {
        this.shaderFinished = false;
        this.resultPixelArray = null;
        this.resultDataUrl = null;
        this.resultImage = null;
        this.shaderSourceGenerator = new GlslShaderSourceGenerator();
        this.createGlContext(width, height);
        this.resultPixelArray = new Uint8Array(this.glCanvas.width * this.glCanvas.height * 4);
    }
    addGlslVariable(glslVariable) {
        this.shaderSourceGenerator.addGlslVariable(glslVariable);
    }
    renderFramebuffer(image) {
        throw new Error("Method not implemented.");
    }
    renderImage(image, onloadFunction) {
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
    renderDataUrl(image) {
        if (!this.shaderFinished) {
            this.runShader(image);
        }
        if (this.resultDataUrl === null) {
            this.resultDataUrl = this.glCanvas.toDataURL();
        }
        return this.resultDataUrl;
    }
    renderPixelArray(image) {
        if (!this.shaderFinished) {
            this.runShader(image);
        }
        return this.resultPixelArray;
    }
    runShader(resultImage) {
        this.glShaderProgram = this.createShaderProgram(resultImage);
        this.glContext.useProgram(this.glShaderProgram);
        this.loadGlslTextures(this.shaderSourceGenerator.getGlslTextures());
        uiLog("Rendering on gpu.");
        var framePositionLocation = this.glContext.getAttribLocation(this.glShaderProgram, "pos" /* POS */);
        var frameTextureLocation = this.glContext.getAttribLocation(this.glShaderProgram, "tex" /* TEX */);
        const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
        const frameVertices = [-1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1];
        const frameTextCoords = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];
        var vaoFrame = this.glContext.createVertexArray();
        this.glContext.bindVertexArray(vaoFrame);
        var vboFrameV = this.glContext.createBuffer();
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameV);
        this.glContext.bufferData(this.glContext.ARRAY_BUFFER, new Float32Array(frameVertices), this.glContext.STATIC_DRAW);
        this.glContext.vertexAttribPointer(framePositionLocation, 2, this.glContext.FLOAT, false, 2 * FLOAT_SIZE, 0);
        this.glContext.enableVertexAttribArray(framePositionLocation);
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);
        var vboFrameT = this.glContext.createBuffer();
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameT);
        this.glContext.bufferData(this.glContext.ARRAY_BUFFER, new Float32Array(frameTextCoords), this.glContext.STATIC_DRAW);
        this.glContext.vertexAttribPointer(frameTextureLocation, 2, this.glContext.FLOAT, false, 2 * FLOAT_SIZE, 0);
        this.glContext.enableVertexAttribArray(frameTextureLocation);
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);
        this.glContext.bindVertexArray(null);
        //this.glContext.useProgram(this.glShaderProgram);
        this.glContext.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        this.glContext.clearColor(0, 0, 0, 0);
        this.glContext.clear(this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT);
        this.glContext.blendFunc(this.glContext.SRC_ALPHA, this.glContext.ONE);
        this.glContext.enable(this.glContext.BLEND);
        this.glContext.disable(this.glContext.DEPTH_TEST);
        this.glContext.bindVertexArray(vaoFrame);
        this.glContext.drawArrays(this.glContext.TRIANGLES, 0, 6);
        this.glContext.bindVertexArray(null);
        this.glContext.readPixels(0, 0, this.glCanvas.width, this.glCanvas.height, this.glContext.RGBA, this.glContext.UNSIGNED_BYTE, this.resultPixelArray);
        this.glContext.flush();
        this.glContext.finish();
        this.shaderFinished = true;
    }
    createGlContext(width, height) {
        this.glCanvas = document.createElement("canvas");
        this.glCanvas.width = width;
        this.glCanvas.height = height;
        this.glContext = this.glCanvas.getContext("webgl2");
    }
    createShaderProgram(resultImage) {
        var vertexShader = this.glContext.createShader(this.glContext.VERTEX_SHADER);
        var fragmentShader = this.glContext.createShader(this.glContext.FRAGMENT_SHADER);
        const vertexShaderSource = this.shaderSourceGenerator.getGlslVertexSource();
        const fragmentShaderSource = this.shaderSourceGenerator.getGlslFragmentSource(resultImage);
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
    loadGlslTextures(glslTextures) {
        uiLog("Loading " + glslTextures.length + " image(s) for gpu.");
        for (var i = 0; i < glslTextures.length; i++) {
            glslTextures[i].loadTextureIntoShaderProgram(this.glContext, this.glShaderProgram, i);
        }
    }
    purge() {
        uiLog("Purging connection to gpu.");
        this.glContext.getExtension("WEBGL_lose_context").loseContext();
    }
}
