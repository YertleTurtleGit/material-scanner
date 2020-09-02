"use strict";

class NormalMap {
   private dataset: Dataset;
   private jsImageObject: HTMLImageElement;
   private pixelArray: Uint8Array;
   private dataUrl: string;
   private isLoaded: boolean;

   constructor(dataset: Dataset) {
      this.dataset = dataset;
      this.jsImageObject = null;
      this.pixelArray = null;
      this.dataUrl = null;
      this.isLoaded = false;
   }

   loaded(onloadCallback: TimerHandler) {
      this.isLoaded = true;
      setTimeout(onloadCallback, 0);
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
      if (this.isLoaded) {
         return this.dataUrl;
      }
   }

   getAsPixelArray() {
      if (this.isLoaded) {
         return this.pixelArray;
      }
      console.warn("Call load first.");
      return null;
   }

   getAsJsImageObject() {
      if (this.isLoaded) {
         return this.jsImageObject;
      }
      console.warn("Call load first.");
      return null;
   }

   calculate(onloadCallback: any) {
      const ic = new ImageCalc(true);

      var maxImage = this.dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[0]);
      for (var i = 1; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
         maxImage = ic.max(
            maxImage,
            this.dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[i])
         );
      }

      var minImage = this.dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[0]);
      for (var i = 1; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
         minImage = ic.min(
            minImage,
            this.dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[i])
         );
      }

      var all = maxImage;
      var front = ic.multiply(ic.divide(minImage, all), 1);

      var north = this.dataset.getImage(NORTH);
      var northeast = this.dataset.getImage(NORTH_EAST);
      var east = this.dataset.getImage(EAST);
      var southeast = this.dataset.getImage(SOUTH_EAST);
      var south = this.dataset.getImage(SOUTH);
      var southwest = this.dataset.getImage(SOUTH_WEST);
      var west = this.dataset.getImage(WEST);
      var northwest = this.dataset.getImage(NORTH_WEST);

      const noLightImage = this.dataset.getImage(null);
      const hasNoLightImage = noLightImage != null;
      if (hasNoLightImage) {
         all = ic.substract(all, noLightImage);
         front = ic.substract(front, noLightImage);

         north = ic.substract(north, noLightImage);
         northeast = ic.substract(northeast, noLightImage);
         east = ic.substract(east, noLightImage);
         southeast = ic.substract(southeast, noLightImage);
         south = ic.substract(south, noLightImage);
         southwest = ic.substract(southwest, noLightImage);
         west = ic.substract(west, noLightImage);
         northwest = ic.substract(northwest, noLightImage);
      }

      //all = ic.multiply(all, all);

      north = ic.divide(north, all);
      northeast = ic.divide(northeast, all);
      east = ic.divide(east, all);
      southeast = ic.divide(southeast, all);
      south = ic.divide(south, all);
      southwest = ic.divide(southwest, all);
      west = ic.divide(west, all);
      northwest = ic.divide(northwest, all);

      var red = ic.add(
         ic.divide(ic.divide(east, west), 2),
         ic.divide(
            ic.add(
               ic.divide(northeast, southwest),
               ic.divide(southeast, northwest)
            ),
            8
         )
      );

      var green = ic.add(
         ic.divide(ic.divide(north, south), 2),
         ic.divide(
            ic.add(
               ic.divide(northeast, southwest),
               ic.divide(northwest, southeast)
            ),
            8
         )
      );

      var blue = front;

      ic.setResultChannels([red, green, blue, 1]);
      //ic.setResult(this.dataset.getImage(SOUTH));
      this.pixelArray = ic.getResultAsPixelArray();
      this.dataUrl = ic.getResultAsDataUrl();
      this.jsImageObject = ic.getResultAsJsImageObject(
         this.loaded.bind(this, onloadCallback)
      );

      ic.purge();
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
      azimuthalAngle *= (2 * Math.PI) / 360;
      polarAngle *= (2 * Math.PI) / 360;

      return new Vector3(
         Math.sin(polarAngle) * Math.cos(azimuthalAngle),
         Math.sin(polarAngle) * Math.sin(azimuthalAngle),
         Math.cos(polarAngle)
      );
   }
}
