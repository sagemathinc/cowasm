#include <atomic_ops.h>
#include <atomic_ops_stack.h>

#include <stdio.h>

int main(void) {
  volatile AO_t value = 7;
  AO_t before = AO_fetch_and_add1(&value);
  int cas_ok = AO_compare_and_swap(&value, 8, 42);
  AO_TS_t lock = AO_TS_INITIALIZER;
  AO_TS_VAL_t first_lock = AO_test_and_set(&lock);
  AO_CLEAR(&lock);

  AO_stack_t stack = AO_STACK_INITIALIZER;
  AO_t node_a[2] = {0, 101};
  AO_t node_b[2] = {0, 202};
  AO_stack_push(&stack, node_a);
  AO_stack_push(&stack, node_b);
  AO_t *popped_b = AO_stack_pop(&stack);
  AO_t *popped_a = AO_stack_pop(&stack);

  if (before == 7 && value == 42 && cas_ok && first_lock == AO_TS_CLEAR &&
      popped_b == node_b && popped_a == node_a) {
    puts("libatomic-ops-ok fetch_add cas test_set stack");
    return 0;
  }

  printf("unexpected atomic_ops result: before=%lu value=%lu cas=%d lock=%d\n",
         (unsigned long)before, (unsigned long)value, cas_ok, (int)first_lock);
  return 1;
}
