#include "app.h"

extern int provider_value;

EXPORTED_SYMBOL
int add_provider_data_relocation(int n) {
  return n + provider_value;
}

