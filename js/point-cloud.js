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
            this.getZValues();
            console.log("Writing point cloud file string.");
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
        console.log("Integrating normal map.");
        const ic = new ImageCalc();
        const red = ic.getChannel(this.normalMap.getAsJsImageObject(), "r");
        const green = ic.getChannel(this.normalMap.getAsJsImageObject(), "g");
        const blue = ic.getChannel(this.normalMap.getAsJsImageObject(), "b");
        ic.setResultChannels([
            ic.divide(red, ic.multiply(blue, 8)),
            ic.divide(green, ic.multiply(blue, 8)),
            0,
            1,
        ]);
        const gradientPixelArray = ic.getResultAsPixelArray();
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
                const colorIndex = baseColorIndex + COLOR_CHANNELS.indexOf("r");
                const colorIndexI = baseColorIndexI + COLOR_CHANNELS.indexOf("r");
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
                const colorIndex = baseColorIndex + COLOR_CHANNELS.indexOf("g");
                const colorIndexI = baseColorIndexI + COLOR_CHANNELS.indexOf("g");
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
    /*getGradientFromDegree(degree) {
       const radians = degree * DEGREE_TO_RADIANS_FACTOR;
       return [Math.cos(radians), Math.sin(radians)];
    }*/
    getFrontalDegreeFromSphericalDegree(sphericalDegree) {
        switch (sphericalDegree) {
            case NORTH:
                return 0;
            case SOUTH:
                return 180;
            case NORTH_EAST:
                return 45;
            case SOUTH_WEST:
                return 225;
            case WEST:
                return 270;
            case EAST:
                return 90;
            case SOUTH_EAST:
                return 135;
            case NORTH_WEST:
                return 315;
            default:
                console.warn("Spherical degree not known!");
                return null;
        }
    }
}
