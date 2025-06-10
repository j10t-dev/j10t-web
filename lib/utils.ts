import {
  join,
  normalize,
  relative,
} from "https://deno.land/std@0.224.0/path/mod.ts";

export function getContentType(path: string): string {
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".json")) return "application/json";
  return "application/octet-stream";
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
