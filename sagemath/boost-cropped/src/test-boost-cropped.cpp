#include <boost/dynamic_bitset.hpp>
#include <boost/functional/hash.hpp>
#include <boost/graph/adjacency_list.hpp>
#include <boost/graph/connected_components.hpp>
#include <boost/intrusive_ptr.hpp>
#include <boost/multiprecision/cpp_int.hpp>
#include <boost/preprocessor/stringize.hpp>
#include <boost/rational.hpp>
#include <boost/scoped_array.hpp>
#include <boost/version.hpp>

#include <iostream>
#include <vector>

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

  boost::multiprecision::cpp_int big = boost::multiprecision::cpp_int(1) << 80;
  big += 12345;
  boost::multiprecision::cpp_int low_bits = big & 0xffff;
  unsigned long low_word = low_bits.convert_to<unsigned long>();
  bool big_ok = (big > (boost::multiprecision::cpp_int(1) << 79)) &&
                low_word == 12345;

  boost::rational<int> ratio(6, 8);
  ratio += boost::rational<int>(1, 4);
  bool rational_ok = ratio == boost::rational<int>(1, 1);

  typedef boost::adjacency_list<boost::vecS, boost::vecS, boost::undirectedS> graph_type;
  graph_type graph(5);
  add_edge(0, 1, graph);
  add_edge(1, 2, graph);
  add_edge(3, 4, graph);
  std::vector<int> components(num_vertices(graph));
  int component_count = boost::connected_components(graph, &components[0]);
  bool graph_ok = component_count == 2 && components[0] == components[2] &&
                  components[0] != components[3] && components[3] == components[4];

  if (bits.count() != 2 || ptr->refs != 1 || seed == 0 || !big_ok ||
      !rational_ok || !graph_ok) {
    return 1;
  }

  std::cout << "boost-cropped-ok version=" << BOOST_LIB_VERSION
            << " bits=" << bits.count()
            << " refs=" << ptr->refs
            << " big-low=" << low_word
            << " ratio=" << ratio.numerator() << "/" << ratio.denominator()
            << " components=" << component_count
            << " token=" << BOOST_PP_STRINGIZE(cowasm) << std::endl;
  return 0;
}
