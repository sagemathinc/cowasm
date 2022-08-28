import posix from "./index";

test("posix_spawn /bin/sleep and wait for it to finish using waitpid and confirm the time", () => {
  const t0 = new Date().valueOf();
  const pid = posix?.posix_spawn?.(
    "/bin/sleep",
    null,
    null,
    ["/bin/sleep", "0.5"],
    {}
  );
  if (pid == null) {
    throw Error("pid must be a positive integer");
  }
  const x = posix?.waitpid?.(pid, 0);
  if (x == null) {
    throw Error("waitpid must return something");
  }
  const { ret, wstatus } = x;
  expect(ret).toBe(pid);
  expect(wstatus).toBe(0);
  const tm = new Date().valueOf() - t0;
  expect(tm > 400 && tm < 1000).toBe(true);
});

test("posix_spawnp sleep and wait for it to finish using waitpid and confirm the time", () => {
  const t0 = new Date().valueOf();
  const pid = posix?.posix_spawnp?.("sleep", null, null, ["sleep", "0.5"], {});
  if (pid == null) {
    throw Error("pid must be a positive integer");
  }
  const x = posix?.waitpid?.(pid, 0);
  if (x == null) {
    throw Error("waitpid must return something");
  }
  const { ret, wstatus } = x;
  expect(ret).toBe(pid);
  expect(wstatus).toBe(0);
  const tm = new Date().valueOf() - t0;
  expect(tm > 400 && tm < 1000).toBe(true);
});
