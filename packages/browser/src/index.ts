import * as debug from "debug";
const log = debug("browser:index");

import kernel from "./kernel";
import python from "./python";

async function main() {
  //await kernel();
  await python();

}

main();
