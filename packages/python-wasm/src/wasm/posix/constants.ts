export type Constant = string;

const constants: { [name: string]: number } = {};
export default constants;

// function recvUint32(memory, ptr): number {
//   const view = new DataView(memory.buffer);
//   return view.getUint32(ptr, true);
// }

function recvJsonObject({ callFunction, recvString }, name: string) {
  let ptr = callFunction(name);
  if (ptr == 0) {
    throw Error("unable to receive JSON object");
  }
  return JSON.parse(recvString(ptr));
}

export function initConstants(context) {
  const { constants: names, values } = recvJsonObject(context, "getConstants");
  for (let i = 0; i < names.length; i++) {
    constants[names[i]] = values[i];
  }
}
