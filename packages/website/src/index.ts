import terminal from "./terminal";
import favicon from "./favicon.ico";

const link = document.createElement("div");
link.innerHTML =
  `<div style='text-align:center;margin-bottom:15px;color:#555'><h3><img width="24px" height="24px" src="${favicon}" style="float:left; margin-left:15px"/> CoWasm Python-Wasm Demo&nbsp;&nbsp;-&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://www.npmjs.com/package/python-wasm'>npm</a>&nbsp;&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://github.com/sagemathinc/cowasm#readme'/>GitHub</a></h3>CoWasm: Collaborative WebAssembly for servers and browsers.  An alternative to Emscripten that is built using <a  target='_blank' href='https://ziglang.org/'>Zig</a>.<br/>There is also a <a href='https://cowasm.sh' target='_blank'>CoWasm Shell demo</a>.</div>`;
document.body.appendChild(link);
const element = document.createElement("div");
document.body.appendChild(element);
document.body.style.margin = "0px";

const favlink = document.createElement("link");
favlink.rel = "icon";
favlink.href = favicon;
document.getElementsByTagName("head")[0].appendChild(favlink);

async function main() {
  while (true) {
    element.innerHTML = "";
    await terminal(element);
  }
}

main();
