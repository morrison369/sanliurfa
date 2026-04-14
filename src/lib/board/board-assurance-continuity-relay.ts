/**
 * Phase 294: Board Assurance Continuity Relay
 */

import { logger } from '../logger';

export interface ContinuityRelayMessage {
  messageId: string;
  boardLane: string;
  continuityScore: number;
  urgency: number;
}

class ContinuityRelayBuffer {
  private messages: ContinuityRelayMessage[] = [];

  push(message: ContinuityRelayMessage): ContinuityRelayMessage {
    this.messages.push(message);
    return message;
  }

  list(): ContinuityRelayMessage[] {
    return this.messages;
  }
}

class RelayPriorityCalculator {
  priority(message: ContinuityRelayMessage): number {
    return Math.round((message.continuityScore * 0.6 + message.urgency * 0.4) * 10) / 10;
  }
}

class RelayRoutePlanner {
  route(message: ContinuityRelayMessage): string {
    if (message.urgency >= 80) return `${message.boardLane}-fast`;
    return `${message.boardLane}-standard`;
  }
}

class ContinuityRelayReporter {
  report(messageId: string, route: string): string {
    const text = `Relay ${messageId} route=${route}`;
    logger.debug('Continuity relay report', { messageId, route });
    return text;
  }
}

export const continuityRelayBuffer = new ContinuityRelayBuffer();
export const relayPriorityCalculator = new RelayPriorityCalculator();
export const relayRoutePlanner = new RelayRoutePlanner();
export const continuityRelayReporter = new ContinuityRelayReporter();

export {
  ContinuityRelayBuffer,
  RelayPriorityCalculator,
  RelayRoutePlanner,
  ContinuityRelayReporter
};

