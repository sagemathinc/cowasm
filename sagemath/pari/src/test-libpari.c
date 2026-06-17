#include <pari/pari.h>
#include <stdio.h>

int main(void) {
  pari_init(8000000, 2);

  GEN value = stoi(7);
  value = gmulgs(value, 17);
  value = gmulgs(value, 17);

  long result = itos(value);
  pari_close();

  if (result != 2023) {
    fprintf(stderr, "unexpected PARI result: %ld\n", result);
    return 1;
  }

  printf("libpari result: %ld\n", result);
  return 0;
}
