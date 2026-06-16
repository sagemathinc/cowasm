#include <stdio.h>

#include "constants.h"
#include "interactive.h"

using bits::LFlags;
using coxtypes::CoxWord;
using coxtypes::Generator;

static int has_flag(LFlags flags, unsigned generator) {
  return (flags & (1UL << generator)) != 0;
}

int main(void) {
  constants::initConstants();

  coxeter::Type type("B");
  coxeter::CoxGroup *group = interactive::coxeterGroup(type, 2);
  if (group == NULL) {
    puts("coxeter3: failed to allocate B2");
    return 1;
  }

  CoxWord word(0);
  group->prod(word, static_cast<Generator>(0));
  group->prod(word, static_cast<Generator>(1));
  group->prod(word, static_cast<Generator>(0));
  group->prod(word, static_cast<Generator>(1));

  LFlags longest_left = group->ldescent(word);
  LFlags longest_right = group->rdescent(word);
  int ok = group->order() == 8 && word.length() == 4 &&
           has_flag(longest_left, 0) && has_flag(longest_left, 1) &&
           has_flag(longest_right, 0) && has_flag(longest_right, 1);

  group->prod(word, static_cast<Generator>(1));
  LFlags shortened_descent = group->descent(word);
  ok = ok && word.length() == 3 && has_flag(shortened_descent, 0) &&
       !has_flag(shortened_descent, 1) && has_flag(shortened_descent, 2) &&
       !has_flag(shortened_descent, 3);

  if (!ok) {
    printf("coxeter3: unexpected B2 result order=%lu length=%u "
           "longest-left=%lu longest-right=%lu shortened-descent=%lu\n",
           static_cast<unsigned long>(group->order()),
           static_cast<unsigned>(word.length()),
           static_cast<unsigned long>(longest_left),
           static_cast<unsigned long>(longest_right),
           static_cast<unsigned long>(shortened_descent));
    return 1;
  }

  puts("coxeter3-ok b2-order=8 longest-length=4 descent-after-s2=5");
  return 0;
}
