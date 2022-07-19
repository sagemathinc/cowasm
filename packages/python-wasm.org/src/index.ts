import terminal from "./terminal";

const link = document.createElement("div");
link.innerHTML =
  "<div style='text-align:center'><h1>python-wasm</h1><h3 style><a target='_blank' style='text-decoration: none;' href='https://www.npmjs.com/package/python-wasm'>NPM</a>&nbsp;&nbsp;&nbsp;<a target='_blank' style='text-decoration: none;' href='https://github.com/sagemathinc/python-wasm#readme'/>GitHub</a></h3></div>";
document.body.appendChild(link);
const element = document.createElement("div");
document.body.appendChild(element);
document.body.style.margin = "0px";

terminal(element);
