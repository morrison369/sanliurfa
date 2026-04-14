/**
 * Webhooks Module
 * Stub for webhook management
 */

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
}

export class WebhookManager {
  private webhooks: Map<string, Webhook> = new Map();

  register(webhook: Omit<Webhook, 'id'>): Webhook {
    const newWebhook: Webhook = {
      ...webhook,
      id: Math.random().toString(36).substring(7)
    };
    this.webhooks.set(newWebhook.id, newWebhook);
    return newWebhook;
  }

  get(id: string): Webhook | undefined {
    return this.webhooks.get(id);
  }

  list(): Webhook[] {
    return Array.from(this.webhooks.values());
  }

  async trigger(event: string, payload: any): Promise<void> {
    const matching = Array.from(this.webhooks.values())
      .filter(w => w.active && w.events.includes(event));
    
    for (const webhook of matching) {
      console.log(`[Webhook] Triggering ${event} to ${webhook.url}`);
    }
  }
}

export const webhookManager = new WebhookManager();

// Standalone trigger function for convenience
export async function triggerWebhook(event: string, payload: any): Promise<void> {
  await webhookManager.trigger(event, payload);
}

export default webhookManager;
