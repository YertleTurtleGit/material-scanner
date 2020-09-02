"use strict";
class Dataset {
    constructor(lightingAzimuthalAngles, dataLoadedCallback) {
        this.lightingAzimuthalAngles = lightingAzimuthalAngles;
        this.lightingCoordinates = null;
        this.dataLoadedCallback = dataLoadedCallback;
        this.jsImageObjects = new Array(lightingAzimuthalAngles.length).fill(null);
        this.noLightImageObject = null;
        this.dataInput = null;
        this.type = null;
    }
    getLightingCoordinates(polarAngle) {
        if (this.lightingCoordinates === null) {
            this.lightingCoordinates = [];
            for (var i = 0; i < this.lightingAzimuthalAngles.length; i++) {
                this.lightingCoordinates.push(new SphericalCoordinate(this.lightingAzimuthalAngles[i], polarAngle));
            }
        }
        return this.lightingCoordinates;
    }
    getImageDimensions() {
        if (this.jsImageObjects[0] instanceof ShaderVariable) {
            return [
                this.jsImageObjects[0].getValue().width,
                this.jsImageObjects[0].getValue().height,
            ];
        }
        return [this.jsImageObjects[0].width, this.jsImageObjects[0].height];
    }
    getType() {
        return this.type;
    }
    listenForDrop(dropArea) {
        dropArea.addEventListener("dragover", function (eventObject) {
            eventObject.preventDefault();
        }, false);
        dropArea.addEventListener("drop", this.dataDropped.bind(this, dropArea), false);
    }
    dataDropped(dropArea, eventObject) {
        eventObject.preventDefault();
        this.type = "drop" /* DROP */;
        this.dataInput = new DataInput(this);
        this.dataInput.setInputClass(new DropInput(this.dataInput, eventObject.dataTransfer.files, this.dataLoaded.bind(this), this));
        dropArea.style.display = "none";
        this.showLoadingArea();
    }
    showLoadingArea() {
        LOADING_AREA.style.display = "block";
    }
    listenForWebcamButtonClick(webcamButton, webcamResolution) {
        webcamButton.addEventListener("click", this.webcamButtonClicked.bind(this, webcamResolution), false);
    }
    webcamButtonClicked(webcamResolution) {
        this.type = "webcam" /* WEBCAM */;
        this.getLightingCoordinates(WEBCAM_POLAR_ANGLE);
        this.dataInput = new DataInput(this);
        this.dataInput.setInputClass(new WebcamInput(this.dataInput, webcamResolution, this.lightingCoordinates, this.dataLoaded.bind(this)));
    }
    setImage(lightingCoordinate, jsImageObject) {
        for (var i = 0; i < this.lightingAzimuthalAngles.length; i++) {
            if (this.lightingAzimuthalAngles[i] ===
                lightingCoordinate.getAzimuthalAngle()) {
                this.jsImageObjects[i] = jsImageObject;
                return;
            }
        }
        if (lightingCoordinate === null) {
            this.noLightImageObject = jsImageObject;
        }
        console.warn("Not found lighting angle in dataset to set image.");
    }
    getImage(lightingAngle) {
        for (var i = 0; i < this.lightingAzimuthalAngles.length; i++) {
            if (this.lightingCoordinates[i].getAzimuthalAngle() === lightingAngle) {
                return this.jsImageObjects[i];
            }
        }
        if (lightingAngle === null) {
            return this.noLightImageObject;
        }
        console.warn("Not found lighting angle in dataset to get image.");
        return null;
    }
    getPolarAngle(lightingAngle) {
        for (var i = 0; i < this.lightingAzimuthalAngles.length; i++) {
            if (this.lightingCoordinates[i].getAzimuthalAngle() === lightingAngle) {
                return this.lightingCoordinates[i].getPolarAngle();
            }
        }
        console.warn("Not found lighting angle in dataset to get image.");
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
    inputImage(lightingCoordinate, image) {
        this.dataset.setImage(lightingCoordinate, image);
    }
}
class DropInput {
    constructor(dataInput, droppedFiles, droppedDataLoadedCallback, dataset) {
        this.dataInput = dataInput;
        this.lightingCoordinates = null;
        this.droppedDataLoadedCallback = droppedDataLoadedCallback;
        this.droppedFiles = droppedFiles;
        this.dataset = dataset;
        this.imagesLoaded = 0;
        this.loadAllImages();
    }
    loadAllImages() {
        console.log("Loading " + this.droppedFiles.length + " images for cpu.");
        const fileNameGlobal = this.droppedFiles[0].name.split(".")[0];
        const polarAngleGlobal = Number(fileNameGlobal.split("_", 2)[2]);
        this.lightingCoordinates = this.dataset.getLightingCoordinates(polarAngleGlobal);
        for (var i = 0; i < this.droppedFiles.length; i++) {
            const fileName = this.droppedFiles[i].name.split(".")[0];
            const azimuthalAngle = Number(fileName.split("_", 2)[1]);
            const polarAngle = Number(fileName.split("_", 2)[2]);
            const imageDegree = new SphericalCoordinate(azimuthalAngle, polarAngle);
            const fileType = this.droppedFiles[i].type;
            if (LIGHTING_AZIMUTHAL_ANGLES.includes(azimuthalAngle) &&
                fileType.startsWith("image")) {
                var reader = new FileReader();
                reader.addEventListener("load", this.readerLoaded.bind(this, reader, imageDegree));
                reader.readAsDataURL(this.droppedFiles[i]);
            }
            else {
                this.imagesLoaded++;
            }
        }
    }
    readerLoaded(reader, imageDegree) {
        //reader.removeEventListener("load", this.readerLoaded);
        var image = new Image();
        image.addEventListener("load", this.imageLoaded.bind(this, image, imageDegree));
        const readerResult = reader.result;
        image.src = String(readerResult);
    }
    imageLoaded(image, imageDegree) {
        this.imagesLoaded++;
        image.removeEventListener("load", this.imageLoaded.bind(this));
        this.dataInput.inputImage(imageDegree, image);
        if (this.imagesLoaded == this.lightingCoordinates.length) {
            setTimeout(this.droppedDataLoadedCallback, 0);
        }
    }
}
class WebcamInput {
    constructor(dataInput, resolution, lightingCoordinates, dataLoadedCallback) {
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
    getNextLightingAngleIndex() {
        for (var i = 0; i < this.lightingCoordinates.length; i++) {
            if (this.imageDataList[i] == null) {
                return i;
            }
        }
        return null;
    }
    setImageData(lightingCoordinate, imageData) {
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
    startCapture() {
        this.webcam.purgeDisplay();
        this.gradientLighting.display(this.lightingCoordinates[0].getAzimuthalAngle(), this.singleCapture.bind(this, this.lightingCoordinates[0]));
    }
    imageLoadedFromData(image, lightingCoordinate) {
        console.log(lightingCoordinate.getDisplayString() + " image loaded.");
        //image.removeEventListener("load", ev);
        this.loadedImages++;
        this.dataInput.inputImage(lightingCoordinate, image);
        if (this.loadedImages == this.lightingCoordinates.length) {
            console.log("All images from webcam loaded.");
            setTimeout(this.dataLoadedCallback, 0);
        }
    }
    loadAllImagesFromData() {
        for (var i = 0; i < this.lightingCoordinates.length; i++) {
            const image = new Image();
            image.addEventListener("load", this.imageLoadedFromData.bind(this, image, this.lightingCoordinates[i]));
            image.src = this.imageDataList[i];
        }
        const image = new Image();
        image.addEventListener("load", this.imageLoadedFromData.bind(this, image, null));
        image.src = this.noLightImageData;
    }
    capture() {
        var nextLightingAngleIndex = this.getNextLightingAngleIndex();
        if (nextLightingAngleIndex != null) {
            var lightingAngle = this.lightingCoordinates[nextLightingAngleIndex].getAzimuthalAngle();
            this.gradientLighting.display(lightingAngle, this.singleCapture.bind(this, lightingAngle));
        }
        else if (this.noLightImageData === null) {
            this.gradientLighting.display(null, this.singleCapture.bind(this, null));
        }
        else {
            this.gradientLighting.hide();
            this.webcam.purge();
            this.loadAllImagesFromData();
        }
    }
    singleCapture(lightingCoordinate) {
        console.log("capture " + lightingCoordinate.getDisplayString() + " degree image.");
        setTimeout(this.setImageData.bind(this, lightingCoordinate, this.webcam.takePicture()), 1000);
    }
}
