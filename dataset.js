"use strict";

class Dataset {
   constructor(lightingDegrees, dataLoadedCallback) {
      this.lightingDegrees = lightingDegrees;
      this.dataLoadedCallback = dataLoadedCallback;
      this.jsImageObjects = new Array(lightingDegrees.length).fill(null);
      this.noLightImageObject = null;
      this.dataInput = null;
      this.type = null;
   }

   getDataInput() {
      return this.dataInput;
   }

   getType() {
      return this.type;
   }

   listenForDrop(dropArea) {
      dropArea.addEventListener(
         "dragover",
         function (eventObject) {
            eventObject.preventDefault();
         },
         false
      );
      dropArea.addEventListener(
         "drop",
         this.dataDropped.bind(this, dropArea),
         false
      );
   }

   dataDropped(dropArea, eventObject) {
      eventObject.preventDefault();

      this.type = DataInput.TYPE.DROP;
      this.dataInput = new DataInput(this);

      this.dataInput.setInputClass(
         new DropInput(
            this.dataInput,
            this.lightingDegrees,
            eventObject.dataTransfer.files,
            this.dataLoaded.bind(this)
         )
      );

      dropArea.style.display = "none";
      this.showLoadingArea();
   }

   showLoadingArea() {
      LOADING_AREA.style.display = "block";
   }

   listenForWebcamButtonClick(webcamButton, webcamResolution) {
      webcamButton.addEventListener(
         "click",
         this.webcamButtonClicked.bind(this, webcamResolution),
         false
      );
   }

   webcamButtonClicked(webcamResolution) {
      this.type = DataInput.TYPE.WEBCAM;
      this.dataInput = new DataInput(this);

      this.dataInput.setInputClass(
         new WebcamInput(
            this.dataInput,
            webcamResolution,
            this.lightingDegrees,
            this.dataLoaded.bind(this)
         )
      );
   }

   setImage(lightingDegree, jsImageObject) {
      for (var i = 0; i < this.lightingDegrees.length; i++) {
         if (this.lightingDegrees[i] == lightingDegree) {
            this.jsImageObjects[i] = jsImageObject;
            return;
         }
      }
      if (lightingDegree === null) {
         this.noLightImageObject = jsImageObject;
      }
      console.warn("Not found lighting degree in dataset to set image.");
   }

   getImage(lightingDegree) {
      for (var i = 0; i < this.lightingDegrees.length; i++) {
         if (this.lightingDegrees[i] === lightingDegree) {
            return this.jsImageObjects[i];
         }
      }
      if (lightingDegree === null) {
         return this.noLightImageObject;
      }

      console.warn("Not found lighting degree in dataset to get image.");
      return null;
   }

   getObjectName() {
      return this.dataInput.getObjectName();
   }

   dataLoaded() {
      console.log("Data loaded.");
      setTimeout(this.dataLoadedCallback, 0);
   }
}

class DataInput {
   constructor(dataset) {
      this.dataset = dataset;
      this.type = dataset.getType();
      this.inputClass = null;
   }

   getObjectName() {
      return this.inputClass.getObjectName();
   }

   setInputClass(inputClass) {
      this.inputClass = inputClass;
   }

   inputImage(lightingDegree, image) {
      this.dataset.setImage(lightingDegree, image);
   }

   getType() {
      return this.type;
   }

   initialize() {
      if (this.getType() == DataInput.TYPE.DROP) {
      } else if (this.getType() == DataInput.TYPE.WEBCAM) {
      } else {
         console.warn("Data input type not supported.");
      }
   }
}
DataInput.TYPE = { WEBCAM: "webcam", DROP: "drop" };

class DropInput {
   constructor(
      dataInput,
      lightingDegrees,
      droppedFiles,
      droppedDataLoadedCallback
   ) {
      this.dataInput = dataInput;
      this.lightingDegrees = lightingDegrees;

      this.droppedDataLoadedCallback = droppedDataLoadedCallback;
      this.droppedFiles = droppedFiles;

      this.imagesLoaded = 0;
      this.loadAllImages();
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
      image.src = ev.target.result;
   }

   imageLoaded(image, imageDegree) {
      this.imagesLoaded++;
      image.removeEventListener("load", this.imageLoaded);
      this.dataInput.inputImage(imageDegree, image);
      if (this.imagesLoaded == this.lightingDegrees.length) {
         setTimeout(this.droppedDataLoadedCallback, 0);
      }
   }
}

class WebcamInput {
   constructor(dataInput, resolution, lightingDegrees, dataLoadedCallback) {
      this.dataInput = dataInput;
      this.gradientLighting = new GradientLighting();
      this.webCam = new WebCam(resolution, this.startCapture.bind(this));
      this.dataLoadedCallback = dataLoadedCallback;

      this.imageDataList = Array(lightingDegrees.length).fill(null);
      this.jsImageObjectList = Array(lightingDegrees.length).fill(null);
      this.lightingDegrees = lightingDegrees;
      this.loadedImages = 0;
      this.noLightImageData = null;
      this.noLightImageObject = null;
      this.webCam.startStreaming();
   }

   getObjectName() {
      return "webcam";
   }

   isReadyToCapture() {
      return this.webCam.isReady();
   }

   getNextLightingDegreeIndex() {
      for (var i = 0; i < this.lightingDegrees.length; i++) {
         if (this.imageDataList[i] == null) {
            return i;
         }
      }
      return null;
   }

   getImage(lightingDegree) {
      for (var i = 0; i < this.lightingDegrees.length; i++) {
         if (this.lightingDegrees[i] == lightingDegree) {
            return this.jsImageObjectList[i];
         }
      }
      if (lightingDegree === null) {
         return this.noLightImageObject;
      }
   }

   getImageData(lightingDegree) {
      for (var i = 0; i < this.lightingDegrees.length; i++) {
         if (this.lightingDegrees[i] == lightingDegree) {
            return this.imageDataList[i];
         }
      }
      if (lightingDegree === null) {
         return this.noLightImageData;
      }
   }

   setImageData(lightingDegree, imageData) {
      for (var i = 0; i < this.lightingDegrees.length; i++) {
         if (this.lightingDegrees[i] == lightingDegree) {
            this.imageDataList[i] = imageData;
            this.capture();
            return i;
         }
      }
      if (lightingDegree === null) {
         this.noLightImageData = imageData;
         this.capture();
         return null;
      }
   }

   startCapture() {
      this.webCam.purgeDisplay();
      this.gradientLighting.display(
         this.lightingDegrees[0],
         this.singleCapture.bind(this, this.lightingDegrees[0])
      );
   }

   imageLoadedFromData(image, lightingDegree, ev) {
      console.log(lightingDegree + " image loaded.");
      //image.removeEventListener("load", ev);
      this.loadedImages++;
      this.dataInput.inputImage(lightingDegree, image);
      if (this.loadedImages == this.lightingDegrees.length) {
         console.log("All images from webcam loaded.");
         setTimeout(this.dataLoadedCallback, 0);
      }
   }

   loadAllImagesFromData() {
      for (var i = 0; i < this.lightingDegrees.length; i++) {
         const image = new Image();
         image.addEventListener(
            "load",
            this.imageLoadedFromData.bind(this, image, this.lightingDegrees[i])
         );
         image.src = this.imageDataList[i];
      }

      const image = new Image();
      image.addEventListener(
         "load",
         this.imageLoadedFromData.bind(this, image, null)
      );
      image.src = this.noLightImageData;
   }

   capture() {
      var nextLightingDegreeIndex = this.getNextLightingDegreeIndex();

      if (nextLightingDegreeIndex != null) {
         var lightingDegree = this.lightingDegrees[nextLightingDegreeIndex];
         this.gradientLighting.display(
            lightingDegree,
            this.singleCapture.bind(this, lightingDegree)
         );
      } else if (this.noLightImageData === null) {
         this.gradientLighting.display(
            null,
            this.singleCapture.bind(this, null)
         );
      } else {
         this.gradientLighting.hide();
         this.webCam.purge();
         this.loadAllImagesFromData();
      }
   }

   singleCapture(lightingDegree) {
      console.log("capture " + lightingDegree + " degree image.");
      setTimeout(
         this.setImageData.bind(
            this,
            lightingDegree,
            this.webCam.takePicture()
         ),
         1000
      );
   }
}
