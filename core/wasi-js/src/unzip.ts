import { dirname, join } from "path";
import { unzipSync } from "fflate";

export type UnzipOptions = {
  data: ArrayBuffer | Uint8Array;
  fs: {
    mkdirSync: Function;
    statSync: Function;
    writeFileSync: Function;
    chmodSync: Function;
  };
  directory: string;
};

export default function unzip({ data, fs, directory }: UnzipOptions): void {
  // const t0 = new Date().valueOf();
  if (data instanceof ArrayBuffer) {
    data = new Uint8Array(data);
  }
  if (!(data instanceof Uint8Array)) {
    throw Error("impossible"); // was converted above. this is for typescript.
  }
  const z = unzipSync(data);
  for (const [relativePath, content] of Object.entries(z)) {
    const outputFilename = join(directory, relativePath);
    fs.mkdirSync(dirname(outputFilename), { recursive: true });
    if(outputFilename.endsWith('/')) {
      // it is a directory, not a file.
      continue;
    }
    fs.writeFileSync(outputFilename, content);
    fs.chmodSync(outputFilename, 0o777);
  }
  //   console.log(
  //     `extract ${data.length / 10 ** 6} MB in ${new Date().valueOf() - t0}ms`
  //   );
}
