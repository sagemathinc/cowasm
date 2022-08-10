export default function stats(bindings) {
  const { fs } = bindings;

  return {
    chmod: (path, mode) => {
      fs.fchmodSync(path, mode);
    },
  };
}
