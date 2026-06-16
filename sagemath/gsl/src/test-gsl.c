#include <gsl/gsl_blas.h>
#include <gsl/gsl_cdf.h>
#include <gsl/gsl_errno.h>
#include <gsl/gsl_sf_bessel.h>
#include <gsl/gsl_vector.h>
#include <math.h>
#include <stdio.h>

static int close_to(double actual, double expected, double tolerance) {
  return fabs(actual - expected) <= tolerance;
}

int main(void) {
  gsl_set_error_handler_off();

  double j0 = gsl_sf_bessel_J0(5.0);
  double gaussian = gsl_cdf_ugaussian_P(1.0);

  gsl_vector *x = gsl_vector_alloc(3);
  gsl_vector *y = gsl_vector_alloc(3);
  if (x == NULL || y == NULL) {
    gsl_vector_free(x);
    gsl_vector_free(y);
    return 1;
  }

  for (size_t i = 0; i < 3; i++) {
    gsl_vector_set(x, i, (double)(i + 1));
    gsl_vector_set(y, i, (double)(4 - i));
  }

  double dot = 0.0;
  int blas_status = gsl_blas_ddot(x, y, &dot);

  gsl_vector_free(x);
  gsl_vector_free(y);

  printf("gsl-ok j0=%.12f gaussian=%.12f dot=%.1f\n", j0, gaussian, dot);

  if (blas_status != GSL_SUCCESS) {
    return 1;
  }
  if (!close_to(j0, -0.177596771314, 1e-12)) {
    return 1;
  }
  if (!close_to(gaussian, 0.841344746069, 1e-12)) {
    return 1;
  }
  if (!close_to(dot, 16.0, 1e-12)) {
    return 1;
  }

  return 0;
}
