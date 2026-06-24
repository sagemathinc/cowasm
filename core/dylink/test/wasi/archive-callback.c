#include <stdint.h>

static int archive_callback_value = 0;

static void default_archive_callback(long value) {
  archive_callback_value = (int)value + 17;
}

void (*archive_callback)(long) = default_archive_callback;

int archive_callback_probe(long value) {
  archive_callback_value = 0;
  archive_callback(value);
  return archive_callback_value;
}
