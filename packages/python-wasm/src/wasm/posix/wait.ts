// The wait functions all just succeed and return 0, since currently there
// is nothing implemented to spawn processes, so we never get to the point of waiting
// for a subprocess to have some property.   We do plan to implement spawning children
// and the waits below using nodejs when running on node.js.  In the browser, something
// could also be done using separate webassembly workers.

export default function wait({}) {
  return {
    wait: (): number => {
      return 0;
    },

    waitid: (): number => {
      return 0;
    },

    waitpid: (): number => {
      return 0;
    },
  };
}
