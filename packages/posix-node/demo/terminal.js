/*
Example of using setEcho and getChar from pour posix library.

NOTE: You can accomplish basically the same thing as this demo in pure node as explained at

https://stackoverflow.com/questions/5006821/nodejs-how-to-read-keystrokes-from-stdin

*/

const posix = require("..");
posix.setEcho(false);
console.log(
  "This is a little terminal that capitalizes whatever you type, as you type it."
);
console.log("Hit ctrl+c or ctrl+d to exit, and of course this is not burning cpu while waiting for input.");
console.log("You can usé utf-8: 😀");

while (true) {
  const t = posix.getChar();
  if (t.charCodeAt(0) == 4) break;
  process.stdout.write(t.toUpperCase());
}
