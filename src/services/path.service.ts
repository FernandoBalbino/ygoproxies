import path from "node:path";

export const PUBLIC_DIR = path.join(process.cwd(), "public");

export function publicPathToFilePath(publicPath: string): string {
  const normalized = publicPath.replace(/^\/+/, "");
  return path.join(PUBLIC_DIR, normalized);
}

export function filePathToPublicPath(filePath: string): string {
  const relative = path.relative(PUBLIC_DIR, filePath).replaceAll(path.sep, "/");
  return `/${relative}`;
}
