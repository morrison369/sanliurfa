/**
 * Event Router Module
 * Stub for event routing and handling
 */

export interface EventRoute {
  eventType: string;
  handler: string;
  priority: number;
}

export class EventRouter {
  private routes: Map<string, EventRoute[]> = new Map();

  register(eventType: string, handler: string, priority = 0): void {
    const routes = this.routes.get(eventType) || [];
    routes.push({ eventType, handler, priority });
    routes.sort((a, b) => b.priority - a.priority);
    this.routes.set(eventType, routes);
  }

  route(eventType: string): string[] {
    const routes = this.routes.get(eventType) || [];
    return routes.map(r => r.handler);
  }

  unregister(eventType: string, handler: string): boolean {
    const routes = this.routes.get(eventType) || [];
    const filtered = routes.filter(r => r.handler !== handler);
    if (filtered.length !== routes.length) {
      this.routes.set(eventType, filtered);
      return true;
    }
    return false;
  }
}

export const eventRouter = new EventRouter();
export default eventRouter;
