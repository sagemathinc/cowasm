#include <isl/ctx.h>
#include <isl/map.h>
#include <isl/set.h>
#include <isl/val.h>

#include <stdio.h>

static long count_points(isl_set *set) {
  isl_val *count = isl_set_count_val(set);
  long value = isl_val_get_num_si(count);
  isl_val_free(count);
  return value;
}

int main(void) {
  isl_ctx *ctx = isl_ctx_alloc();
  isl_set *box = isl_set_read_from_str(ctx, "{ [i, j] : 0 <= i < 4 and 0 <= j < 3 }");
  isl_map *shift = isl_map_read_from_str(ctx, "{ [i, j] -> [i + j] }");
  isl_set *image;
  isl_set *expected;
  long box_count;
  long image_count;
  int ok;

  if (ctx == NULL || box == NULL || shift == NULL) {
    fputs("failed to initialize isl objects\n", stderr);
    isl_map_free(shift);
    isl_set_free(box);
    isl_ctx_free(ctx);
    return 1;
  }

  box_count = count_points(box);
  image = isl_set_apply(isl_set_copy(box), shift);
  image_count = count_points(image);
  expected = isl_set_read_from_str(ctx, "{ [k] : 0 <= k <= 5 }");

  ok = box_count == 12 && image_count == 6 &&
       isl_set_is_equal(image, expected) == isl_bool_true;

  isl_set_free(expected);
  isl_set_free(image);
  isl_set_free(box);
  isl_ctx_free(ctx);

  if (!ok) {
    fprintf(stderr, "unexpected isl result: box=%ld image=%ld\n", box_count,
            image_count);
    return 1;
  }

  puts("isl-ok box=12 image=6 affine=exact");
  return 0;
}
