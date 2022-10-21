/*
Functions from sched.h.

These are all very hard to implement with node, without just writing a node extension
module which is what I'll likely have to do...
*/

import { notImplemented } from "./util";

export default function sched({}) {
  const names =
    "sched_get_priority_max sched_get_priority_min sched_getparam sched_getscheduler sched_rr_get_interval sched_setparam sched_setscheduler";
  const sched: any = {};
  for (const name of names.split(/\s+/)) {
    sched[name] = () => notImplemented(name);
  }
  return sched;
}
