/*
We implement these (or stub them) in our runtime, but there's no headers available with them
and declarations are required now for clang 15.  So we defined them here.  This may get
refactored.
*/

int mkstemp(char *template);
pid_t fork(void);
int execlp(const char *file, const char *arg, ...);
int fchmod(int fd, mode_t mode);
uid_t getuid(void);
int execvp(const char *file, char *const argv[]);
