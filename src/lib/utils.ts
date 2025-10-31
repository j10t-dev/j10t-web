import {
  join,
  normalize,
  relative,
} from "@std/path";
import { contentType } from "@std/media-types";

export function getContentType(path: string): string {
  const match = path.match(/\.[^.]+$/);
  const ext = match ? match[0] : "";
  return contentType(ext) ?? "application/octet-stream";
}

/**
 * Sanitizes a user-supplied file path to prevent directory traversal.
 * Throws if the resolved path is outside the base directory.
 * @param baseDir The base directory (absolute path)
 * @param userPath The user-supplied path (relative or absolute)
 * @returns The safe, absolute path to the file
 */
export function sanitizePath(baseDir: string, userPath: string): string {
  // Remove any leading slashes to avoid absolute path issues
  const safeUserPath = userPath.replace(/^\/+/, "");
  const normalized = normalize(safeUserPath);
  const absPath = join(baseDir, normalized);
  const rel = relative(baseDir, absPath);
  // If the relative path starts with '..', it's outside the baseDir
  if (rel.startsWith("..") || rel.includes(".." + "/")) {
    throw new Error("Invalid path: directory traversal detected");
  }
  return absPath;
}
