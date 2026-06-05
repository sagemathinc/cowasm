export type PythonExec = (code: string) => Promise<void>;
export type PythonRepr = (code: string) => Promise<string>;

export interface ProjectFileInput {
  path: string;
  content: string | Uint8Array;
}

export interface ProjectFileChange {
  path: string;
  baseSha256: string | null;
  sha256: string;
  base64: string;
  text: string | null;
}

export class PythonProjectFiles {
  private exec: PythonExec;
  private repr: PythonRepr;
  private mount: string;

  constructor({
    exec,
    repr,
    mount = "/project",
  }: {
    exec: PythonExec;
    repr: PythonRepr;
    mount?: string;
  }) {
    this.exec = exec;
    this.repr = repr;
    this.mount = mount;
  }

  async loadFiles(files: ProjectFileInput[]): Promise<void> {
    const payload = files.map(({ path, content }) => ({
      path: normalizeProjectPath(path),
      base64: bytesToBase64(
        typeof content == "string" ? new TextEncoder().encode(content) : content
      ),
    }));
    await this.exec(String.raw`
import base64, hashlib, json, pathlib, shutil

__cowasm_project_mount = pathlib.Path(${JSON.stringify(this.mount)})
if __cowasm_project_mount.exists():
    shutil.rmtree(__cowasm_project_mount)
__cowasm_project_mount.mkdir(parents=True, exist_ok=True)
__cowasm_project_base = {}

for item in json.loads(${JSON.stringify(JSON.stringify(payload))}):
    relative = pathlib.PurePosixPath(item["path"])
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError(f"unsafe project path: {item['path']}")
    target = __cowasm_project_mount.joinpath(*relative.parts)
    target.parent.mkdir(parents=True, exist_ok=True)
    data = base64.b64decode(item["base64"])
    target.write_bytes(data)
    __cowasm_project_base[relative.as_posix()] = hashlib.sha256(data).hexdigest()
`);
  }

  async changedFiles(): Promise<ProjectFileChange[]> {
    await this.exec(String.raw`
import base64, hashlib, json

__cowasm_project_changes = []
for path in sorted(__cowasm_project_mount.rglob("*")):
    if not path.is_file():
        continue
    rel = path.relative_to(__cowasm_project_mount).as_posix()
    data = path.read_bytes()
    sha256 = hashlib.sha256(data).hexdigest()
    base_sha256 = __cowasm_project_base.get(rel)
    if base_sha256 == sha256:
        continue
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = None
    __cowasm_project_changes.append({
        "path": rel,
        "baseSha256": base_sha256,
        "sha256": sha256,
        "base64": base64.b64encode(data).decode("ascii"),
        "text": text,
    })
__cowasm_project_changes_json = json.dumps(__cowasm_project_changes)
`);
    const hex = parsePythonHexString(
      await this.repr("__cowasm_project_changes_json.encode('utf-8').hex()")
    );
    return JSON.parse(hexToString(hex));
  }
}

function normalizeProjectPath(path: string): string {
  const parts = path
    .split(/[\\/]+/)
    .filter((part) => part.length > 0 && part != ".");
  if (path.charAt(0) == "/" || parts.length == 0 || parts.indexOf("..") != -1) {
    throw Error(`unsafe project path: ${path}`);
  }
  return parts.join("/");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function parsePythonHexString(repr: string): string {
  const quote = repr[0];
  if (
    (quote != "'" && quote != '"') ||
    repr[repr.length - 1] != quote ||
    !/^[0-9a-f]*$/.test(repr.slice(1, -1))
  ) {
    throw Error(`expected Python hex string repr, got ${repr}`);
  }
  return repr.slice(1, -1);
}

function hexToString(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}
