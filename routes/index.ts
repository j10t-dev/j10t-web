import { Eta } from "@eta-dev/eta";

export class PageRenderHandler {
  constructor(private eta: Eta) {}

  async handle(template: string): Promise<Response> {
    const body = await this.eta.renderAsync(template, {});
    return new Response(body, { headers: { "content-type": "text/html" } });
  }
} 