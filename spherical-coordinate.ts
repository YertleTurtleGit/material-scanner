"use strict";

class SphericalCoordinate {
   private azimuthalAngle: number;
   private polarAngle: number;

   constructor(azimuthalAngleDegree: number, polarAngleDegree: number) {
      this.azimuthalAngle = azimuthalAngleDegree;
      this.polarAngle = polarAngleDegree;
   }

   public getAzimuthalAngle() {
      return this.azimuthalAngle;
   }

   public getPolarAngle() {
      return this.polarAngle;
   }

   public getDisplayString() {
      this.normalize();
      return "[φ: " + this.azimuthalAngle + ", θ: " + this.polarAngle + "]";
   }

   private normalize() {
      this.azimuthalAngle = this.normalizeAngle(this.azimuthalAngle);
      this.polarAngle = this.normalizeAngle(this.polarAngle);
   }

   private normalizeAngle(angle: number) {
      while (angle >= 360) {
         angle -= 360;
      }
      while (angle < 0) {
         angle += 360;
      }
      return angle;
   }

   private oppositeAngle(angle: number) {
      return this.normalizeAngle(angle + 180);
   }

   public getOppositeAzimuthalSphericalCoordinate() {
      return new SphericalCoordinate(
         this.oppositeAngle(this.azimuthalAngle),
         this.polarAngle
      );
   }
}
