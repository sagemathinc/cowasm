export default function stdlib({ child_process, recvString }) {
  return {
    // int system(const char *command);
    // This below is not exactly like system because it runs until the command completes with no visible output
    // until it completes.
    // TODO: this only works once then gets totally broken when using webworkers!  It works fine
    // for the blocking version only.
    system: (commandPtr): number => {
      if (child_process.spawnSync == null) {
        throw Error("system is not implemented yet");
      }
      const command = recvString(commandPtr);
      const { stdout, stderr, status } = child_process.spawnSync(command, {
        shell: true,
      });
      console.log(stdout.toString());
      console.warn(stderr.toString());
      return status;
    },
  };
}
