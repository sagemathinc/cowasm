#include <histedit.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
  History *hist;
  HistEvent ev;
  Tokenizer *tok;
  LineInfo line;
  const char *argv_buffer[] = {"alpha", "beta gamma", 0};
  const char **argv = argv_buffer;
  int argc = 0;
  int cursor_arg = -1;
  int cursor_offset = -1;
  int status;

  hist = history_init();
  if (hist == 0) return 1;
  if (history(hist, &ev, H_SETSIZE, 8) == -1) return 2;
  if (history(hist, &ev, H_ENTER, "factor 2023\n") == -1) return 3;
  if (history(hist, &ev, H_LAST) == -1) return 4;
  if (strcmp(ev.str, "factor 2023\n") != 0) return 5;

  tok = tok_init(0);
  if (tok == 0) return 6;

  line.buffer = "alpha 'beta gamma'";
  line.cursor = line.buffer + strlen(line.buffer);
  line.lastchar = line.cursor;

  status = tok_line(tok, &line, &argc, &argv, &cursor_arg, &cursor_offset);
  if (status != 0) return 7;
  if (argc != 2) return 8;
  if (strcmp(argv[0], "alpha") != 0) return 9;
  if (strcmp(argv[1], "beta gamma") != 0) return 10;
  if (cursor_arg != 1) return 11;
  if (cursor_offset != 10) return 12;

  tok_end(tok);
  history_end(hist);
  return 0;
}
