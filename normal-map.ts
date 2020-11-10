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

   calculate(onloadCallback) {
      var normalMapShader = new Shader();
      normalMapShader.bind();

      var images: GlslVector4[] = [];
      for (var i = 0; i < LIGHTING_AZIMUTHAL_ANGLES.length; i++) {
         images.push(
            GlslImage.load(dataset.getImage(LIGHTING_AZIMUTHAL_ANGLES[i]))
         );
      }

      const maxImage = images[0].maximum(...images);
      const minImage = images[0].minimum(...images);

      var all = maxImage.getLuminanceFloat();
      //var front =ic.divide(minImage, all);

      var north = images[
         LIGHTING_AZIMUTHAL_ANGLES.indexOf(NORTH)
      ].getLuminanceFloat();
      var northeast = images[
         LIGHTING_AZIMUTHAL_ANGLES.indexOf(NORTH_EAST)
      ].getLuminanceFloat();
      var east = images[
         LIGHTING_AZIMUTHAL_ANGLES.indexOf(EAST)
      ].getLuminanceFloat();
      var southeast = images[
         LIGHTING_AZIMUTHAL_ANGLES.indexOf(SOUTH_EAST)
      ].getLuminanceFloat();
      var south = images[
         LIGHTING_AZIMUTHAL_ANGLES.indexOf(SOUTH)
      ].getLuminanceFloat();
      var southwest = images[
         LIGHTING_AZIMUTHAL_ANGLES.indexOf(SOUTH_WEST)
      ].getLuminanceFloat();
      var west = images[
         LIGHTING_AZIMUTHAL_ANGLES.indexOf(WEST)
      ].getLuminanceFloat();
      var northwest = images[
         LIGHTING_AZIMUTHAL_ANGLES.indexOf(NORTH_WEST)
      ].getLuminanceFloat();

      const hasNoLightImage = this.dataset.getImage(null) !== null;

      if (hasNoLightImage) {
         console.log("HAS NO LIGHT IMAGE!");
         const noLightImage = GlslImage.load(
            this.dataset.getImage(null)
         ).getLuminanceFloat();

         all = all.subtractFloat(noLightImage);
         //front = front.substractFloat(noLightImage);

         north = north.subtractFloat(noLightImage);
         northeast = north.subtractFloat(noLightImage);
         east = north.subtractFloat(noLightImage);
         southeast = north.subtractFloat(noLightImage);
         south = north.subtractFloat(noLightImage);
         southwest = north.subtractFloat(noLightImage);
         west = north.subtractFloat(noLightImage);
         northwest = north.subtractFloat(noLightImage);
      }

      north = north.divideFloat(all);
      northeast = northeast.divideFloat(all);
      east = east.divideFloat(all);
      southeast = southeast.divideFloat(all);
      south = south.divideFloat(all);
      southwest = southwest.divideFloat(all);
      west = west.divideFloat(all);
      northwest = northwest.divideFloat(all);

      const imageLuminances: GlslFloat[] = [
         north,
         northeast,
         east,
         southeast,
         south,
         southwest,
         west,
         northwest,
      ];

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
      var normalVectors: GlslVector3[] = [];
      for (var i = 0; i < COMBINATIONS.length; i++) {
         normalVectors.push(
            this.getAnisotropicNormalVector(imageLuminances, ...COMBINATIONS[i])
         );
      }

      var normalVector = new GlslVector3([
         new GlslFloat(0),
         new GlslFloat(0),
         new GlslFloat(0),
      ])
         .addVector3(...normalVectors)
         .divideFloat(new GlslFloat(normalVectors.length));

      /*
         TODO:
         Somewhere and somehow the red and green channels are swapped.
         Thus, there are swapped here again.
      */
      var result: GlslVector4 = new GlslVector3([
         normalVector.channel(GLSL_CHANNEL.GREEN),
         normalVector.channel(GLSL_CHANNEL.RED),
         normalVector.channel(GLSL_CHANNEL.BLUE),
      ]).getVector4();

      const rendering = GlslRendering.render(result);
      this.pixelArray = rendering.getPixelArray();
      this.dataUrl = rendering.getDataUrl();
      this.jsImageObject = rendering.getJsImage(onloadCallback);

      normalMapShader.purge();
   }

   private getAnisotropicNormalVector(
      imageLuminances: GlslFloat[],
      originAzimuthalAngle: number,
      orthogonalAzimuthalAngle: number,
      oppositeAzimuthalAngle: number
   ) {
      const lights: GlslMatrix3 = this.getLights(
         originAzimuthalAngle,
         orthogonalAzimuthalAngle,
         oppositeAzimuthalAngle
      );

      const reflectionR =
         imageLuminances[
            LIGHTING_AZIMUTHAL_ANGLES.indexOf(originAzimuthalAngle)
         ];
      const reflectionG =
         imageLuminances[
            LIGHTING_AZIMUTHAL_ANGLES.indexOf(orthogonalAzimuthalAngle)
         ];
      const reflectionB =
         imageLuminances[
            LIGHTING_AZIMUTHAL_ANGLES.indexOf(oppositeAzimuthalAngle)
         ];

      const reflection = new GlslVector3([
         reflectionR,
         reflectionG,
         reflectionB,
      ]);

      return lights
         .multiplyVector3(reflection)
         .normalize()
         .addFloat(new GlslFloat(1))
         .divideFloat(new GlslFloat(2));
   }

   private getLights(
      originAzimuthalAngle: number,
      orthogonalAzimuthalAngle: number,
      oppositeAzimuthalAngle: number
   ): GlslMatrix3 {
      const originLightDir = this.getLightDirectionVector(originAzimuthalAngle);
      const orthogonalLightDir = this.getLightDirectionVector(
         orthogonalAzimuthalAngle
      );
      const oppositeLightDir = this.getLightDirectionVector(
         oppositeAzimuthalAngle
      );

      return new GlslMatrix3([
         [
            originLightDir.channel(GLSL_CHANNEL.X),
            originLightDir.channel(GLSL_CHANNEL.Y),
            originLightDir.channel(GLSL_CHANNEL.Z),
         ],
         [
            orthogonalLightDir.channel(GLSL_CHANNEL.X),
            orthogonalLightDir.channel(GLSL_CHANNEL.Y),
            orthogonalLightDir.channel(GLSL_CHANNEL.Z),
         ],
         [
            oppositeLightDir.channel(GLSL_CHANNEL.X),
            oppositeLightDir.channel(GLSL_CHANNEL.Y),
            oppositeLightDir.channel(GLSL_CHANNEL.Z),
         ],
      ]).inverse();
   }

   private getLightDirectionVector(azimuthalAngle: number): GlslVector3 {
      var polarAngle = this.dataset.getPolarAngle(azimuthalAngle);

      var glslPolar: GlslFloat = new GlslFloat(polarAngle).radians();
      var glslAzimuthal: GlslFloat = new GlslFloat(azimuthalAngle).radians();

      var sinPolar: GlslFloat = glslPolar.sin();
      var cosPolar: GlslFloat = glslPolar.cos();
      var sinAzimuthal: GlslFloat = glslAzimuthal.sin();
      var cosAzimuthal: GlslFloat = glslAzimuthal.cos();

      var light: GlslVector3 = new GlslVector3([
         sinPolar.multiplyFloat(cosAzimuthal),
         sinPolar.multiplyFloat(sinAzimuthal),
         cosPolar,
      ]);

      return light.normalize();
   }
}
