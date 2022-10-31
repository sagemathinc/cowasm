const link = document.createElement("div");
link.innerHTML =
  "<div style='text-align:center;margin-bottom:15px;color:#555'><h3>CoWasm Python-Wasm Demo&nbsp;&nbsp;-&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://www.npmjs.com/package/python-wasm'>npm</a>&nbsp;&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://github.com/sagemathinc/cowasm#readme'/>GitHub</a></h3>CoWasm: Collaborative WebAssembly for servers and browsers.  An alternative to Emscripten that is built using <a href='https://ziglang.org/'>Zig</a>.<br/>This is a demo of the <a href='https://www.npmjs.com/package/python-wasm'>python-wasm component</a>, which currently includes numpy and sympy (try <tt>import numpy</tt> below!).  Also, control+c to interrupt and time.sleep are supported.<br/></div>";
document.body.appendChild(link);
const element = document.createElement("div");
document.body.appendChild(element);
document.body.style.margin = "0px";

import terminal from "./terminal";

async function main() {
  while (true) {
    element.innerHTML = "";
    await terminal(element);
  }
}

main();
