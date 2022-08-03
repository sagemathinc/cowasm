import debug from "debug";
const log = debug("stub");

export default function stubProxy(env, traceStub: boolean | "first" = false) {
  return new Proxy(env, {
    get(target, key) {
      if (key in target) {
        return Reflect.get(target, key);
      }
      // we ALWAYS log creating the stub.  traceStub determines if we print when using the stub.
      log("creating stub", key);
      if (traceStub) {
        log("creating stub", key);
        return (...args) => {
          stub(key, args, traceStub == "first");
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
function stub(functionName, args, firstOnly) {
  if (firstOnly) {
    if (stubUsed.has(functionName)) return;
    stubUsed.add(functionName);
  }
  log('using stub', functionName, args);
}
