// node fork.js

const { dup2, execv, fork, waitpid, pipe } = require("..");
if (
  // for typescript
  dup2 == null ||
  execv == null ||
  fork == null ||
  waitpid == null ||
  pipe == null
) {
  throw Error("bug");
}
const { closeSync, readSync, writeSync, fsyncSync } = require("fs");

//execv("/bin/ls", ["/bin/ls"]);

const stdin = pipe();
const stdout = pipe();
const stderr = pipe();
const pid = fork();
const HELLO = "hello";

if (pid == 0) {
  // child
  console.log("hi from child");
  dup2(stdin.readfd, 0);
  dup2(stdout.writefd, 1);

  closeSync(stdin.writefd);
  closeSync(stdin.readfd);
  closeSync(stdout.writefd);
  closeSync(stdout.readfd);

  // connect up stdin and stdout
  //execv("/bin/echo", ["/bin/echo", HELLO]);
  console.log("doing execv");

 // execv("/bin/cat", ["/bin/cat"]);

  execv("/usr/bin/tr", [
    "/usr/bin/tr",
    "abcdefghijklmnopqrstuvwxyz",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ]);
} else {
  // parent
  console.log("hi from parent, child=", pid);
  //setTimeout(() => {
  let b = Buffer.alloc(10000);
  console.log("write to child");
  writeSync(stdin.writefd, HELLO);
  console.log("close stdin");
  closeSync(stdin.writefd);
  console.log("read output from the child...");
  readSync(stdout.readfd, b);
  const s = b.toString("utf8", 0, HELLO.length);
  console.log("s = ", s);
  console.log("waiting for child to end...");
  console.log(waitpid(pid, 0));
  // }, 1000);
}
