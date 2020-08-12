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
         for (
            var x = 0;
            x < this.dimensions[0];
            x += 100 / POINT_CLOUD_QUALITY_PERCENT
         ) {
            for (
               var y = 0;
               y < this.dimensions[1];
               y += 100 / POINT_CLOUD_QUALITY_PERCENT
            ) {
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
      this.zValues = Array(this.dimensions[0] * this.dimensions[1]).fill(null);

      var zLineOffset;
      for (var y = 0; y < this.dimensions[1]; y++) {
         zLineOffset = 0;
         for (var x = 0; x < this.dimensions[0]; x++) {
            const index = x + y * this.dimensions[0];
            const colorIndex = index * 4;

            const horizontalGradient = this.normalMap.getAsPixelArray()[
               colorIndex
            ]; // red channel (light from right)
            zLineOffset += horizontalGradient;
            this.zValues[index] = zLineOffset * this.depthFactor;
         }
      }

      for (var x = 0; x < this.dimensions[0]; x++) {
         zLineOffset = 0;
         for (var y = 0; y < this.dimensions[1]; y++) {
            const index = x + y * this.dimensions[0];
            const colorIndex = index * 4;

            const horizontalGradient = this.normalMap.getAsPixelArray()[
               colorIndex + 1
            ]; // green channel (light from top)
            zLineOffset += horizontalGradient;
            this.zValues[index] += zLineOffset * this.depthFactor;
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
      if (
         pixel[0] < 0 ||
         pixel[1] < 0 ||
         pixel[0] > this.dimensions[0] - 1 ||
         pixel[1] > this.dimensions[1] - 1
      ) {
         return false;
      }
      return true;
   }

   getGradientFromDegree(degree) {
      const radians = degree * DEGREE_TO_RADIANS_FACTOR;
      return [Math.cos(radians), Math.sin(radians)];
   }

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

   getPixelLine(outerStartPixel, sphericalDegree) {
      if (outerStartPixel == null) {
         return null;
      }

      const degree = this.getFrontalDegreeFromSphericalDegree(sphericalDegree);
      const gradient = this.getGradientFromDegree(degree);
      const nextPixelAndVector = this.getNextPixelAndVector(
         outerStartPixel,
         outerStartPixel,
         gradient
      );

      var nextPixel = nextPixelAndVector[0];
      var nextVector = nextPixelAndVector[1];

      if (this.isPixelIsInDimensions(nextPixel)) {
         const pixelLine = [];
         while (this.isPixelIsInDimensions(nextPixel)) {
            pixelLine.push(nextPixel);
            const nextValues = this.getNextPixelAndVector(
               nextPixel,
               nextVector,
               gradient
            );
            nextPixel = nextValues[0];
            nextVector = nextValues[1];
         }
         return pixelLine;
      } else {
         return null;
      }
   }
}
