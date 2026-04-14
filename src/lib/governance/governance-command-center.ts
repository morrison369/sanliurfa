/**
 * Phase 190: Governance Command Center
 */

import { logger } from '../logger';

export interface CommandCenterWidget {
  widgetId: string;
  title: string;
  value: number | string;
  severity: 'info' | 'warning' | 'critical';
}

class CommandCenterStateManager {
  private widgets = new Map<string, CommandCenterWidget>();

  upsert(widget: CommandCenterWidget): CommandCenterWidget {
    this.widgets.set(widget.widgetId, widget);
    return widget;
  }

  list(): CommandCenterWidget[] {
    return Array.from(this.widgets.values());
  }
}

class CommandCenterAlertRouter {
  route(widget: CommandCenterWidget): 'email' | 'slack' | 'pagerduty' {
    if (widget.severity === 'critical') return 'pagerduty';
    if (widget.severity === 'warning') return 'slack';
    return 'email';
  }
}

class CommandCenterRunbookOrchestrator {
  trigger(alertType: string): string[] {
    if (alertType === 'critical-posture') return ['open-incident', 'page-oncall', 'start-bridge'];
    return ['notify-owner', 'track-action'];
  }
}

class CommandCenterSnapshotService {
  snapshot(widgets: CommandCenterWidget[]): { totalWidgets: number; criticalCount: number; timestamp: number } {
    const criticalCount = widgets.filter(w => w.severity === 'critical').length;
    logger.debug('Command center snapshot', { totalWidgets: widgets.length, criticalCount });
    return { totalWidgets: widgets.length, criticalCount, timestamp: Date.now() };
  }
}

export const commandCenterStateManager = new CommandCenterStateManager();
export const commandCenterAlertRouter = new CommandCenterAlertRouter();
export const commandCenterRunbookOrchestrator = new CommandCenterRunbookOrchestrator();
export const commandCenterSnapshotService = new CommandCenterSnapshotService();

export {
  CommandCenterStateManager,
  CommandCenterAlertRouter,
  CommandCenterRunbookOrchestrator,
  CommandCenterSnapshotService
};


