"use strict";
class PointCloud {
    constructor(normalMap, width, height, depthFactor, maxVertexCount) {
        this.meshFaces = [];
        this.maxError = 0;
        this.gpuVertexNormalColors = [];
        this.gpuVertexErrorColors = [];
        this.normalMap = normalMap;
        this.depthFactor = depthFactor;
        this.width = width;
        this.height = height;
        this.zValues = null;
        this.objString = null;
        this.maxVertexCount = maxVertexCount;
    }
    downloadObj(filename, vertexColorArray) {
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
    getAsObjString(vertexColorArray) {
        if (this.objString == null) {
            this.gpuVertices = [];
            this.gpuVertexAlbedoColors = [];
            this.getZValues();
            uiBaseLayer--;
            uiLog("Writing point cloud file string.");
            var objString = "";
            var objFacesString = "";
            var samplingRate = 100;
            while (this.width * this.height * samplingRate * 0.01 >
                this.maxVertexCount) {
                samplingRate -= 1;
            }
            if (samplingRate !== 100) {
                samplingRate++;
                uiLog("Reduced point cloud resolution to " +
                    String(samplingRate) +
                    " percent. (" +
                    String(Math.round(this.width * this.height * samplingRate * 0.01)) +
                    " vertices.)");
            }
            uiBaseLayer--;
            const SAMPLING_RATE_STEP = 100 / samplingRate;
            console.log(SAMPLING_RATE_STEP);
            for (var x = 0; x < this.width; x += SAMPLING_RATE_STEP) {
                for (var y = 0; y < this.height; y += SAMPLING_RATE_STEP) {
                    const rx = Math.round(x);
                    const ry = Math.round(y);
                    const index = rx + ry * this.width;
                    if (!(this.getZValues()[index] == null)) {
                        const colorIndex = index * 4;
                        const z = this.getZValues()[index];
                        var r, g, b;
                        const currentErrorColor = this.errorValues[index] / this.maxError;
                        this.gpuVertexErrorColors.push(currentErrorColor, 1 - currentErrorColor, 0);
                        r = vertexColorArray[colorIndex];
                        g = vertexColorArray[colorIndex + 1];
                        b = vertexColorArray[colorIndex + 2];
                        const rNormal = this.normalMap.getAsPixelArray()[colorIndex];
                        const gNormal = this.normalMap.getAsPixelArray()[colorIndex + 1];
                        const bNormal = this.normalMap.getAsPixelArray()[colorIndex + 2];
                        objString +=
                            "v " +
                                rx +
                                " " +
                                ry +
                                " " +
                                z +
                                " " +
                                r +
                                " " +
                                g +
                                " " +
                                b +
                                "\n";
                        this.gpuVertices.push(rx / this.width - 0.5, ry / this.width - 0.5, z / this.width - 0.5);
                        this.gpuVertexAlbedoColors.push(r / 255, g / 255, b / 255);
                        this.gpuVertexNormalColors.push(rNormal / 255, gNormal / 255, bNormal / 255);
                    }
                }
            }
            console.log(this.gpuVertices.length / 3);
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
        const red = glslNormalMap.channel(0 /* RED */);
        const green = glslNormalMap.channel(1 /* GREEN */);
        const blue = glslNormalMap.channel(2 /* BLUE */);
        const result = new GlslVector3([
            red.divideFloat(blue),
            green.divideFloat(blue),
            blue,
        ]);
        const gradientPixelArray = GlslRendering.render(result.getVector4()).getPixelArray();
        pointCloudShader.purge();
        uiBaseLayer--;
        uiLog("Calculating anisotropic integrals.");
        this.zValues = Array(this.width * this.height).fill(0);
        var measureDenominator = 7;
        var leftZValues = Array(Math.round(this.width / measureDenominator)).fill(0);
        var rightZValues = Array(Math.round(this.width / measureDenominator)).fill(0);
        var topZValues = Array(Math.round(this.width / measureDenominator)).fill(0);
        var bottomZValues = Array(Math.round(this.width / measureDenominator)).fill(0);
        this.errorValues = Array(this.width * this.height).fill(0);
        var xZValues = Array(this.width * this.height).fill(0);
        var yZValues = Array(this.width * this.height).fill(0);
        const Z_FACTOR = -this.depthFactor / 4;
        const GRADIENT_SHIFT = -(255 / 2);
        var zLineOffset;
        var zLineOffsetI;
        for (var y = 0; y < this.height; y++) {
            zLineOffset = 0;
            zLineOffsetI = 0;
            for (var x = 0; x < this.width; x++) {
                const index = x + y * this.width;
                const baseColorIndex = index * 4;
                const colorIndex = baseColorIndex + 0 /* RED */;
                const maskIndex = baseColorIndex + 2 /* BLUE */;
                var maskPassed;
                if (IS_WEBCAM) {
                    maskPassed =
                        gradientPixelArray[maskIndex] >
                            255 * (WEBCAM_MASK_PERCENT / 100);
                }
                else {
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
                        const currentError = Math.abs(xZValues[index] - zLineOffset);
                        const combinedCurrentError = currentError + this.errorValues[index];
                        this.errorValues[index] = combinedCurrentError;
                        this.maxError = Math.max(this.maxError, combinedCurrentError);
                    }
                    else {
                        xZValues[index] = zLineOffset;
                    }
                    if (y === Math.round(this.height / 2) &&
                        x / measureDenominator === Math.round(x / measureDenominator)) {
                        leftZValues[x / measureDenominator] = zLineOffset;
                    }
                    this.zValues[index] += zLineOffset;
                }
                else {
                    this.zValues[index] = null;
                    zLineOffset = 0;
                }
                const xi = this.width - x - 1;
                const indexI = xi + y * this.width;
                const baseColorIndexI = indexI * 4;
                if (this.zValues[indexI] !== null) {
                    const colorIndexI = baseColorIndexI + 0 /* RED */;
                    const gradientI = gradientPixelArray[colorIndexI] + GRADIENT_SHIFT;
                    zLineOffsetI += gradientI * -Z_FACTOR;
                    if (xZValues[indexI] !== 0) {
                        const currentError = Math.abs(xZValues[indexI] - zLineOffsetI);
                        const combinedCurrentError = currentError + this.errorValues[indexI];
                        this.errorValues[indexI] = combinedCurrentError;
                        this.maxError = Math.max(this.maxError, combinedCurrentError);
                    }
                    else {
                        xZValues[indexI] = zLineOffsetI;
                    }
                    if (y === Math.round(this.height / 2) &&
                        xi / measureDenominator ===
                            Math.round(xi / measureDenominator)) {
                        rightZValues[xi / measureDenominator] = zLineOffset;
                    }
                    this.zValues[indexI] += zLineOffsetI;
                }
                else {
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
                const colorIndex = baseColorIndex + 1 /* GREEN */;
                const maskIndex = baseColorIndex + 2 /* BLUE */;
                var maskPassed;
                if (IS_WEBCAM) {
                    maskPassed =
                        gradientPixelArray[maskIndex] >
                            255 * (WEBCAM_MASK_PERCENT / 100);
                }
                else {
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
                        const currentError = Math.abs(yZValues[index] - zLineOffset);
                        const combinedCurrentError = currentError + this.errorValues[index];
                        this.errorValues[index] = combinedCurrentError;
                        this.maxError = Math.max(this.maxError, combinedCurrentError);
                    }
                    else {
                        yZValues[index] = zLineOffset;
                    }
                    if (y === Math.round(this.height / 2) &&
                        x / measureDenominator === Math.round(x / measureDenominator)) {
                        topZValues[x / measureDenominator] = zLineOffset;
                    }
                    this.zValues[index] += zLineOffset;
                }
                else {
                    this.zValues[index] = null;
                    zLineOffset = 0;
                }
                const yi = this.height - y - 1;
                const indexI = x + yi * this.width;
                const baseColorIndexI = indexI * 4;
                if (this.zValues[indexI] !== null) {
                    const colorIndexI = baseColorIndexI + 1 /* GREEN */;
                    const gradientI = gradientPixelArray[colorIndexI] + GRADIENT_SHIFT;
                    zLineOffsetI += gradientI * -Z_FACTOR;
                    if (yZValues[indexI] !== 0) {
                        const currentError = Math.abs(yZValues[indexI] - zLineOffsetI);
                        const combinedCurrentError = currentError + this.errorValues[indexI];
                        this.errorValues[indexI] = combinedCurrentError;
                        this.maxError = Math.max(this.maxError, combinedCurrentError);
                    }
                    else {
                        yZValues[indexI] = zLineOffsetI;
                    }
                    if (yi === Math.round(this.height / 2) &&
                        x / measureDenominator === Math.round(x / measureDenominator)) {
                        bottomZValues[x / measureDenominator] = zLineOffsetI;
                    }
                    this.zValues[indexI] += zLineOffsetI;
                }
                else {
                    this.zValues[indexI] = null;
                    zLineOffsetI = 0;
                }
            }
        }
        if (POINT_CLOUD_TO_MESH) {
            for (var x = 1; x < 10; x++) {
                for (var y = 1; y < 10; y++) {
                    const i = x + y * this.width;
                    const thisVertex = i;
                    const rightVertex = i + 1;
                    const bottomVertex = i + this.width;
                    const topRightVertex = i - this.width + 1;
                    const firstFace = [
                        thisVertex,
                        rightVertex,
                        bottomVertex,
                    ];
                    const secondFace = [
                        thisVertex,
                        topRightVertex,
                        rightVertex,
                    ];
                    this.meshFaces.push(firstFace, secondFace);
                }
            }
        }
    }
    getNextPixelAndVector(currentPixel, currentVector, gradient) {
        var nextPixel = currentPixel;
        var nextVector = currentVector;
        while (nextPixel == currentPixel) {
            nextVector[0] += gradient[0];
            nextVector[1] += gradient[1];
            nextPixel = [Math.round(nextVector[0]), Math.round(nextVector[1])];
        }
        return [nextPixel, nextVector];
    }
    isPixelIsInDimensions(pixel) {
        if (isNaN(pixel[0]) || isNaN(pixel[0])) {
            return false;
        }
        if (pixel[0] == null || pixel[1] == null) {
            return false;
        }
        if (pixel[0] < 0 ||
            pixel[1] < 0 ||
            pixel[0] > this.width - 1 ||
            pixel[1] > this.height - 1) {
            return false;
        }
        return true;
    }
    getGpuVertices() {
        return this.gpuVertices;
    }
    getGpuVertexAlbedoColors() {
        return this.gpuVertexAlbedoColors;
    }
    getGpuVertexNormalColors() {
        return this.gpuVertexNormalColors;
    }
    getGpuVertexErrorColors() {
        return this.gpuVertexErrorColors;
    }
}
class PointCloudRenderer {
    constructor(pointCloud, previewDiv) {
        this.vertexSize = 2;
        this.rotationSpeed = 0.001;
        this.rotation = 0;
        this.deltaTime = 0;
        this.then = 0;
        this.pointCloud = pointCloud;
        this.div = previewDiv;
        this.vertexCount = this.pointCloud.getGpuVertices().length / 3;
        this.initializeContext();
    }
    updateVertexColor(newColor) {
        var colors;
        switch (newColor) {
            case "albedo" /* ALBEDO */: {
                colors = this.pointCloud.getGpuVertexAlbedoColors();
                console.log("updating vertex color to albedo...");
                break;
            }
            case "normal_mapping" /* NORMAL_MAPPING */: {
                colors = this.pointCloud.getGpuVertexNormalColors();
                console.log("updating vertex color to normal mapping...");
                break;
            }
            case "error-proneness" /* ERROR_PRONENESS */: {
                colors = this.pointCloud.getGpuVertexErrorColors();
                console.log("updating vertex color to error proneness...");
                break;
            }
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }
    initializeContext() {
        this.canvas = document.createElement("canvas");
        this.canvas.style.transition = "all 1s";
        this.div.appendChild(this.canvas);
        this.gl = this.canvas.getContext("webgl2");
        document.body.addEventListener("resize", this.refreshViewportSize.bind(this));
        var vertices = this.pointCloud.getGpuVertices();
        var colors = this.pointCloud.getGpuVertexAlbedoColors();
        var vertex_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertex_buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.vertexColorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
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
            " gl_PointSize = " +
                GlslFloat.getJsNumberAsString(this.vertexSize) +
                ";",
            "}",
        ].join("\n");
        var vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertShader, vertCode);
        this.gl.compileShader(vertShader);
        var fragCode = [
            "#version 300 es",
            "precision " + "mediump" /* MEDIUM */ + " float;",
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
    refreshViewportSize() {
        if (this.canvas.width > this.canvas.height) {
            this.canvas.width = this.div.clientHeight;
            this.canvas.height = this.div.clientHeight;
        }
        else {
            this.canvas.width = this.div.clientWidth;
            this.canvas.height = this.div.clientWidth;
        }
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    render(now) {
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
