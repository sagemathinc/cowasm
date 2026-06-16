#include <symmetrica.h>

#include <stdio.h>

static int check_factorial(void) {
  OP n = callocobject();
  OP result = callocobject();
  int ok;

  M_I_I(11, n);
  fakul(n, result);
  ok = S_I_I(result) == 39916800;

  freeall(result);
  freeall(n);

  return ok;
}

static int check_binom_pascal(void) {
  OP n = callocobject();
  OP n_minus_one = callocobject();
  OP k = callocobject();
  OP k_minus_one = callocobject();
  OP left = callocobject();
  OP right = callocobject();
  OP sum = callocobject();
  OP expected = callocobject();
  int ok = 1;

  copy_integer(cons_null, n);
  copy_integer(cons_null, n_minus_one);
  copy_integer(cons_null, k);
  copy_integer(cons_null, k_minus_one);

  for (INT big_n = 2; big_n <= 12 && ok; big_n++) {
    for (INT big_k = 1; big_k < big_n && ok; big_k++) {
      C_I_I(n, big_n);
      C_I_I(n_minus_one, big_n - 1);
      C_I_I(k, big_k);
      C_I_I(k_minus_one, big_k - 1);

      binom(n, k, expected);
      binom(n_minus_one, k_minus_one, left);
      binom(n_minus_one, k, right);
      add(left, right, sum);
      ok = eq(sum, expected);
    }
  }

  freeall(expected);
  freeall(sum);
  freeall(right);
  freeall(left);
  freeall(k_minus_one);
  freeall(k);
  freeall(n_minus_one);
  freeall(n);

  return ok;
}

static int check_first_partition(void) {
  OP seven;
  OP expected = callocobject();
  OP actual = callocobject();
  int ok;

  NEW_INTEGER(seven, 7);
  first_partition(seven, expected);
  first(PARTITION, actual, seven);
  ok = eq(actual, expected);

  freeall(actual);
  freeall(expected);
  freeall(seven);

  return ok;
}

static int add_schur_term(OP vector, OP partition, OP coeff, OP terms,
                          INT length, INT a, INT b, INT c, INT multiplicity) {
  m_il_v(length, vector);
  M_I_I(a, S_V_I(vector, 0));
  if (length > 1) {
    M_I_I(b, S_V_I(vector, 1));
  }
  if (length > 2) {
    M_I_I(c, S_V_I(vector, 2));
  }

  m_v_pa(vector, partition);
  M_I_I(multiplicity, coeff);
  return m_skn_s(partition, coeff, S_O_K(terms) == EMPTY ? NULL : terms, terms);
}

static int check_schur_product(void) {
  OP vector = callocobject();
  OP partition = callocobject();
  OP coeff = callocobject();
  OP lhs = callocobject();
  OP rhs = callocobject();
  OP actual = callocobject();
  OP expected = callocobject();
  int ok = 1;

  add_schur_term(vector, partition, coeff, expected, 2, 2, 2, 0, 1);
  add_schur_term(vector, partition, coeff, expected, 2, 3, 1, 0, 1);
  add_schur_term(vector, partition, coeff, expected, 3, 2, 1, 1, 1);

  m_il_v(2, vector);
  M_I_I(2, S_V_I(vector, 0));
  M_I_I(1, S_V_I(vector, 1));
  m_v_pa(vector, lhs);

  m_il_v(1, vector);
  M_I_I(1, S_V_I(vector, 0));
  m_v_pa(vector, rhs);

  ok = mult_schur_schur(lhs, rhs, actual) == OK && eq(actual, expected);

  freeall(expected);
  freeall(actual);
  freeall(rhs);
  freeall(lhs);
  freeall(coeff);
  freeall(partition);
  freeall(vector);

  return ok;
}

int main(void) {
  int factorial_ok;
  int binom_ok;
  int partition_ok;
  int schur_ok;
  int ok;

  anfang();
  factorial_ok = check_factorial();
  if (!factorial_ok) {
    puts("symmetrica factorial check failed");
  }
  binom_ok = check_binom_pascal();
  if (!binom_ok) {
    puts("symmetrica binomial check failed");
  }
  partition_ok = check_first_partition();
  if (!partition_ok) {
    puts("symmetrica partition check failed");
  }
  schur_ok = check_schur_product();
  if (!schur_ok) {
    puts("symmetrica schur check failed");
  }
  ende();

  ok = factorial_ok && binom_ok && partition_ok && schur_ok;
  if (ok) {
    puts("symmetrica-ok factorial=39916800 pascal schur=3");
  }

  return ok ? 0 : 1;
}
