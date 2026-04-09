/**
 * Phase 22: Email & Notification System
 * Templates, scheduling, tracking, A/B testing
 */

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  body: string;
  variables: string[];
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  templateId: string;
  variables: Record<string, any>;
  scheduledFor: number;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: number;
  error?: string;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  userId: string;
  type: 'email' | 'sms' | 'push';
  status: 'pending' | 'delivered' | 'bounced' | 'opened';
  sentAt: number;
  openedAt?: number;
  clickedAt?: number;
}

/**
 * Notification & Email System
 */
export class NotificationSystem {
  private templates = new Map<string, NotificationTemplate>();
  private scheduled = new Map<string, ScheduledNotification>();
  private deliveries = new Map<string, NotificationDelivery[]>();
  private abtests = new Map<string, {variant1: string; variant2: string; wins: Record<string, number>}>();

  /**
   * Register template
   */
  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Schedule notification
   */
  schedule(userId: string, templateId: string, variables: Record<string, any>, delayMs: number = 0): ScheduledNotification {
    const id = `notif-${Date.now()}`;
    const notification: ScheduledNotification = {
      id,
      userId,
      templateId,
      variables,
      scheduledFor: Date.now() + delayMs,
      status: 'pending'
    };

    this.scheduled.set(id, notification);

    return notification;
  }

  /**
   * Send notification
   */
  async send(notificationId: string): Promise<NotificationDelivery | null> {
    const notification = this.scheduled.get(notificationId);
    if (!notification) return null;

    const template = this.templates.get(notification.templateId);
    if (!template) return null;

    // Render template
    const rendered = this.renderTemplate(template, notification.variables);

    // Record delivery
    const delivery: NotificationDelivery = {
      id: `delivery-${Date.now()}`,
      notificationId,
      userId: notification.userId,
      type: template.type,
      status: 'delivered',
      sentAt: Date.now()
    };

    if (!this.deliveries.has(notification.userId)) {
      this.deliveries.set(notification.userId, []);
    }

    this.deliveries.get(notification.userId)!.push(delivery);

    // Update notification status
    notification.status = 'sent';
    notification.sentAt = Date.now();

    return delivery;
  }

  /**
   * Track open
   */
  trackOpen(deliveryId: string): void {
    for (const deliveries of this.deliveries.values()) {
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (delivery) {
        delivery.status = 'opened';
        delivery.openedAt = Date.now();
      }
    }
  }

  /**
   * Track click
   */
  trackClick(deliveryId: string): void {
    for (const deliveries of this.deliveries.values()) {
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (delivery) {
        delivery.clickedAt = Date.now();
      }
    }
  }

  /**
   * Get delivery history
   */
  getHistory(userId: string): NotificationDelivery[] {
    return this.deliveries.get(userId) || [];
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: NotificationTemplate, variables: Record<string, any>): string {
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      body = body.replace(new RegExp(`\{${key}\}`, 'g'), String(value));
    }

    return body;
  }

  /**
   * A/B test variants
   */
  registerABTest(testId: string, variant1: string, variant2: string): void {
    this.abtests.set(testId, {
      variant1,
      variant2,
      wins: {variant1: 0, variant2: 0}
    });
  }

  /**
   * Record A/B test win
   */
  recordWin(testId: string, variantId: string): void {
    const test = this.abtests.get(testId);
    if (test) {
      test.wins[variantId] = (test.wins[variantId] || 0) + 1;
    }
  }

  /**
   * Get A/B test results
   */
  getABTestResults(testId: string) {
    const test = this.abtests.get(testId);
    if (!test) return null;

    const total = test.wins.variant1 + test.wins.variant2;
    return {
      variant1Rate: test.wins.variant1 / total,
      variant2Rate: test.wins.variant2 / total,
      winner: test.wins.variant1 > test.wins.variant2 ? 'variant1' : 'variant2'
    };
  }

  /**
   * Get open rate
   */
  getOpenRate(userId: string): number {
    const deliveries = this.deliveries.get(userId) || [];
    const opened = deliveries.filter(d => d.status === 'opened').length;
    return deliveries.length > 0 ? opened / deliveries.length : 0;
  }

  /**
   * Get click-through rate
   */
  getClickThroughRate(userId: string): number {
    const deliveries = this.deliveries.get(userId) || [];
    const clicked = deliveries.filter(d => d.clickedAt).length;
    return deliveries.length > 0 ? clicked / deliveries.length : 0;
  }
}

// Legacy compatibility service for modules importing `notificationService`.
export const notificationService = {
  async notifyAlert(alert: { severity?: string; message?: string }) {
    const level = alert?.severity || 'warning';
    // Keep behavior minimal and non-blocking until full notification bridge is implemented.
    console.warn(`notificationService.notifyAlert[${level}]`, alert?.message || 'alert');
    return true;
  }
};

export const notificationSystem = new NotificationSystem();
