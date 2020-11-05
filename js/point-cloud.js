"use strict";
class PointCloud {
    constructor(normalMap, dimensions, depthFactor, colorPixelArray) {
        this.normalMap = normalMap;
        this.depthFactor = depthFactor;
        this.colorPixelArray = colorPixelArray;
        this.dimensions = dimensions;
        this.zValues = null;
        this.objString = null;
    }
    downloadObj(filename) {
        filename += ".obj";
        var element = document.createElement("a");
        element.style.display = "none";
        var blob = new Blob([this.getAsObjString()], {
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
    getAsObjString() {
        if (this.objString == null) {
            this.gpuVertices = [];
            this.gpuVertexColors = [];
            this.getZValues();
            uiBaseLayer--;
            uiLog("Writing point cloud file string.");
            uiBaseLayer--;
            var objString = "";
            const SAMPLING_RATE_STEP = Math.round(100 / POINT_CLOUD_SAMPLING_RATE_PERCENT);
            for (var x = 0; x < this.dimensions[0]; x += SAMPLING_RATE_STEP) {
                for (var y = 0; y < this.dimensions[1]; y += SAMPLING_RATE_STEP) {
                    const index = x + y * this.dimensions[0];
                    if (!(this.getZValues()[index] == null)) {
                        const colorIndex = index * 4;
                        const z = this.getZValues()[index];
                        const r = this.colorPixelArray[colorIndex];
                        const g = this.colorPixelArray[colorIndex + 1];
                        const b = this.colorPixelArray[colorIndex + 2];
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
                        this.gpuVertices.push(x / this.dimensions[0] - 0.5, y / this.dimensions[0] - 0.5, z / this.dimensions[0] - 0.5);
                        this.gpuVertexColors.push(r / 255, g / 255, b / 255);
                    }
                }
            }
            this.objString = objString;
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
            new GlslFloat(0),
        ]);
        const gradientPixelArray = GlslRendering.render(result.getVector4()).getPixelArray();
        pointCloudShader.purge();
        uiBaseLayer--;
        uiLog("Calculating anisotropic integrals.");
        this.zValues = Array(this.dimensions[0] * this.dimensions[1]).fill(0);
        const Z_FACTOR = this.depthFactor / 4;
        const GRADIENT_SHIFT = -255 / 2;
        var zLineOffset;
        var zLineOffsetI;
        for (var y = 0; y < this.dimensions[1]; y++) {
            zLineOffset = 0;
            zLineOffsetI = 0;
            for (var x = 0; x < this.dimensions[0]; x++) {
                const xi = this.dimensions[0] - x - 1;
                const index = x + y * this.dimensions[0];
                const indexI = xi + y * this.dimensions[0];
                const baseColorIndex = index * 4;
                const baseColorIndexI = indexI * 4;
                const colorIndex = baseColorIndex + 0 /* RED */;
                const colorIndexI = baseColorIndexI + 0 /* RED */;
                const gradient = gradientPixelArray[colorIndex];
                const gradientI = gradientPixelArray[colorIndexI];
                zLineOffset += gradient + GRADIENT_SHIFT;
                zLineOffsetI += gradientI + GRADIENT_SHIFT;
                this.zValues[index] += zLineOffsetI - zLineOffset;
            }
        }
        for (var x = 0; x < this.dimensions[0]; x++) {
            zLineOffset = 0;
            zLineOffsetI = 0;
            for (var y = 0; y < this.dimensions[1]; y++) {
                const yi = this.dimensions[1] - y - 1;
                const index = x + y * this.dimensions[0];
                const indexI = x + yi * this.dimensions[0];
                const baseColorIndex = index * 4;
                const baseColorIndexI = indexI * 4;
                const colorIndex = baseColorIndex + 1 /* GREEN */;
                const colorIndexI = baseColorIndexI + 1 /* GREEN */;
                const gradient = gradientPixelArray[colorIndex];
                const gradientI = gradientPixelArray[colorIndexI];
                zLineOffset += gradient + GRADIENT_SHIFT;
                zLineOffsetI += gradientI + GRADIENT_SHIFT;
                this.zValues[index] += zLineOffsetI - zLineOffset;
                this.zValues[index] *= Z_FACTOR;
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
            pixel[0] > this.dimensions[0] - 1 ||
            pixel[1] > this.dimensions[1] - 1) {
            return false;
        }
        return true;
    }
    renderPreviewTo(previewDiv) {
        var pointCloudRenderer = new PointCloudRenderer(this.gpuVertices, this.gpuVertexColors, previewDiv);
    }
}
class PointCloudRenderer {
    constructor(gpuVertices, gpuVertexColors, div) {
        this.rotationSpeed = 0.001;
        this.rotation = 0;
        this.deltaTime = 0;
        this.then = 0;
        this.gpuVertices = gpuVertices;
        this.gpuVertexColors = gpuVertexColors;
        this.div = div;
        this.vertexCount = gpuVertices.length / 3;
        this.initializeContext();
    }
    initializeContext() {
        this.canvas = document.createElement("canvas");
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "50%";
        this.canvas.style.left = "50%";
        this.canvas.style.transform = "translate(-50%, -50%)";
        this.canvas.style.transition = "all 1s";
        //this.canvas.style.height = "100%";
        //this.canvas.style.width = "100%";
        this.div.appendChild(this.canvas);
        /*================Creating a canvas=================*/
        this.gl = this.canvas.getContext("webgl2");
        /*==========Defining and storing the geometry=======*/
        var vertices = this.gpuVertices;
        var colors = this.gpuVertexColors;
        var vertexCount = vertices.length / 3;
        // Create an empty buffer object to store the vertex buffer
        var vertex_buffer = this.gl.createBuffer();
        //Bind appropriate array buffer to it
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertex_buffer);
        // Pass the vertex data to the buffer
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        // Unbind the buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        var color_buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, color_buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        /*=========================Shaders========================*/
        var xRot = -90;
        xRot *= Math.PI / 180;
        // vertex shader source code
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
            " gl_Position = vec4(pos.x, pos.y + 0.5, pos.z, 1.0);",
            " gl_PointSize = 1.0;",
            "}",
        ].join("\n");
        // Create a vertex shader object
        var vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        // Attach vertex shader source code
        this.gl.shaderSource(vertShader, vertCode);
        // Compile the vertex shader
        this.gl.compileShader(vertShader);
        // fragment shader source code
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
        // Create fragment shader object
        var fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        // Attach fragment shader source code
        this.gl.shaderSource(fragShader, fragCode);
        // Compile the fragment shader
        this.gl.compileShader(fragShader);
        // Create a shader program object to store
        // the combined shader program
        var shaderProgram = this.gl.createProgram();
        // Attach a vertex shader
        this.gl.attachShader(shaderProgram, vertShader);
        // Attach a fragment shader
        this.gl.attachShader(shaderProgram, fragShader);
        // Link both programs
        this.gl.linkProgram(shaderProgram);
        // Use the combined shader program object
        this.gl.useProgram(shaderProgram);
        /*======== Associating shaders to buffer objects ========*/
        // Bind vertex buffer object
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertex_buffer);
        // Get the attribute location
        var coordinates = this.gl.getAttribLocation(shaderProgram, "coordinates");
        // Point an attribute to the currently bound VBO
        this.gl.vertexAttribPointer(coordinates, 3, this.gl.FLOAT, false, 0, 0);
        // Enable the attribute
        this.gl.enableVertexAttribArray(coordinates);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, color_buffer);
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
        if (this.div.clientWidth > this.div.clientHeight) {
            this.canvas.width = this.div.clientHeight * 2;
            this.canvas.height = this.div.clientHeight * 2;
        }
        else {
            this.canvas.width = this.div.clientWidth * 2;
            this.canvas.height = this.div.clientWidth * 2;
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
