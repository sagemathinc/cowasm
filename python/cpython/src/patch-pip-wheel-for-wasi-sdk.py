import pathlib
import sys
import tempfile
import zipfile


def patch_filewrapper(text):
    text = text.replace("import mmap\n", "")
    needle = """                result = memoryview(
                    mmap.mmap(self.__buf.fileno(), 0, access=mmap.ACCESS_READ)
                )
"""
    replacement = """                result = self.__buf.read()
"""
    return text.replace(needle, replacement)


def patch_rich_live(text):
    needle = "            if self.auto_refresh:\n"
    replacement = (
        "            # COWASM: threads are not available in the browser runtime.\n"
        "            if False and self.auto_refresh:\n"
    )
    return text.replace(needle, replacement)


def patch_rich_progress(text):
    text = text.replace("from mmap import mmap\n", "")
    return text.replace(
        "    def readinto(self, b: Union[bytearray, memoryview, mmap]):",
        "    def readinto(self, b: Union[bytearray, memoryview, object]):",
    )


PATCHES = {
    "pip/_vendor/cachecontrol/filewrapper.py": patch_filewrapper,
    "pip/_vendor/rich/live.py": patch_rich_live,
    "pip/_vendor/rich/progress.py": patch_rich_progress,
}


def patch_wheel(wheel):
    with zipfile.ZipFile(wheel, "r") as source:
        infos = source.infolist()
        contents = {info.filename: source.read(info.filename) for info in infos}

    for name, patcher in PATCHES.items():
        contents[name] = patcher(contents[name].decode()).encode()

    with tempfile.NamedTemporaryFile(dir=wheel.parent, delete=False) as tmp:
        tmp_path = pathlib.Path(tmp.name)

    try:
        with zipfile.ZipFile(tmp_path, "w") as target:
            for info in infos:
                target.writestr(info, contents[info.filename])
        tmp_path.replace(wheel)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


def main():
    bundled = pathlib.Path(sys.argv[1])
    wheels = sorted(bundled.glob("pip-*.whl"))
    if len(wheels) != 1:
        raise SystemExit(f"expected exactly one pip wheel in {bundled}, got {wheels}")
    patch_wheel(wheels[0])


if __name__ == "__main__":
    main()
