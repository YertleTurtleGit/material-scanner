"use strict";

class Dataset {
   constructor(sphericalCoordinates, dropElement, droppedDataLoadedCallback) {
      this.sphericalCoordinates = sphericalCoordinates;

      this.dropElement = dropElement;
      this.droppedDataLoadedCallback = droppedDataLoadedCallback;
      this.droppedFiles = null;

      this.jsImageObjects = new Array(sphericalCoordinates.length).fill(null);
      this.jsImageObjectNames = new Array(sphericalCoordinates.length).fill(
         null
      );

      this.imagesLoaded = 0;
      this.initDropElement();
   }

   initDropElement() {
      this.dropElement.addEventListener(
         "dragover",
         function (eventObject) {
            eventObject.preventDefault();
         },
         false
      );
      this.dropElement.addEventListener(
         "drop",
         this.dataDropped.bind(this),
         false
      );
   }

   dataDropped(eventObject) {
      eventObject.preventDefault();
      this.droppedFiles = eventObject.dataTransfer.files;
      this.loadAllImages();
      this.dropElement.style.display = "none";
      LOADING_AREA.style.display = "block";
   }

   loadAllImages() {
      cLog("Loading " + this.droppedFiles.length + " images for CPU.");

      for (var i = 0; i < this.droppedFiles.length; i++) {
         const fileName = this.droppedFiles[i].name.split(".")[0];
         const fileType = this.droppedFiles[i].type;

         if (IMAGE_NAMES.includes(fileName) && fileType.startsWith("image")) {
            var reader = new FileReader();
            reader.addEventListener(
               "load",
               this.readerLoaded.bind(this, reader, i, fileName)
            );
            reader.readAsDataURL(this.droppedFiles[i]);
         } else {
            this.imagesLoaded++;
         }
      }
   }

   readerLoaded(reader, index, imageName, ev) {
      reader.removeEventListener("load", this.readerLoaded);
      var image = new Image();
      image.addEventListener(
         "load",
         this.imageLoaded.bind(this, image, imageName)
      );
      this.jsImageObjects[index] = image;
      this.jsImageObjectNames[index] = imageName;
      image.src = ev.target.result;
   }

   imageLoaded(image, imageName) {
      this.imagesLoaded++;
      image.removeEventListener("load", this.imageLoaded);
      if (this.imagesLoaded == this.jsImageObjects.length) {
         setTimeout(this.droppedDataLoadedCallback, 0);
      }
   }

   getImage(sphericalCoordinate) {
      var imageName = null;
      for (var i = 0; i < LIGHTING_DEGREES.length; i++) {
         if (sphericalCoordinate == LIGHTING_DEGREES[i]) {
            imageName = IMAGE_NAMES[i];
         }
      }

      for (var i = 0; i < this.jsImageObjects.length; i++) {
         if (this.jsImageObjectNames[i] == imageName) {
            return this.jsImageObjects[i];
         }
      }
   }
}
