#include <string>
#include <iostream>
#include <sstream>
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

extern "C" __attribute__((visibility("default"))) int ostream_formats() {
  std::ostringstream out;
  out << "ntl diagnostic " << 17;
  return out.str() == "ntl diagnostic 17";
}

extern "C" __attribute__((visibility("default"))) int cerr_writes() {
  std::cerr << "cowasm cxx-runtime cerr smoke" << std::endl;
  return 1;
}
