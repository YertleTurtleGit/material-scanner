"use strict";

class NormalMap {
   constructor(dataset) {
      this.dataset = dataset;
      this.jsImageObject = null;
      this.pixelArray = null;
      this.dataUrl = null;
      this.isLoaded = false;
   }

   loaded(onloadCallback) {
      this.isLoaded = true;
      setTimeout(onloadCallback, 0);
   }

   downloadAsImage(fileName) {
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

   calculate(onloadCallback) {
      const ic = new ImageCalc(true);

      var maxImage = this.dataset.getImage(LIGHTING_DEGREES[0]);
      for (var i = 1; i < LIGHTING_DEGREES.length; i++) {
         maxImage = ic.max(
            maxImage,
            this.dataset.getImage(LIGHTING_DEGREES[i])
         );
      }

      var minImage = this.dataset.getImage(LIGHTING_DEGREES[0]);
      for (var i = 1; i < LIGHTING_DEGREES.length; i++) {
         minImage = ic.min(
            minImage,
            this.dataset.getImage(LIGHTING_DEGREES[i])
         );
      }

      const all = maxImage;
      const front = ic.multiply(ic.divide(minImage, all), 2);

      const north = ic.divide(this.dataset.getImage(NORTH), all);
      const northeast = ic.divide(this.dataset.getImage(NORTH_EAST), all);
      const east = ic.divide(this.dataset.getImage(EAST), all);
      const southeast = ic.divide(this.dataset.getImage(SOUTH_EAST), all);
      const south = ic.divide(this.dataset.getImage(SOUTH), all);
      const southwest = ic.divide(this.dataset.getImage(SOUTH_WEST), all);
      const west = ic.divide(this.dataset.getImage(WEST), all);
      const northwest = ic.divide(this.dataset.getImage(NORTH_WEST), all);

      const red = ic.add(
         ic.multiply(1 / 4, ic.divide(east, west)),
         ic.multiply(
            1 / 8,
            ic.add(
               ic.divide(northeast, southwest),
               ic.divide(southeast, northwest)
            )
         )
      );

      const green = ic.add(
         ic.multiply(1 / 4, ic.divide(north, south)),
         ic.multiply(
            1 / 8,
            ic.add(
               ic.divide(northeast, southwest),
               ic.divide(northwest, southeast)
            )
         )
      );

      const blue = front;

      ic.setResultChannels([red, green, blue, 1]);
      this.pixelArray = ic.getResultAsPixelArray();
      this.dataUrl = ic.getResultAsDataUrl();
      this.jsImageObject = ic.getResultAsJsImageObject(
         this.loaded.bind(this, onloadCallback)
      );

      ic.purge();
   }
}
