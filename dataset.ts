"use strict";

const enum DATATYPE {
   WEBCAM = "webcam",
   DROP = "drop",
}

class Dataset {
   private lightingDegrees: number[];
   private dataLoadedCallback: TimerHandler;
   private jsImageObjects: (HTMLImageElement | ShaderVariable)[];
   private noLightImageObject: HTMLImageElement;
   private dataInput: DataInput;
   private type: DATATYPE;

   constructor(lightingDegrees: number[], dataLoadedCallback: TimerHandler) {
      this.lightingDegrees = lightingDegrees;
      this.dataLoadedCallback = dataLoadedCallback;
      this.jsImageObjects = new Array(lightingDegrees.length).fill(null);
      this.noLightImageObject = null;
      this.dataInput = null;
      this.type = null;
   }

   public getImageDimensions() {
      if (this.jsImageObjects[0] instanceof ShaderVariable) {
         return [
            this.jsImageObjects[0].getValue().width,
            this.jsImageObjects[0].getValue().height,
         ];
      }
      return [this.jsImageObjects[0].width, this.jsImageObjects[0].height];
   }

   public getType() {
      return this.type;
   }

   public listenForDrop(dropArea: HTMLElement) {
      dropArea.addEventListener(
         "dragover",
         function (eventObject: DragEvent) {
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

   private dataDropped(dropArea: HTMLDivElement, eventObject: DragEvent) {
      eventObject.preventDefault();

      this.type = DATATYPE.DROP;
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

   private showLoadingArea() {
      LOADING_AREA.style.display = "block";
   }

   public listenForWebcamButtonClick(
      webcamButton: HTMLElement,
      webcamResolution: number[]
   ) {
      webcamButton.addEventListener(
         "click",
         this.webcamButtonClicked.bind(this, webcamResolution),
         false
      );
   }

   private webcamButtonClicked(webcamResolution: number[]) {
      this.type = DATATYPE.WEBCAM;
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

   public setImage(lightingDegree: number, jsImageObject: HTMLImageElement) {
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

   public getImage(lightingDegree: number) {
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

   public getObjectName() {
      return this.dataInput.getObjectName();
   }

   private dataLoaded() {
      console.log("Data loaded.");
      setTimeout(this.dataLoadedCallback, 0);
   }
}

class DataInput {
   dataset: Dataset;
   type: DATATYPE;
   inputClass: any;

   constructor(dataset: Dataset) {
      this.dataset = dataset;
      this.type = dataset.getType();
      this.inputClass = null;
   }

   public getObjectName() {
      return this.inputClass.getObjectName();
   }

   public setInputClass(inputClass: DropInput | WebcamInput) {
      this.inputClass = inputClass;
   }

   public inputImage(lightingDegree: number, image: HTMLImageElement) {
      this.dataset.setImage(lightingDegree, image);
   }
}

class DropInput {
   private dataInput: DataInput;
   private lightingDegrees: number[];
   private droppedDataLoadedCallback: TimerHandler;
   private droppedFiles: FileList;
   private imagesLoaded: number;

   constructor(
      dataInput: DataInput,
      lightingDegrees: number[],
      droppedFiles: FileList,
      droppedDataLoadedCallback: TimerHandler
   ) {
      this.dataInput = dataInput;
      this.lightingDegrees = lightingDegrees;

      this.droppedDataLoadedCallback = droppedDataLoadedCallback;
      this.droppedFiles = droppedFiles;

      this.imagesLoaded = 0;
      this.loadAllImages();
   }

   private loadAllImages() {
      console.log("Loading " + this.droppedFiles.length + " images for cpu.");

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
               this.readerLoaded.bind(this, reader, imageDegree)
            );
            reader.readAsDataURL(this.droppedFiles[i]);
         } else {
            this.imagesLoaded++;
         }
      }
   }

   private readerLoaded(reader: FileReader, imageDegree: number) {
      //reader.removeEventListener("load", this.readerLoaded);
      var image = new Image();
      image.addEventListener(
         "load",
         this.imageLoaded.bind(this, image, imageDegree)
      );

      const readerResult = reader.result;
      image.src = String(readerResult);
   }

   private imageLoaded(image: HTMLImageElement, imageDegree: number) {
      this.imagesLoaded++;
      image.removeEventListener("load", this.imageLoaded.bind(this));
      this.dataInput.inputImage(imageDegree, image);
      if (this.imagesLoaded == this.lightingDegrees.length) {
         setTimeout(this.droppedDataLoadedCallback, 0);
      }
   }
}

class WebcamInput {
   private dataInput: DataInput;
   private gradientLighting: GradientLighting;
   private webcam: Webcam;
   private dataLoadedCallback: TimerHandler;
   private imageDataList: string[];
   private jsImageObjectList: HTMLImageElement[];
   private lightingDegrees: number[];
   private loadedImages: number;
   private noLightImageData: string;
   private noLightImageObject: HTMLImageElement;

   constructor(
      dataInput: DataInput,
      resolution: number[],
      lightingDegrees: number[],
      dataLoadedCallback: TimerHandler
   ) {
      this.dataInput = dataInput;
      this.gradientLighting = new GradientLighting();
      this.webcam = new Webcam(resolution, this.startCapture.bind(this));
      this.dataLoadedCallback = dataLoadedCallback;

      this.imageDataList = Array(lightingDegrees.length).fill(null);
      this.jsImageObjectList = Array(lightingDegrees.length).fill(null);
      this.lightingDegrees = lightingDegrees;
      this.loadedImages = 0;
      this.noLightImageData = null;
      this.noLightImageObject = null;
      this.webcam.startStreaming();
   }

   private getNextLightingDegreeIndex() {
      for (var i = 0; i < this.lightingDegrees.length; i++) {
         if (this.imageDataList[i] == null) {
            return i;
         }
      }
      return null;
   }

   private setImageData(lightingDegree: number, imageData: string) {
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

   public startCapture() {
      this.webcam.purgeDisplay();
      this.gradientLighting.display(
         this.lightingDegrees[0],
         this.singleCapture.bind(this, this.lightingDegrees[0])
      );
   }

   private imageLoadedFromData(
      image: HTMLImageElement,
      lightingDegree: number
   ) {
      console.log(lightingDegree + " image loaded.");
      //image.removeEventListener("load", ev);
      this.loadedImages++;
      this.dataInput.inputImage(lightingDegree, image);
      if (this.loadedImages == this.lightingDegrees.length) {
         console.log("All images from webcam loaded.");
         setTimeout(this.dataLoadedCallback, 0);
      }
   }

   private loadAllImagesFromData() {
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

   private capture() {
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
         this.webcam.purge();
         this.loadAllImagesFromData();
      }
   }

   private singleCapture(lightingDegree: string) {
      console.log("capture " + lightingDegree + " degree image.");
      setTimeout(
         this.setImageData.bind(
            this,
            lightingDegree,
            this.webcam.takePicture()
         ),
         1000
      );
   }
}
