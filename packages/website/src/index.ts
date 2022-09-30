const link = document.createElement("div");
link.innerHTML =
  "<div style='text-align:center;margin-bottom:15px;color:#666'><h3>Zython&nbsp;&nbsp;-&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://www.npmjs.com/package/python-wasm'>npm</a>&nbsp;&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://github.com/sagemathinc/zython#readme'/>GitHub</a></h3>Zython is WebAssembly Python for servers and browsers. Built using Zig. Supports extension modules such as numpy and posix subprocesses (not in this browser demo yet). Does not use Emscripten.<br/></div>";
document.body.appendChild(link);
const element = document.createElement("div");
document.body.appendChild(element);
document.body.style.margin = "0px";

async function main() {
  element.innerHTML = "";
  const { terminal } = await import("./terminal");
  terminal(element);
}

main();
