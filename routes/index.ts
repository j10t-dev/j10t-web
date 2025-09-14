import { Eta } from "@eta-dev/eta";

export class PageRenderHandler {
  constructor(private eta: Eta) {}

  async handle(template: string, data?: Record<string, any>): Promise<Response> {
    const templateData = data || {};
    
    // Render the requested page content first
    const content = await this.eta.renderAsync(template, templateData);
    
    // Then render it within the base layout
    const body = await this.eta.renderAsync("layouts/base", {
      ...templateData,
      body: content
    });
    
    return new Response(body, { headers: { "content-type": "text/html" } });
  }
} 