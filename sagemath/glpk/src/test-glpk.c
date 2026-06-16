#include <glpk.h>

#include <stdio.h>

static int nearly_equal(double a, double b) {
  double diff = a - b;
  if (diff < 0) {
    diff = -diff;
  }
  return diff < 1e-7;
}

static int test_lp(void) {
  glp_prob *lp = glp_create_prob();
  glp_smcp parm;
  int ia[7];
  int ja[7];
  double ar[7];
  int ok = 0;

  glp_term_out(GLP_OFF);
  glp_set_obj_dir(lp, GLP_MAX);

  glp_add_rows(lp, 3);
  glp_set_row_bnds(lp, 1, GLP_UP, 0.0, 10.0);
  glp_set_row_bnds(lp, 2, GLP_UP, 0.0, 4.0);
  glp_set_row_bnds(lp, 3, GLP_UP, 0.0, 8.0);

  glp_add_cols(lp, 2);
  glp_set_col_bnds(lp, 1, GLP_LO, 0.0, 0.0);
  glp_set_col_bnds(lp, 2, GLP_LO, 0.0, 0.0);
  glp_set_obj_coef(lp, 1, 10.0);
  glp_set_obj_coef(lp, 2, 6.0);

  ia[1] = 1;
  ja[1] = 1;
  ar[1] = 1.0;
  ia[2] = 1;
  ja[2] = 2;
  ar[2] = 1.0;
  ia[3] = 2;
  ja[3] = 1;
  ar[3] = 1.0;
  ia[4] = 2;
  ja[4] = 2;
  ar[4] = 0.0;
  ia[5] = 3;
  ja[5] = 1;
  ar[5] = 0.0;
  ia[6] = 3;
  ja[6] = 2;
  ar[6] = 1.0;
  glp_load_matrix(lp, 6, ia, ja, ar);

  glp_init_smcp(&parm);
  parm.msg_lev = GLP_MSG_OFF;

  if (glp_simplex(lp, &parm) == 0 && glp_get_status(lp) == GLP_OPT &&
      nearly_equal(glp_get_obj_val(lp), 76.0) &&
      nearly_equal(glp_get_col_prim(lp, 1), 4.0) &&
      nearly_equal(glp_get_col_prim(lp, 2), 6.0) &&
      glp_exact(lp, &parm) == 0 && glp_get_status(lp) == GLP_OPT &&
      nearly_equal(glp_get_obj_val(lp), 76.0)) {
    ok = 1;
  }

  glp_delete_prob(lp);
  return ok;
}

static int test_mip(void) {
  glp_prob *mip = glp_create_prob();
  glp_smcp smcp;
  glp_iocp iocp;
  int ia[5];
  int ja[5];
  double ar[5];
  int ok = 0;

  glp_set_obj_dir(mip, GLP_MAX);

  glp_add_rows(mip, 2);
  glp_set_row_bnds(mip, 1, GLP_UP, 0.0, 4.0);
  glp_set_row_bnds(mip, 2, GLP_UP, 0.0, 4.0);

  glp_add_cols(mip, 2);
  glp_set_col_bnds(mip, 1, GLP_LO, 0.0, 0.0);
  glp_set_col_bnds(mip, 2, GLP_LO, 0.0, 0.0);
  glp_set_col_kind(mip, 1, GLP_IV);
  glp_set_col_kind(mip, 2, GLP_IV);
  glp_set_obj_coef(mip, 1, 3.0);
  glp_set_obj_coef(mip, 2, 2.0);

  ia[1] = 1;
  ja[1] = 1;
  ar[1] = 2.0;
  ia[2] = 1;
  ja[2] = 2;
  ar[2] = 1.0;
  ia[3] = 2;
  ja[3] = 1;
  ar[3] = 1.0;
  ia[4] = 2;
  ja[4] = 2;
  ar[4] = 2.0;
  glp_load_matrix(mip, 4, ia, ja, ar);

  glp_init_smcp(&smcp);
  smcp.msg_lev = GLP_MSG_OFF;
  glp_init_iocp(&iocp);
  iocp.msg_lev = GLP_MSG_OFF;

  if (glp_simplex(mip, &smcp) == 0 && glp_intopt(mip, &iocp) == 0 &&
      glp_mip_status(mip) == GLP_OPT &&
      nearly_equal(glp_mip_obj_val(mip), 6.0) &&
      nearly_equal(glp_mip_col_val(mip, 1), 2.0) &&
      nearly_equal(glp_mip_col_val(mip, 2), 0.0)) {
    ok = 1;
  }

  glp_delete_prob(mip);
  return ok;
}

int main(void) {
  if (test_lp() && test_mip()) {
    puts("glpk-ok simplex=76 exact=76 mip=6");
    return 0;
  }
  return 1;
}
