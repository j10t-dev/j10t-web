import { getContentType, sanitizePath } from "../lib/utils.ts";
import { logError } from "../lib/logger.ts";

export interface StaticFileResponse {
  file: Uint8Array;
  headers: Headers;
}

export class StaticFileHandler {
  private getContentType: typeof getContentType;
  private sanitizePath: typeof sanitizePath;
  constructor(
    private publicDir: string,
    opts?: {
      getContentType?: typeof getContentType,
      sanitizePath?: typeof sanitizePath,
    }
  ) {
    this.getContentType = opts?.getContentType ?? getContentType;
    this.sanitizePath = opts?.sanitizePath ?? sanitizePath;
  }

  async handle(url: URL, req: Request): Promise<Response> {
    try {
      const relPath = url.pathname.replace("/public/", "");
      const filePath = this.sanitizePath(this.publicDir, relPath);
      const fileInfo = await Deno.stat(filePath);
      if (!fileInfo.isFile) throw new Error("Not a file");
      const { file, headers } = await this.getStaticFileResponse(filePath, fileInfo);
      if (this.isNotModified(req, headers)) {
        return new Response(null, { status: 304, headers });
      }
      return new Response(file, { headers });
    } catch (err) {
      logError("Static file not found", {
        path: url.pathname,
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Not found", { status: 404 });
    }
  }

  private async getStaticFileResponse(filePath: string, fileInfo: Deno.FileInfo): Promise<StaticFileResponse> {
    const file = await Deno.readFile(filePath);
    const contentType = this.getContentType(filePath);
    const lastModified = fileInfo.mtime?.toUTCString() ?? undefined;
    const etag = `W/\"${fileInfo.size}-${fileInfo.mtime?.getTime() ?? 0}\"`;
    const headers = new Headers({
      "content-type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    if (lastModified) headers.set("Last-Modified", lastModified);
    headers.set("ETag", etag);
    return { file, headers };
  }

  private isNotModified(req: Request, headers: Headers): boolean {
    const ifNoneMatch = req.headers.get("if-none-match");
    const ifModifiedSince = req.headers.get("if-modified-since");
    const etag = headers.get("etag");
    const lastModified = headers.get("last-modified");
    return Boolean(
      (ifNoneMatch && etag && ifNoneMatch === etag) ||
      (ifModifiedSince && lastModified && ifModifiedSince === lastModified)
    );
  }
} 