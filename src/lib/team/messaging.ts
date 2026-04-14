/**
 * Team Messaging Module
 * Stub for team communication
 */

export interface TeamMessage {
  id: string;
  teamId: string;
  userId: string;
  content: string;
  timestamp: Date;
}

export class TeamMessaging {
  private messages: Map<string, TeamMessage[]> = new Map();

  sendMessage(teamId: string, userId: string, content: string): TeamMessage {
    const message: TeamMessage = {
      id: Math.random().toString(36).substring(7),
      teamId,
      userId,
      content,
      timestamp: new Date()
    };

    const teamMessages = this.messages.get(teamId) || [];
    teamMessages.push(message);
    this.messages.set(teamId, teamMessages);

    return message;
  }

  getMessages(teamId: string): TeamMessage[] {
    return this.messages.get(teamId) || [];
  }
}

export const teamMessaging = new TeamMessaging();
export default teamMessaging;
