#include <stdint.h>

static int archive_callback_value = 0;

static void default_archive_callback(long value) {
  archive_callback_value = (int)value + 17;
}

void (*archive_callback)(long) = default_archive_callback;
void (*archive_runtime_callback)(long) = 0;

int archive_callback_probe(long value) {
  archive_callback_value = 0;
  archive_callback(value);
  return archive_callback_value;
}

void archive_set_runtime_callback(void) {
  archive_runtime_callback = default_archive_callback;
}

int archive_runtime_callback_probe(long value) {
  archive_callback_value = 0;
  archive_set_runtime_callback();
  archive_runtime_callback(value);
  return archive_callback_value;
}
