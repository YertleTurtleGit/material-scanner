"use strict";

class Vector3 {
   public x: number;
   public y: number;
   public z: number;

   constructor(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
   }
}

class Matrix3x3 {
   public matrix: [
      [number, number, number],
      [number, number, number],
      [number, number, number]
   ];

   constructor(
      matrix: [
         [number, number, number],
         [number, number, number],
         [number, number, number]
      ]
   ) {
      this.matrix = matrix;
   }

   public get(row: number, column: number) {
      return this.matrix[row][column];
   }

   public inverse() {
      if (this.matrix.length !== this.matrix[0].length) {
         return;
      }

      var i = 0,
         ii = 0,
         j = 0,
         dim = this.matrix.length,
         e = 0,
         t = 0;
      var I = [],
         C = [];
      for (i = 0; i < dim; i += 1) {
         I[I.length] = [];
         C[C.length] = [];
         for (j = 0; j < dim; j += 1) {
            if (i == j) {
               I[i][j] = 1;
            } else {
               I[i][j] = 0;
            }
            C[i][j] = this.matrix[i][j];
         }
      }

      for (i = 0; i < dim; i += 1) {
         e = C[i][i];

         if (e == 0) {
            for (ii = i + 1; ii < dim; ii += 1) {
               if (C[ii][i] != 0) {
                  for (j = 0; j < dim; j++) {
                     e = C[i][j];
                     C[i][j] = C[ii][j];
                     C[ii][j] = e;
                     e = I[i][j];
                     I[i][j] = I[ii][j];
                     I[ii][j] = e;
                  }
                  break;
               }
            }
            e = C[i][i];
            if (e == 0) {
               return;
            }
         }

         for (j = 0; j < dim; j++) {
            C[i][j] = C[i][j] / e;
            I[i][j] = I[i][j] / e;
         }

         for (ii = 0; ii < dim; ii++) {
            if (ii == i) {
               continue;
            }
            e = C[ii][i];

            for (j = 0; j < dim; j++) {
               C[ii][j] -= e * C[i][j];
               I[ii][j] -= e * I[i][j];
            }
         }
      }

      console.warn("Check if it's the wrong way round.");
      return new Matrix3x3([
         [I[0][0], I[1][0], I[2][0]],
         [I[0][1], I[1][1], I[2][1]],
         [I[0][2], I[1][2], I[2][2]],
      ]);
   }
}

class Color {
   public r: number;
   public g: number;
   public b: number;
   public a: number;

   constructor(r: number, g: number, b: number, a: number) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
   }
}
