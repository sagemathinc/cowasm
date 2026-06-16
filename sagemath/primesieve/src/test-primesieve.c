#include <primesieve.h>

#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>

int main(void) {
  size_t size = 0;
  uint64_t count_1e6 = primesieve_count_primes(0, 1000000);
  uint64_t count_window = primesieve_count_primes(1000000, 1000100);
  uint64_t nth = primesieve_nth_prime(1000, 0);
  uint64_t *primes =
      (uint64_t *)primesieve_generate_primes(7900, 7920, &size, UINT64_PRIMES);

  int ok = count_1e6 == 78498 && count_window == 6 && nth == 7919;
  ok = ok && size == 3 && primes != NULL;
  if (primes != NULL) {
    ok = ok && primes[0] == 7901 && primes[1] == 7907 && primes[2] == 7919;
  }

  if (ok) {
    printf("primesieve-ok pi(1e6)=%" PRIu64 " nth1000=%" PRIu64
           " window-count=%" PRIu64 " generated=%zu\n",
           count_1e6, nth, count_window, size);
  }

  primesieve_free(primes);
  return ok ? 0 : 1;
}
