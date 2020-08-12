"use strict";

class Dataset {
   constructor(sphericalCoordinates, dropElement, droppedDataLoadedCallback) {
      this.sphericalCoordinates = sphericalCoordinates;

      this.dropElement = dropElement;
      this.droppedDataLoadedCallback = droppedDataLoadedCallback;
      this.droppedFiles = null;

      this.jsImageObjects = new Array(sphericalCoordinates.length).fill(null);
      this.jsImageObjectDegrees = new Array(sphericalCoordinates.length).fill(
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

   getObjectName() {
      var objectName = [];
      const split = this.droppedFiles[0].name.split(".")[0].split("_");
      for (var i = 1; i < split.length; i++) {
         objectName.push(split[i]);
      }
      console.log(objectName.join("_"));
      return objectName.join("_");
   }

   loadAllImages() {
      cLog("Loading " + this.droppedFiles.length + " images for cpu.");

      for (var i = 0; i < this.droppedFiles.length; i++) {
         const fileName = this.droppedFiles[i].name.split(".")[0];
         const imageDegree = fileName.split("_", 1)[0];
         const fileType = this.droppedFiles[i].type;

         if (
            IMAGE_NAMES.includes(imageDegree) &&
            fileType.startsWith("image")
         ) {
            var reader = new FileReader();
            reader.addEventListener(
               "load",
               this.readerLoaded.bind(this, reader, i, imageDegree)
            );
            reader.readAsDataURL(this.droppedFiles[i]);
         } else {
            this.imagesLoaded++;
         }
      }
   }

   readerLoaded(reader, index, imageDegree, ev) {
      reader.removeEventListener("load", this.readerLoaded);
      var image = new Image();
      image.addEventListener(
         "load",
         this.imageLoaded.bind(this, image, imageDegree)
      );
      this.jsImageObjects[index] = image;
      this.jsImageObjectDegrees[index] = imageDegree;
      image.src = ev.target.result;
   }

   imageLoaded(image, imageDegree) {
      this.imagesLoaded++;
      image.removeEventListener("load", this.imageLoaded);
      if (this.imagesLoaded == this.jsImageObjects.length) {
         setTimeout(this.droppedDataLoadedCallback, 0);
      }
   }

   getImage(sphericalCoordinate) {
      var imageDegree = null;
      for (var i = 0; i < LIGHTING_DEGREES.length; i++) {
         if (sphericalCoordinate == LIGHTING_DEGREES[i]) {
            imageDegree = parseInt(IMAGE_NAMES[i]);
         }
      }

      for (var i = 0; i < this.jsImageObjects.length; i++) {
         if (this.jsImageObjectDegrees[i] == imageDegree) {
            return this.jsImageObjects[i];
         }
      }
   }
}
