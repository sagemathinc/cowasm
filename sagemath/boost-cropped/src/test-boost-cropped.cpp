#include <boost/dynamic_bitset.hpp>
#include <boost/functional/hash.hpp>
#include <boost/intrusive_ptr.hpp>
#include <boost/preprocessor/stringize.hpp>
#include <boost/scoped_array.hpp>
#include <boost/version.hpp>

#include <iostream>

struct counted {
  counted() : refs(0) {}
  int refs;
};

void intrusive_ptr_add_ref(counted *value) {
  ++value->refs;
}

void intrusive_ptr_release(counted *value) {
  --value->refs;
  if (value->refs == 0) {
    delete value;
  }
}

int main() {
  static_assert(BOOST_VERSION == 106600, "unexpected Boost version");

  boost::dynamic_bitset<> bits(8);
  bits.set(1);
  bits.set(5);

  boost::intrusive_ptr<counted> ptr(new counted());
  boost::scoped_array<int> values(new int[2]);
  values[0] = 17;
  values[1] = 25;

  std::size_t seed = 0;
  boost::hash_combine(seed, values[0]);
  boost::hash_combine(seed, values[1]);

  if (bits.count() != 2 || ptr->refs != 1 || seed == 0) {
    return 1;
  }

  std::cout << "boost-cropped-ok version=" << BOOST_LIB_VERSION
            << " bits=" << bits.count()
            << " refs=" << ptr->refs
            << " token=" << BOOST_PP_STRINGIZE(cowasm) << std::endl;
  return 0;
}
