/*

Hello world of ncurses, from
https://tldp.org/HOWTO/pdf/NCURSES-Programming-HOWTO.pdf

*/

#include <ncurses.h>

int main(int argc, char *argv[]) {
  initscr();                  /* Start curses mode */
  printw("Hello CoWasm !!!\n"); /* Print Hello World */
  refresh();                  /* Print it on to the real screen */
  getch();                    /* Wait for user input */
  endwin();                   /* End curses mode */
  return 0;
}
