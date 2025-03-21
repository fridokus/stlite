import path from "path";
import { PyodideInterface } from "pyodide";

function ensureParent(pyodide: PyodideInterface, filePath: string): void {
  const normalized = path.normalize(filePath);

  const dirPath = path.dirname(normalized);

  const dirNames = dirPath.split("/");

  const chDirNames: string[] = [];
  for (const dirName of dirNames) {
    chDirNames.push(dirName);
    const dirPath = chDirNames.join("/");

    if (pyodide.FS.analyzePath(dirPath).exists) {
      if (pyodide.FS.isDir(dirPath)) {
        throw new Error(`"${dirPath}" already exists and is not a directory.`);
      }
      continue;
    }

    try {
      pyodide.FS.mkdir(dirPath);
    } catch (err) {
      console.error(`Failed to create a directory "${dirPath}"`);
      throw err;
    }
  }
}

export function writeFileWithParents(
  pyodide: PyodideInterface,
  filePath: string,
  data: string | ArrayBufferView,
  opts?: Record<string, any>
): void {
  ensureParent(pyodide, filePath);
  pyodide.FS.writeFile(filePath, data, opts);
}

export function renameWithParents(
  pyodide: PyodideInterface,
  oldPath: string,
  newPath: string
): void {
  ensureParent(pyodide, newPath);
  pyodide.FS.rename(oldPath, newPath);
}
