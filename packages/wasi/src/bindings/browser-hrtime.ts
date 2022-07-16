/*
This is https://github.com/cabinjs/browser-hrtime/blob/master/src/index.ts
but modified to not use window, since I want to use this in a WebWorker.
Upstream is MIT license.

This also doesn't define any global variables.
*/

const _perfomancePolyfill = () => {
  // based on https://gist.github.com/paulirish/5438650 copyright Paul Irish 2015.
  if (!("performance" in self)) {
    (self.performance as any) = {};
  }

  Date.now =
    Date.now ||
    (() => {
      // thanks IE8
      return new Date().getTime();
    });

  if ("now" in self.performance === false) {
    let nowOffset = Date.now();

    if (performance.timing && performance.timing.navigationStart) {
      nowOffset = performance.timing.navigationStart;
    }

    self.performance.now = () => Date.now() - nowOffset;
  }
};

const _hrtime = (previousTimestamp?: [number, number]): [number, number] => {
  _perfomancePolyfill();
  const baseNow = Math.floor((Date.now() - performance.now()) * 1e-3);
  const clocktime = performance.now() * 1e-3;
  let seconds = Math.floor(clocktime) + baseNow;
  let nanoseconds = Math.floor((clocktime % 1) * 1e9);

  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds < 0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [seconds, nanoseconds];
};
const NS_PER_SEC: number = 1e9;
_hrtime.bigint = (time?: [number, number]): bigint => {
  const diff = _hrtime(time);
  return (diff[0] * NS_PER_SEC + diff[1]) as unknown as bigint;
};
export default _hrtime;
