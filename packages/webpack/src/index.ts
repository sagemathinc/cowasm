import python from "@wapython/core";

export {};

async function demo() {
  await python.init();
  function component() {
    const element = document.createElement("div");
    element.innerHTML = `2 + 3 = ${python.repr("2+3")}`;
    return element;
  }

  document.body.appendChild(component());
}

demo();
