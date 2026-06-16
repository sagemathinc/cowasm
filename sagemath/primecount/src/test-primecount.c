#include <primecount.h>

#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

int main(void) {
  primecount_set_num_threads(1);

  int64_t count_1e6 = primecount_pi(1000000);
  int64_t nth_1000 = primecount_nth_prime(1000);
  int64_t phi_100_4 = primecount_phi(100, 4);
  const char *version = primecount_version();

  char str_result[32] = {0};
  int str_len = primecount_pi_str("1000000", str_result, sizeof(str_result));

  int ok = count_1e6 == 78498 && nth_1000 == 7919 && phi_100_4 == 22;
  ok = ok && str_len == 5 && strcmp(str_result, "78498") == 0;
  ok = ok && version != NULL && version[0] != '\0';

  if (ok) {
    printf("primecount-ok pi(1e6)=%" PRId64 " nth1000=%" PRId64
           " phi100_4=%" PRId64 " pi-str=%s version=%s\n",
           count_1e6, nth_1000, phi_100_4, str_result, version);
  }

  return ok ? 0 : 1;
}
