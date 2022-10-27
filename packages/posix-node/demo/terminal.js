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
