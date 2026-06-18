#include <primecount.hpp>

#include <cstdint>
#include <exception>
#include <iostream>
#include <string>

int main() {
  primecount::set_num_threads(1);

  int64_t count_1e6 = primecount::pi(1000000);
  int64_t nth_5000 = primecount::nth_prime(5000);
  int64_t phi_1000_5 = primecount::phi(1000, 5);
  std::string count_str = primecount::pi(std::string("1000000"));
  std::string max_x = primecount::get_max_x();
  std::string version = primecount::primecount_version();

  bool caught_error = false;
  try {
    (void)primecount::pi(std::string("not-an-integer"));
  } catch (const primecount::primecount_error &) {
    caught_error = true;
  } catch (const std::exception &) {
    return 1;
  }

  bool ok = count_1e6 == 78498 && nth_5000 == 48611 &&
            phi_1000_5 == 207 && count_str == "78498" &&
            !max_x.empty() && !version.empty() && caught_error &&
            primecount::get_num_threads() == 1;

  if (ok) {
    std::cout << "primecount-cpp-ok pi(1e6)=" << count_1e6
              << " nth5000=" << nth_5000 << " phi1000_5=" << phi_1000_5
              << " pi-str=" << count_str << " max-x=" << max_x
              << " version=" << version << "\n";
  }

  return ok ? 0 : 1;
}
