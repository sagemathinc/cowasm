#include <gc.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

typedef struct Node {
  struct Node *next;
  int value;
} Node;

static int finalizer_seen = 0;

static void finalizer(void *obj, void *client_data) {
  (void)obj;
  finalizer_seen = (int)(intptr_t)client_data;
}

int main(void) {
  GC_INIT();

  Node *head = GC_MALLOC(sizeof(*head));
  if (head == NULL) {
    return 1;
  }
  head->value = 1;
  head->next = NULL;

  for (int i = 2; i <= 32; i++) {
    Node *node = GC_MALLOC(sizeof(*node));
    if (node == NULL) {
      return 2;
    }
    node->value = i;
    node->next = head;
    head = node;
  }

  int sum = 0;
  for (Node *node = head; node != NULL; node = node->next) {
    sum += node->value;
  }

  char *atomic = GC_MALLOC_ATOMIC(16);
  if (atomic == NULL) {
    return 3;
  }
  strcpy(atomic, "wasi-gc");

  int *values = GC_MALLOC(8 * sizeof(*values));
  if (values == NULL) {
    return 4;
  }
  for (int i = 0; i < 8; i++) {
    values[i] = i + 1;
  }

  values = GC_REALLOC(values, 16 * sizeof(*values));
  if (values == NULL) {
    return 5;
  }
  for (int i = 8; i < 16; i++) {
    values[i] = i + 1;
  }

  int realloc_sum = 0;
  for (int i = 0; i < 16; i++) {
    realloc_sum += values[i];
  }
  GC_FREE(values);

  void *watched = GC_MALLOC(32);
  if (watched == NULL) {
    return 6;
  }
  GC_REGISTER_FINALIZER(watched, finalizer, (void *)(intptr_t)17, NULL, NULL);
  watched = NULL;
  GC_gcollect();
  GC_invoke_finalizers();

  if (sum != 528 || strcmp(atomic, "wasi-gc") != 0 || realloc_sum != 136 ||
      finalizer_seen != 17) {
    fprintf(stderr,
            "unexpected gc result: sum=%d atomic=%s realloc=%d finalizer=%d\n",
            sum, atomic, realloc_sum, finalizer_seen);
    return 7;
  }

  printf("gc-ok sum=%d atomic=%s realloc=%d finalizer=%d\n", sum, atomic,
         realloc_sum, finalizer_seen);
  return 0;
}
