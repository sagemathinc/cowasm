#include <gsl/gsl_blas.h>
#include <gsl/gsl_cdf.h>
#include <gsl/gsl_eigen.h>
#include <gsl/gsl_errno.h>
#include <gsl/gsl_integration.h>
#include <gsl/gsl_linalg.h>
#include <gsl/gsl_matrix.h>
#include <gsl/gsl_roots.h>
#include <gsl/gsl_permutation.h>
#include <gsl/gsl_sf_bessel.h>
#include <gsl/gsl_sort_vector.h>
#include <gsl/gsl_statistics_double.h>
#include <gsl/gsl_vector.h>
#include <math.h>
#include <stdio.h>

static int close_to(double actual, double expected, double tolerance) {
  return fabs(actual - expected) <= tolerance;
}

static double sin_integrand(double x, void *params) {
  (void)params;
  return sin(x);
}

static double fixed_point_function(double x, void *params) {
  (void)params;
  return cos(x) - x;
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

static int check_integration(double *area) {
  gsl_integration_workspace *workspace = gsl_integration_workspace_alloc(1000);
  gsl_function function;
  double error = 0.0;
  int status;

  *area = 0.0;
  if (workspace == NULL) {
    return 0;
  }

  function.function = &sin_integrand;
  function.params = NULL;
  status = gsl_integration_qags(&function, 0.0, M_PI, 0.0, 1e-12, 1000,
                                workspace, area, &error);

  gsl_integration_workspace_free(workspace);

  return status == GSL_SUCCESS && close_to(*area, 2.0, 1e-12) &&
         error < 1e-10;
}

static int check_root(double *root) {
  const gsl_root_fsolver_type *solver_type = gsl_root_fsolver_bisection;
  gsl_root_fsolver *solver = gsl_root_fsolver_alloc(solver_type);
  gsl_function function;
  double low = 0.0;
  double high = 1.0;
  int status = GSL_CONTINUE;
  int iter = 0;

  *root = 0.0;
  if (solver == NULL) {
    return 0;
  }

  function.function = &fixed_point_function;
  function.params = NULL;
  status = gsl_root_fsolver_set(solver, &function, low, high);
  if (status != GSL_SUCCESS) {
    gsl_root_fsolver_free(solver);
    return 0;
  }

  while (iter < 64) {
    iter++;
    status = gsl_root_fsolver_iterate(solver);
    if (status != GSL_SUCCESS) {
      break;
    }
    *root = gsl_root_fsolver_root(solver);
    low = gsl_root_fsolver_x_lower(solver);
    high = gsl_root_fsolver_x_upper(solver);
    status = gsl_root_test_interval(low, high, 0.0, 1e-12);
    if (status == GSL_SUCCESS) {
      break;
    }
    if (status != GSL_CONTINUE) {
      break;
    }
  }

  gsl_root_fsolver_free(solver);

  return status == GSL_SUCCESS && close_to(*root, 0.739085133215, 1e-12);
}

static int check_eigen(double *smallest_eigenvalue) {
  gsl_matrix *matrix = gsl_matrix_alloc(2, 2);
  gsl_vector *eigenvalues = gsl_vector_alloc(2);
  gsl_eigen_symm_workspace *workspace = gsl_eigen_symm_alloc(2);
  int status;
  int ok;

  *smallest_eigenvalue = 0.0;
  if (matrix == NULL || eigenvalues == NULL || workspace == NULL) {
    gsl_matrix_free(matrix);
    gsl_vector_free(eigenvalues);
    gsl_eigen_symm_free(workspace);
    return 0;
  }

  gsl_matrix_set(matrix, 0, 0, 2.0);
  gsl_matrix_set(matrix, 0, 1, 1.0);
  gsl_matrix_set(matrix, 1, 0, 1.0);
  gsl_matrix_set(matrix, 1, 1, 2.0);
  status = gsl_eigen_symm(matrix, eigenvalues, workspace);
  gsl_sort_vector(eigenvalues);
  *smallest_eigenvalue = gsl_vector_get(eigenvalues, 0);
  ok = status == GSL_SUCCESS && close_to(*smallest_eigenvalue, 1.0, 1e-12) &&
       close_to(gsl_vector_get(eigenvalues, 1), 3.0, 1e-12);

  gsl_eigen_symm_free(workspace);
  gsl_vector_free(eigenvalues);
  gsl_matrix_free(matrix);

  return ok;
}

int main(void) {
  gsl_set_error_handler_off();

  double j0 = gsl_sf_bessel_J0(5.0);
  double gaussian = gsl_cdf_ugaussian_P(1.0);
  double linear = 0.0;
  double integral = 0.0;
  double root = 0.0;
  double eigen = 0.0;
  double samples[] = {1.0, 2.0, 4.0, 8.0, 16.0};
  double mean = gsl_stats_mean(samples, 1, 5);
  int linear_ok;
  int integration_ok;
  int root_ok;
  int eigen_ok;

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
  integration_ok = check_integration(&integral);
  root_ok = check_root(&root);
  eigen_ok = check_eigen(&eigen);

  gsl_vector_free(x);
  gsl_vector_free(y);

  printf("gsl-ok j0=%.12f gaussian=%.12f dot=%.1f linear=%.1f "
         "integral=%.1f root=%.12f eigen=%.1f mean=%.1f\n",
         j0, gaussian, dot, linear, integral, root, eigen, mean);

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
  if (!integration_ok) {
    return 1;
  }
  if (!root_ok) {
    return 1;
  }
  if (!eigen_ok) {
    return 1;
  }
  if (!close_to(mean, 6.2, 1e-12)) {
    return 1;
  }

  return 0;
}
