#include <string>
#include <typeinfo>

namespace {
struct Base {
  virtual ~Base() {}
};

struct Derived : Base {};
}

extern "C" __attribute__((visibility("default"))) int string_size(const char* s) {
  std::string x(s);
  x += "!";
  return (int)x.size();
}

extern "C" __attribute__((visibility("default"))) int rtti_matches() {
  Derived derived;
  Base* base = &derived;
  return dynamic_cast<Derived*>(base) != nullptr && typeid(*base) == typeid(Derived);
}
