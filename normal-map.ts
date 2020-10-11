"use strict";

class NormalMap {
   private dataset: Dataset;
   private jsImageObject: HTMLImageElement;
   private pixelArray: Uint8Array;
   private dataUrl: string;

   constructor(dataset: Dataset) {
      this.dataset = dataset;
      this.jsImageObject = null;
      this.pixelArray = null;
      this.dataUrl = null;
   }

   downloadAsImage(fileName: string) {
      fileName += ".png";
      var element = document.createElement("a");
      element.setAttribute("href", this.getAsDataUrl());
      element.setAttribute("download", fileName);

      element.style.display = "none";
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
   }

   getAsDataUrl() {
      if (this.dataUrl !== null) {
         return this.dataUrl;
      }
      console.warn("Call calculate first.");
      return null;
   }

   getAsPixelArray() {
      if (this.pixelArray !== null) {
         return this.pixelArray;
      }
      console.warn("Call calculate first.");
      return null;
   }

   getAsJsImageObject() {
      if (this.jsImageObject !== null) {
         return this.jsImageObject;
      }
      console.warn("Call calculate first.");
      return null;
   }

   calculate(onloadFunction) {
      const ic = new ImageCalc();

      var images: GlslVariable[] = [];
      for (var i = 0; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
         images.push(
            ic.loadImage(this.dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[i]))
         );
      }

      const maxImage = ic.max(...images);
      const minImage = ic.min(...images);

      var all = maxImage;
      //var front =ic.divide(minImage, all);

      var north = ic.getGrayscaleFloat(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(NORTH)]
      );
      var northeast = ic.getGrayscaleFloat(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(NORTH_EAST)]
      );
      var east = ic.getGrayscaleFloat(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(EAST)]
      );
      var southeast = ic.getGrayscaleFloat(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(SOUTH_EAST)]
      );
      var south = ic.getGrayscaleFloat(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(SOUTH)]
      );
      var southwest = ic.getGrayscaleFloat(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(SOUTH_WEST)]
      );
      var west = ic.getGrayscaleFloat(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(WEST)]
      );
      var northwest = ic.getGrayscaleFloat(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(NORTH_WEST)]
      );

      const hasNoLightImage = this.dataset.getImage(null) !== null;

      if (hasNoLightImage) {
         const noLightImage = ic.loadImage(this.dataset.getImage(null));
         all = ic.substract(all, noLightImage);
         //front = ic.substract(front, noLightImage);

         north = ic.substract(north, noLightImage);
         northeast = ic.substract(northeast, noLightImage);
         east = ic.substract(east, noLightImage);
         southeast = ic.substract(southeast, noLightImage);
         south = ic.substract(south, noLightImage);
         southwest = ic.substract(southwest, noLightImage);
         west = ic.substract(west, noLightImage);
         northwest = ic.substract(northwest, noLightImage);
      }

      north = ic.divide(north, all);
      northeast = ic.divide(northeast, all);
      east = ic.divide(east, all);
      southeast = ic.divide(southeast, all);
      south = ic.divide(south, all);
      southwest = ic.divide(southwest, all);
      west = ic.divide(west, all);
      northwest = ic.divide(northwest, all);

      const COMBINATIONS: [number, number, number][] = [
         [WEST, NORTH, EAST],
         [WEST, SOUTH, EAST],
         [SOUTH, WEST, NORTH],
         [SOUTH, EAST, NORTH],
         [NORTH_WEST, NORTH_EAST, SOUTH_EAST],
         [NORTH_WEST, SOUTH_WEST, SOUTH_EAST],
         [NORTH_EAST, SOUTH_EAST, SOUTH_WEST],
         [NORTH_EAST, NORTH_WEST, SOUTH_WEST],
      ];

      uiBaseLayer++;
      uiLog("Calculating anisotropic reflection matrices.");
      uiBaseLayer--;
      var normalVectors: GlslVariable[] = [];
      for (var i = 0; i < COMBINATIONS.length; i++) {
         normalVectors.push(
            this.getAnisotropicNormalMapVector(ic, images, ...COMBINATIONS[i])
         );
      }

      var normalVector = ic.divide(
         ic.add(...normalVectors),
         ic.loadNumber(normalVectors.length)
      );

      const result = ic.getImageFromChannels(
         ic.getChannelFromImage(normalVector, COLOR_CHANNEL.RED),
         ic.getChannelFromImage(normalVector, COLOR_CHANNEL.GREEN),
         ic.getChannelFromImage(normalVector, COLOR_CHANNEL.BLUE),
         ic.loadNumber(1)
      );

      this.pixelArray = ic.renderToPixelArray(result);
      this.dataUrl = ic.renderToDataUrl(result);
      this.jsImageObject = ic.renderToImage(result, onloadFunction);

      ic.purge();
   }

   private getAnisotropicNormalMapVector(
      ic: ImageCalc,
      images: GlslVariable[],
      originAzimuthalAngle: number,
      orthogonalAzimuthalAngle: number,
      oppositeAzimuthalAngle: number
   ) {
      const lights = this.getLights(
         originAzimuthalAngle,
         orthogonalAzimuthalAngle,
         oppositeAzimuthalAngle
      ).matrix;

      const reflectionR = ic.getChannelFromImage(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(originAzimuthalAngle)],
         COLOR_CHANNEL.R
      );

      const reflectionG = ic.getChannelFromImage(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(orthogonalAzimuthalAngle)],
         COLOR_CHANNEL.G
      );

      const reflectionB = ic.getChannelFromImage(
         images[LIGHTING_AZIMUTHAL_ANGLES.indexOf(oppositeAzimuthalAngle)],
         COLOR_CHANNEL.B
      );

      const red = ic.add(
         ic.multiply(reflectionR, ic.loadNumber(lights[0][0])),
         ic.multiply(reflectionR, ic.loadNumber(lights[0][1])),
         ic.multiply(reflectionR, ic.loadNumber(lights[0][2]))
      );

      const green = ic.add(
         ic.multiply(reflectionG, ic.loadNumber(lights[1][0])),
         ic.multiply(reflectionG, ic.loadNumber(lights[1][1])),
         ic.multiply(reflectionG, ic.loadNumber(lights[1][2]))
      );

      const blue = ic.add(
         ic.multiply(reflectionB, ic.loadNumber(lights[2][0])),
         ic.multiply(reflectionB, ic.loadNumber(lights[2][1])),
         ic.multiply(reflectionB, ic.loadNumber(lights[2][2]))
      );

      console.warn("Check if normalizing is essential.");
      return ic.getImageFromChannels(red, green, blue, ic.loadNumber(1));
   }

   private getLights(
      originAzimuthalAngle: number,
      orthogonalAzimuthalAngle: number,
      oppositeAzimuthalAngle: number
   ) {
      const originLightDir = this.getLightDirectionVector(originAzimuthalAngle);
      const orthogonalLightDir = this.getLightDirectionVector(
         orthogonalAzimuthalAngle
      );
      const oppositeLightDir = this.getLightDirectionVector(
         oppositeAzimuthalAngle
      );

      return new Matrix3x3([
         [originLightDir.x, originLightDir.y, originLightDir.z],
         [orthogonalLightDir.x, orthogonalLightDir.y, orthogonalLightDir.z],
         [oppositeLightDir.x, oppositeLightDir.y, oppositeLightDir.z],
      ]).inverse();
   }

   private getLightDirectionVector(azimuthalAngle: number) {
      var polarAngle = this.dataset.getPolarAngle(azimuthalAngle);

      if (polarAngle < 0 || azimuthalAngle < 0) {
         console.warn("Light direction vector is invalid!");
      }

      azimuthalAngle = (azimuthalAngle * 2 * Math.PI) / 360;
      polarAngle = (polarAngle * 2 * Math.PI) / 360;

      var light = new Vector3(
         Math.sin(polarAngle) * Math.cos(azimuthalAngle),
         Math.sin(polarAngle) * Math.sin(azimuthalAngle),
         Math.cos(polarAngle)
      );

      var lightDirection = light.normalize();

      return lightDirection;
   }
}
