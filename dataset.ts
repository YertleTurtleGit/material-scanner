"use strict";

const enum DATATYPE {
   WEBCAM = "webcam",
   DROP = "drop",
   TEST = "test",
}

class Dataset {
   private lightingAzimuthalAngles: number[];
   private lightingCoordinates: SphericalCoordinate[];
   private dataLoadedCallback: TimerHandler;
   private jsImageObjects: HTMLImageElement[];
   private noLightImageObject: HTMLImageElement;
   private dataInput: DataInput;
   private type: DATATYPE;

   constructor(
      lightingAzimuthalAngles: number[],
      dataLoadedCallback: TimerHandler
   ) {
      this.lightingAzimuthalAngles = lightingAzimuthalAngles;
      this.lightingCoordinates = null;
      this.dataLoadedCallback = dataLoadedCallback;
      this.jsImageObjects = new Array(lightingAzimuthalAngles.length).fill(
         null
      );
      this.noLightImageObject = null;
      this.dataInput = null;
      this.type = null;
   }

   public getLightingCoordinates(polarAngle: number) {
      if (this.lightingCoordinates === null) {
         this.lightingCoordinates = [];
         for (var i = 0; i < this.lightingAzimuthalAngles.length; i++) {
            this.lightingCoordinates.push(
               new SphericalCoordinate(
                  this.lightingAzimuthalAngles[i],
                  polarAngle
               )
            );
         }
      }
      return this.lightingCoordinates;
   }

   public getImageDimensions(): [number, number] {
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
            eventObject.dataTransfer.files,
            this.dataLoaded.bind(this),
            this
         )
      );

      dropArea.style.display = "none";
      this.showLoadingArea();
   }

   private showLoadingArea() {
      LOADING_AREA.style.display = "block";
   }

   public listenForTestButtonClick(testButton: HTMLElement) {
      testButton.addEventListener("click", this.testButtonClicked.bind(this));
   }

   private testButtonClicked() {
      this.type = DATATYPE.TEST;
      this.dataInput = new DataInput(this);
      this.getLightingCoordinates(TEST_POLAR_ANGLE);

      this.dataInput.setInputClass(
         new TestInput(this.dataInput, this.dataLoaded.bind(this))
      );
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
      this.getLightingCoordinates(WEBCAM_POLAR_ANGLE);
      this.dataInput = new DataInput(this);

      this.dataInput.setInputClass(
         new WebcamInput(
            this.dataInput,
            webcamResolution,
            this.lightingCoordinates,
            this.dataLoaded.bind(this)
         )
      );
   }

   public setImage(
      lightingCoordinate: SphericalCoordinate,
      jsImageObject: HTMLImageElement
   ) {
      for (var i = 0; i < this.lightingAzimuthalAngles.length; i++) {
         if (
            this.lightingAzimuthalAngles[i] ===
            lightingCoordinate.getAzimuthalAngle()
         ) {
            this.jsImageObjects[i] = jsImageObject;
            return;
         }
      }
      if (lightingCoordinate === null) {
         this.noLightImageObject = jsImageObject;
      }
      console.warn("Not found lighting angle in dataset to set image.");
   }

   public getImage(lightingAngle: number): HTMLImageElement {
      for (var i = 0; i < this.lightingAzimuthalAngles.length; i++) {
         if (
            this.lightingCoordinates[i].getAzimuthalAngle() === lightingAngle
         ) {
            return this.jsImageObjects[i];
         }
      }
      if (lightingAngle === null) {
         return this.noLightImageObject;
      }

      console.warn("Not found lighting angle in dataset to get image.");
      return null;
   }

   public getPolarAngle(lightingAngle: number) {
      for (var i = 0; i < this.lightingAzimuthalAngles.length; i++) {
         if (
            this.lightingCoordinates[i].getAzimuthalAngle() === lightingAngle
         ) {
            return this.lightingCoordinates[i].getPolarAngle();
         }
      }

      console.warn("Not found lighting angle in dataset to get image.");
      return null;
   }

   public getObjectName() {
      return this.dataInput.getObjectName();
   }

   private dataLoaded() {
      //console.log("Data loaded.");
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

   public setInputClass(inputClass: DropInput | WebcamInput | TestInput) {
      this.inputClass = inputClass;
   }

   public inputImage(
      lightingCoordinate: SphericalCoordinate,
      image: HTMLImageElement
   ) {
      this.dataset.setImage(lightingCoordinate, image);
   }
}

class TestInput {
   private testDataLoadedCallback: TimerHandler;
   private loadedImages: number = 0;
   private dataInput: DataInput;

   constructor(dataInput: DataInput, testDataLoadedCallback: TimerHandler) {
      this.dataInput = dataInput;
      this.testDataLoadedCallback = testDataLoadedCallback;
      this.loadAllImages();
   }

   public getObjectName() {
      return TEST_OBJECT_NAME;
   }

   private singleImageLoaded(
      image: HTMLImageElement,
      imageDegree: SphericalCoordinate
   ) {
      this.loadedImages++;
      this.dataInput.inputImage(imageDegree, image);
      if (this.loadedImages === LIGHTING_AZIMUTHAL_ANGLES.length) {
         INPUT_DROP_AREA.remove();
         setTimeout(this.testDataLoadedCallback, 0);
      }
   }

   private loadAllImages() {
      var polarString = "" + TEST_POLAR_ANGLE;
      while (polarString.length < 3) {
         polarString = "0" + polarString;
      }

      for (var i = 0; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
         var azimuthalString = "" + LIGHTING_AZIMUTHAL_ANGLES[i];
         while (azimuthalString.length < 3) {
            azimuthalString = "0" + azimuthalString;
         }

         const fileName =
            TEST_OBJECT_NAME +
            "_" +
            azimuthalString +
            "_" +
            polarString +
            "." +
            TEST_FILE_EXTENSION;

         var image = new Image();
         image.addEventListener(
            "load",
            this.singleImageLoaded.bind(
               this,
               image,
               new SphericalCoordinate(
                  LIGHTING_AZIMUTHAL_ANGLES[i],
                  TEST_POLAR_ANGLE
               )
            )
         );
         image.crossOrigin = "anonymous";
         image.src = TEST_DATASET_FOLDER + fileName;
      }
   }
}

class DropInput {
   private dataInput: DataInput;
   private lightingCoordinates: SphericalCoordinate[];
   private droppedDataLoadedCallback: TimerHandler;
   private droppedFiles: FileList;
   private imagesLoaded: number;
   private dataset: Dataset;
   private objectName: string;

   constructor(
      dataInput: DataInput,
      droppedFiles: FileList,
      droppedDataLoadedCallback: TimerHandler,
      dataset: Dataset
   ) {
      this.dataInput = dataInput;
      this.lightingCoordinates = null;

      this.droppedDataLoadedCallback = droppedDataLoadedCallback;
      this.droppedFiles = droppedFiles;
      this.dataset = dataset;
      this.objectName = null;

      this.imagesLoaded = 0;
      this.loadAllImages();
   }

   public getObjectName(): string {
      return this.objectName;
   }

   private loadAllImages() {
      console.log("Loading " + this.droppedFiles.length + " images for cpu.");

      const fileNameGlobal: string = this.droppedFiles[0].name.split(".")[0];
      const polarAngleGlobal: number = Number(fileNameGlobal.split("_", 3)[2]);
      this.objectName = fileNameGlobal.split("_", 1)[0];

      this.lightingCoordinates = this.dataset.getLightingCoordinates(
         polarAngleGlobal
      );

      for (var i = 0; i < this.droppedFiles.length; i++) {
         const fileName: string = this.droppedFiles[i].name.split(".")[0];

         const azimuthalAngle: number = Number(fileName.split("_", 2)[1]);
         const polarAngle: number = Number(fileName.split("_", 3)[2]);

         const imageDegree = new SphericalCoordinate(
            azimuthalAngle,
            polarAngle
         );

         const fileType = this.droppedFiles[i].type;

         if (
            LIGHTING_AZIMUTHAL_ANGLES.includes(azimuthalAngle) &&
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

   private readerLoaded(reader: FileReader, imageDegree: SphericalCoordinate) {
      //reader.removeEventListener("load", this.readerLoaded);
      var image = new Image();
      image.addEventListener(
         "load",
         this.imageLoaded.bind(this, image, imageDegree)
      );

      const readerResult = reader.result;
      image.src = String(readerResult);
   }

   private imageLoaded(
      image: HTMLImageElement,
      imageDegree: SphericalCoordinate
   ) {
      uiLog(
         "Image with spherical degree " +
            imageDegree.getDisplayString() +
            " loaded.",
         1
      );
      this.imagesLoaded++;
      image.removeEventListener("load", this.imageLoaded.bind(this));
      this.dataInput.inputImage(imageDegree, image);
      if (this.imagesLoaded === this.lightingCoordinates.length) {
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
   private lightingCoordinates: SphericalCoordinate[];
   private loadedImages: number;
   private noLightImageData: string;
   private noLightImageObject: HTMLImageElement;

   constructor(
      dataInput: DataInput,
      resolution: number[],
      lightingCoordinates: SphericalCoordinate[],
      dataLoadedCallback: TimerHandler
   ) {
      this.dataInput = dataInput;
      this.gradientLighting = new GradientLighting();
      this.webcam = new Webcam(resolution, this.startCapture.bind(this));
      this.dataLoadedCallback = dataLoadedCallback;

      this.imageDataList = Array(lightingCoordinates.length).fill(null);
      this.jsImageObjectList = Array(lightingCoordinates.length).fill(null);
      this.lightingCoordinates = lightingCoordinates;
      this.loadedImages = 0;
      this.noLightImageData = null;
      this.noLightImageObject = null;
      this.webcam.startStreaming();
   }

   private getNextLightingAngleIndex() {
      for (var i = 0; i < this.lightingCoordinates.length; i++) {
         if (this.imageDataList[i] == null) {
            return i;
         }
      }
      return null;
   }

   private setImageData(
      lightingCoordinate: SphericalCoordinate,
      imageData: string
   ) {
      for (var i = 0; i < this.lightingCoordinates.length; i++) {
         if (this.lightingCoordinates[i] == lightingCoordinate) {
            this.imageDataList[i] = imageData;
            this.capture();
            return i;
         }
      }
      if (lightingCoordinate === null) {
         this.noLightImageData = imageData;
         this.capture();
         return null;
      }
   }

   public startCapture() {
      this.webcam.purgeDisplay();
      this.gradientLighting.display(
         this.lightingCoordinates[0].getAzimuthalAngle(),
         this.singleCapture.bind(this, this.lightingCoordinates[0])
      );
   }

   private imageLoadedFromData(
      image: HTMLImageElement,
      lightingCoordinate: SphericalCoordinate
   ) {
      console.log(lightingCoordinate.getDisplayString() + " image loaded.");
      //image.removeEventListener("load", ev);
      this.loadedImages++;
      this.dataInput.inputImage(lightingCoordinate, image);
      if (this.loadedImages == this.lightingCoordinates.length) {
         console.log("All images from webcam loaded.");
         setTimeout(this.dataLoadedCallback, 0);
      }
   }

   private loadAllImagesFromData() {
      for (var i = 0; i < this.lightingCoordinates.length; i++) {
         const image = new Image();
         image.addEventListener(
            "load",
            this.imageLoadedFromData.bind(
               this,
               image,
               this.lightingCoordinates[i]
            )
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
      var nextLightingAngleIndex = this.getNextLightingAngleIndex();

      if (nextLightingAngleIndex !== null) {
         var lightingAngle = this.lightingCoordinates[
            nextLightingAngleIndex
         ].getAzimuthalAngle();
         this.gradientLighting.display(
            lightingAngle,
            this.singleCapture.bind(this, lightingAngle)
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

   private singleCapture(lightingCoordinate: SphericalCoordinate) {
      console.log(
         "capture " + lightingCoordinate.getDisplayString() + " degree image."
      );
      setTimeout(
         this.setImageData.bind(
            this,
            lightingCoordinate,
            this.webcam.takePicture()
         ),
         1000
      );
   }
}
