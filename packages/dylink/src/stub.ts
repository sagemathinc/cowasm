import debug from "debug";
const log = debug("stub");
const logUse = debug("stub:use"); // log all use of the stub
const logFirst = debug("stub:first"); // log first use of the stub

export default function stubProxy(env, functionViaPointer: (ptr) => Function | undefined) {
  return new Proxy(env, {
    get(target, key) {
      if (key in target) {
        return Reflect.get(target, key);
      }
      const f = functionViaPointer(key);
      if (f != null) {
        log("using function via pointer for ", key);
        return f;
      }
      console.warn(`\n* WARNING: creating UNSAFE stub for ${String(key)}.  Please fix ASAP!`);
      if (logUse.enabled || logFirst.enabled) {
        return (...args) => {
          logStubUse(key, args);
          return 0;
        };
      } else {
        // faster to not trace or even check, obviously.
        return () => 0;
      }
    },
  });
}

const stubUsed = new Set<string>([]);
function logStubUse(functionName, args) {
  logUse("WARNING: using stub", functionName, args);
  if (logFirst.enabled) {
    if (stubUsed.has(functionName)) return;
    stubUsed.add(functionName);
  }
  logFirst("WARNING: first use of stub", functionName, args);
}
