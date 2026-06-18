#include "gfanlib_matrix.h"

#include <stdio.h>

int main() {
  gfan::ZMatrix matrix(2, 3);
  matrix[0][0] = gfan::Integer(1);
  matrix[0][1] = gfan::Integer(2);
  matrix[0][2] = gfan::Integer(3);
  matrix[1][0] = gfan::Integer(4);
  matrix[1][1] = gfan::Integer(5);
  matrix[1][2] = gfan::Integer(6);

  gfan::ZVector vector(3);
  vector[0] = gfan::Integer(7);
  vector[1] = gfan::Integer(11);
  vector[2] = gfan::Integer(13);

  gfan::ZVector product = matrix.vectormultiply(vector);
  if (product.size() != 2 || product[0] != gfan::Integer(68) ||
      product[1] != gfan::Integer(161)) {
    fprintf(stderr, "unexpected gfanlib matrix-vector product\n");
    return 1;
  }

  puts("gfanlib-matrix-ok product=68,161");
  return 0;
}
