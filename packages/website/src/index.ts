import terminal from "./terminal";

const link = document.createElement("div");
link.innerHTML =
  "<div style='text-align:center'><h3 style='color:#666'>python-wasm&nbsp;&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://www.npmjs.com/package/python-wasm'>npm</a>&nbsp;&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://github.com/sagemathinc/python-wasm#readme'/>GitHub</a></h3></div>";
document.body.appendChild(link);
const element = document.createElement("div");
document.body.appendChild(element);
document.body.style.margin = "0px";

async function main() {
  while (true) {
    element.innerHTML = '';
    await terminal(element);
  }
}

main();