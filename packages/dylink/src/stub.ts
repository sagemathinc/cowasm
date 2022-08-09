import debug from "debug";
const log = debug("stub");

export default function stubProxy(
  env,
  functionViaPointer: (ptr) => Function,
  traceStub: boolean | "first" = false
) {
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
      // we ALWAYS log creating the stub.  traceStub determines if we print when using the stub.
      log("creating stub", key);
      if (traceStub) {
        log("creating stub", key);
        return (...args) => {
          logStubUse(key, args, traceStub == "first");
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
function logStubUse(functionName, args, firstOnly) {
  if (firstOnly) {
    if (stubUsed.has(functionName)) return;
    stubUsed.add(functionName);
  }
  console.warn(
    "WARNING: using stub",
    functionName,
    args,
    firstOnly ? " -- only showing once" : ""
  );
}
