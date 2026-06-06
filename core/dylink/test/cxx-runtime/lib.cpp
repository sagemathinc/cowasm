#include <string>

extern "C" __attribute__((visibility("default"))) int string_size(const char* s) {
  std::string x(s);
  x += "!";
  return (int)x.size();
}
