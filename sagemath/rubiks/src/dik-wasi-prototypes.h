#ifndef COWASM_RUBIKS_DIK_WASI_PROTOTYPES_H
#define COWASM_RUBIKS_DIK_WASI_PROTOTYPES_H

void init_phase1(void);
void init_phase2(void);
int init_phase1_cube(void);
int init_phase2_cube(void);
void set_cube(void);
int perm_cube(void);
int prnt_sol(void);
int phase1(int max_todo);
int phase2(int max_todo, int dont1, int dont2);

#endif
