#include <gsl/gsl_blas.h>
#include <gsl/gsl_cdf.h>
#include <gsl/gsl_errno.h>
#include <gsl/gsl_linalg.h>
#include <gsl/gsl_matrix.h>
#include <gsl/gsl_permutation.h>
#include <gsl/gsl_sf_bessel.h>
#include <gsl/gsl_vector.h>
#include <math.h>
#include <stdio.h>

static int close_to(double actual, double expected, double tolerance) {
  return fabs(actual - expected) <= tolerance;
}

static int check_lu_solve(double *third_solution_entry) {
  gsl_matrix *matrix = gsl_matrix_alloc(3, 3);
  gsl_vector *rhs = gsl_vector_alloc(3);
  gsl_vector *solution = gsl_vector_alloc(3);
  gsl_permutation *permutation = gsl_permutation_alloc(3);
  int signum = 0;
  int status;
  int ok;

  *third_solution_entry = 0.0;

  if (matrix == NULL || rhs == NULL || solution == NULL || permutation == NULL) {
    gsl_matrix_free(matrix);
    gsl_vector_free(rhs);
    gsl_vector_free(solution);
    gsl_permutation_free(permutation);
    return 0;
  }

  gsl_matrix_set(matrix, 0, 0, 2.0);
  gsl_matrix_set(matrix, 0, 1, 1.0);
  gsl_matrix_set(matrix, 0, 2, 0.0);
  gsl_matrix_set(matrix, 1, 0, 0.0);
  gsl_matrix_set(matrix, 1, 1, 3.0);
  gsl_matrix_set(matrix, 1, 2, 1.0);
  gsl_matrix_set(matrix, 2, 0, 1.0);
  gsl_matrix_set(matrix, 2, 1, 0.0);
  gsl_matrix_set(matrix, 2, 2, 4.0);

  gsl_vector_set(rhs, 0, 4.0);
  gsl_vector_set(rhs, 1, 9.0);
  gsl_vector_set(rhs, 2, 13.0);

  status = gsl_linalg_LU_decomp(matrix, permutation, &signum);
  if (status == GSL_SUCCESS) {
    status = gsl_linalg_LU_solve(matrix, permutation, rhs, solution);
  }

  *third_solution_entry = gsl_vector_get(solution, 2);
  ok = status == GSL_SUCCESS &&
       close_to(gsl_vector_get(solution, 0), 1.0, 1e-12) &&
       close_to(gsl_vector_get(solution, 1), 2.0, 1e-12) &&
       close_to(*third_solution_entry, 3.0, 1e-12);

  gsl_permutation_free(permutation);
  gsl_vector_free(solution);
  gsl_vector_free(rhs);
  gsl_matrix_free(matrix);

  return ok;
}

int main(void) {
  gsl_set_error_handler_off();

  double j0 = gsl_sf_bessel_J0(5.0);
  double gaussian = gsl_cdf_ugaussian_P(1.0);
  double linear = 0.0;
  int linear_ok;

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
  linear_ok = check_lu_solve(&linear);

  gsl_vector_free(x);
  gsl_vector_free(y);

  printf("gsl-ok j0=%.12f gaussian=%.12f dot=%.1f linear=%.1f\n", j0,
         gaussian, dot, linear);

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
  if (!linear_ok) {
    return 1;
  }

  return 0;
}
