#include <primesieve.h>
#include <primesieve/iterator.h>

#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>

int main(void) {
  size_t size = 0;
  uint64_t count_twins_100 = primesieve_count_twins(0, 100);
  uint64_t count_1e6 = primesieve_count_primes(0, 1000000);
  uint64_t count_window = primesieve_count_primes(1000000, 1000100);
  uint64_t nth = primesieve_nth_prime(1000, 0);
  uint64_t *primes =
      (uint64_t *)primesieve_generate_primes(7900, 7920, &size, UINT64_PRIMES);
  uint64_t *next_primes =
      (uint64_t *)primesieve_generate_n_primes(4, 30, UINT64_PRIMES);
  primesieve_iterator it;

  int ok = count_1e6 == 78498 && count_window == 6 && nth == 7919;
  ok = ok && count_twins_100 == 8;
  ok = ok && size == 3 && primes != NULL;
  if (primes != NULL) {
    ok = ok && primes[0] == 7901 && primes[1] == 7907 && primes[2] == 7919;
  }
  ok = ok && next_primes != NULL;
  if (next_primes != NULL) {
    ok = ok && next_primes[0] == 31 && next_primes[1] == 37 &&
         next_primes[2] == 41 && next_primes[3] == 43;
  }

  primesieve_init(&it);
  primesieve_jump_to(&it, 100, 200);
  uint64_t next_100 = primesieve_next_prime(&it);
  uint64_t next_101 = primesieve_next_prime(&it);
  primesieve_jump_to(&it, 100, 0);
  uint64_t prev_100 = primesieve_prev_prime(&it);
  ok = ok && !it.is_error && next_100 == 101 && next_101 == 103 &&
       prev_100 == 97;
  primesieve_free_iterator(&it);

  if (ok) {
    printf("primesieve-ok pi(1e6)=%" PRIu64 " nth1000=%" PRIu64
           " twins100=%" PRIu64 " window-count=%" PRIu64
           " generated=%zu next4=%" PRIu64 ",%" PRIu64 ",%" PRIu64 ",%" PRIu64
           " iterator=%" PRIu64 ",%" PRIu64 ",%" PRIu64 "\n",
           count_1e6, nth, count_twins_100, count_window, size,
           next_primes[0], next_primes[1], next_primes[2], next_primes[3],
           next_100, next_101, prev_100);
  }

  primesieve_free(primes);
  primesieve_free(next_primes);
  return ok ? 0 : 1;
}
