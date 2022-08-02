import debug from "debug";
const log = debug("dylink:stub");

export default function stubProxy(env, traceStub: boolean | "first" = false) {
  return new Proxy(env, {
    get(target, key) {
      if (key in target) {
        return Reflect.get(target, key);
      }
      if (traceStub) {
        log("creating", key);
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
  log(functionName, args);
}
