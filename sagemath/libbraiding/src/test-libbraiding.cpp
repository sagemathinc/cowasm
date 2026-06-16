#include <braiding.h>

#include <iostream>
#include <list>

int main() {
  std::list<CBraid::sint16> word = {1, 2, 1, -2};
  CBraid::ArtinBraid braid = Braiding::WordToBraid(word, 3);
  braid.MakeLCF();

  auto left = Braiding::LeftNormalForm(3, word);
  if (braid.Index() != 3 || Braiding::CL(braid) != 1 ||
      Braiding::Sup(braid) != 1 || left.size() != 2) {
    std::cerr << "unexpected libbraiding left normal form result\n";
    return 1;
  }

  std::list<CBraid::sint16> conjugate_word = {2, 1, -2, 1};
  CBraid::ArtinBraid conjugate = Braiding::WordToBraid(conjugate_word, 3);
  conjugate.MakeLCF();

  CBraid::ArtinBraid conjugator(3);
  if (!Braiding::AreConjugate(braid, conjugate, conjugator)) {
    std::cerr << "expected braids to be conjugate\n";
    return 1;
  }

  std::cout << "libbraiding-ok index=" << braid.Index()
            << " canonical-length=" << Braiding::CL(braid)
            << " supremum=" << Braiding::Sup(braid)
            << " conjugator-length=" << Braiding::CL(conjugator) << "\n";
  return 0;
}
