/**
 * Phase 113-118: Collaboration & Communication System Tests
 * Comprehensive test suite for all 6 phases
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Phase 113: Collaboration Engine
import {
  collaborationServer,
  operationalTransform,
  conflictResolver
} from '../collaboration-engine';

// Phase 114: Document Editing
import {
  documentManager,
  editorSession,
  contentVersioning,
  lockManager
} from '../document-editing';

// Phase 115: Team Messaging
import {
  channelManager,
  messageFormatter,
  threadManager,
  mentionResolver
} from '../team-messaging';

// Phase 116: Presence Tracking
import {
  presenceManager,
  typingIndicator,
  activityMonitor,
  statusTracker
} from '../presence-tracking';

// Phase 117: Notification System
import {
  notificationManager,
  scheduledNotifications,
  notificationPreferences,
  notificationAggregator
} from '../notification-system';

// Phase 118: Collaborative Workflows
import {
  workflowCoordinator,
  taskAssignment,
  collaborativeBoard,
  teamSync
} from '../collaborative-workflows';

describe('Phase 113: Collaboration Engine', () => {
  it('should create collaboration session', () => {
    const session = collaborationServer.createSession('doc-1', {
      content: 'Initial content',
      participants: ['user-1', 'user-2']
    });

    expect(session.id).toBeDefined();
    expect(session.documentId).toBe('doc-1');
    expect(session.participants).toContain('user-1');
    expect(session.version).toBe(1);
  });

  it('should transform operations', () => {
    const operation = operationalTransform.transform({
      type: 'insert',
      position: 0,
      content: 'hello',
      clientId: 'user-1',
      version: 1
    });

    expect(operation.id).toBeDefined();
    expect(operation.type).toBe('insert');
    expect(operation.content).toBe('hello');
  });

  it('should resolve conflicts', () => {
    const op1 = operationalTransform.transform({
      type: 'insert',
      position: 5,
      content: 'a',
      clientId: 'user-1',
      version: 1
    });

    const op2 = operationalTransform.transform({
      type: 'insert',
      position: 5,
      content: 'b',
      clientId: 'user-2',
      version: 1
    });

    const result = conflictResolver.resolve(op1, op2, 'op1');

    expect(result.operation).toBeDefined();
    expect(result.conflict).toBe(true);
  });
});

describe('Phase 114: Document Editing', () => {
  it('should create document', () => {
    const doc = documentManager.createDocument({
      title: 'Test Doc',
      type: 'document',
      content: '',
      owner: 'user-1',
      collaborators: []
    });

    expect(doc.id).toBeDefined();
    expect(doc.title).toBe('Test Doc');
    expect(doc.version).toBe(1);
  });

  it('should create editor session', () => {
    const sessionId = editorSession.createSession('doc-1', 'user-1');

    expect(sessionId).toBeDefined();

    const state = editorSession.getSessionState(sessionId);
    expect(state?.userId).toBe('user-1');
  });

  it('should apply edits', () => {
    const sessionId = editorSession.createSession('doc-1', 'user-1');

    const edit = editorSession.applyEdit(sessionId, {
      operation: 'insert',
      position: 0,
      content: 'hello',
      userId: 'user-1'
    });

    expect(edit.id).toBeDefined();
    expect(edit.content).toBe('hello');

    const sessionEdits = editorSession.getSessionEdits(sessionId);
    expect(sessionEdits.length).toBe(1);
  });

  it('should create snapshots', () => {
    const snapshot = contentVersioning.createSnapshot('doc-1', 'content', 1);

    expect(snapshot.id).toBeDefined();
    expect(snapshot.version).toBe(1);
    expect(snapshot.content).toBe('content');
  });

  it('should manage locks', () => {
    const lockId = lockManager.acquireLock('doc-1', 'user-1', { start: 0, end: 10 });

    expect(lockId).toBeDefined();

    const lock = lockManager.checkLock('doc-1', { start: 0, end: 10 });
    expect(lock).toBeDefined();

    lockManager.releaseLock(lockId);
  });
});

describe('Phase 115: Team Messaging', () => {
  it('should create channel', () => {
    const channel = channelManager.createChannel({
      name: 'general',
      type: 'public',
      members: ['user-1', 'user-2'],
      owner: 'user-1'
    });

    expect(channel.id).toBeDefined();
    expect(channel.name).toBe('general');
    expect(channel.type).toBe('public');
  });

  it('should format messages', () => {
    const formatted = messageFormatter.formatMessage('@user-1 hello', ['user-1']);

    expect(formatted.mentions).toContain('user-1');
    expect(formatted.content).toContain('hello');
  });

  it('should extract mentions', () => {
    const mentions = messageFormatter.extractMentions('Hey @alice and @bob');

    expect(mentions).toContain('alice');
    expect(mentions).toContain('bob');
  });

  it('should create threads', () => {
    const thread = threadManager.createThread('msg-1', 'channel-1');

    expect(thread.id).toBeDefined();
    expect(thread.messageId).toBe('msg-1');
    expect(thread.replyCount).toBe(0);
  });

  it('should resolve mentions', () => {
    mentionResolver.registerUser('user-1', 'alice', 'Alice Smith');

    const user = mentionResolver.resolveMention('alice');

    expect(user?.username).toBe('alice');
    expect(user?.displayName).toBe('Alice Smith');
  });

  it('should provide mention suggestions', () => {
    mentionResolver.registerUser('user-1', 'alice', 'Alice Smith');
    mentionResolver.registerUser('user-2', 'alicia', 'Alicia Brown');

    const suggestions = mentionResolver.getMentionSuggestions('ali');

    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe('Phase 116: Presence Tracking', () => {
  it('should set user presence', () => {
    const presence = presenceManager.setUserPresence('user-1', {
      status: 'online',
      location: 'doc-1'
    });

    expect(presence.userId).toBe('user-1');
    expect(presence.status).toBe('online');
  });

  it('should track typing indicators', () => {
    typingIndicator.startTyping('user-1', 'channel-1');

    const typingUsers = typingIndicator.getTypingUsers('channel-1');

    expect(typingUsers).toContain('user-1');
  });

  it('should record activity', () => {
    const log = activityMonitor.recordActivity('user-1', 'message-sent', { channelId: 'ch-1' });

    expect(log.id).toBeDefined();
    expect(log.action).toBe('message-sent');

    const activity = activityMonitor.getUserActivity('user-1');
    expect(activity.length).toBeGreaterThan(0);
  });

  it('should track cursor positions', () => {
    const cursor = statusTracker.trackCursorPosition('user-1', 'doc-1', 100, 50);

    expect(cursor.userId).toBe('user-1');
    expect(cursor.x).toBe(100);

    const cursors = statusTracker.getDocumentCursors('doc-1');
    expect(cursors.length).toBeGreaterThan(0);
  });

  it('should manage sessions', () => {
    const sessionId = statusTracker.createSession('user-1');

    expect(sessionId).toBeDefined();

    statusTracker.updateSessionActivity(sessionId);

    const sessions = statusTracker.getUserSessions('user-1');
    expect(sessions).toContain(sessionId);
  });
});

describe('Phase 117: Notification System', () => {
  it('should send notification', () => {
    const notif = notificationManager.sendNotification({
      userId: 'user-1',
      title: 'Test',
      message: 'Test message',
      priority: 'normal',
      channels: ['in-app']
    });

    expect(notif.id).toBeDefined();
    expect(notif.userId).toBe('user-1');
    expect(notif.read).toBe(false);
  });

  it('should mark notification as read', () => {
    const notif = notificationManager.sendNotification({
      userId: 'user-1',
      title: 'Test',
      message: 'Test',
      priority: 'normal',
      channels: ['in-app']
    });

    notificationManager.markAsRead(notif.id);

    const retrieved = notificationManager.getNotification(notif.id);
    expect(retrieved?.read).toBe(true);
  });

  it('should schedule notifications', () => {
    const sendAt = Date.now() + 3600000; // 1 hour from now

    const scheduled = scheduledNotifications.scheduleNotification({
      userId: 'user-1',
      title: 'Scheduled',
      message: 'Later',
      priority: 'normal',
      channels: ['in-app']
    }, sendAt);

    expect(scheduled.scheduledAt).toBe(sendAt);
  });

  it('should set user notification preferences', () => {
    const prefs = notificationPreferences.setUserPreferences('user-1', {
      channels: { 'in-app': true, push: false, email: true, sms: false },
      doNotDisturb: false
    });

    expect(prefs.userId).toBe('user-1');
    expect(prefs.channels['push']).toBe(false);
  });

  it('should aggregate notifications', () => {
    const notifs = [
      notificationManager.sendNotification({
        userId: 'user-1',
        title: 'Alert 1',
        message: 'First',
        priority: 'normal',
        channels: ['in-app']
      }),
      notificationManager.sendNotification({
        userId: 'user-1',
        title: 'Alert 2',
        message: 'Second',
        priority: 'normal',
        channels: ['in-app']
      })
    ];

    const grouped = notificationAggregator.aggregateNotifications(notifs, {
      timeWindow: 60000,
      maxGroupSize: 5
    });

    expect(grouped.length).toBeGreaterThan(0);
  });

  it('should create notification templates', () => {
    const template = notificationManager.createTemplate(
      'welcome',
      'Welcome {name}',
      'Hello {name}, welcome to our platform',
      'normal'
    );

    expect(template.id).toBeDefined();
    expect(template.variables).toContain('name');
  });
});

describe('Phase 118: Collaborative Workflows', () => {
  it('should create task', () => {
    const task = taskAssignment.createTask({
      title: 'Design API',
      description: 'Create REST API',
      status: 'todo',
      priority: 'high',
      assignees: ['user-1'],
      createdBy: 'user-1',
      dependencies: [],
      tags: ['backend']
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Design API');
  });

  it('should create kanban board', () => {
    const board = collaborativeBoard.createBoard('Sprint 1', 'team-1');

    expect(board.id).toBeDefined();
    expect(board.columns.length).toBe(4);
  });

  it('should move task on board', () => {
    const board = collaborativeBoard.createBoard('Sprint 1', 'team-1');

    const task = taskAssignment.createTask({
      title: 'Task 1',
      description: 'Test',
      status: 'todo',
      priority: 'medium',
      assignees: ['user-1'],
      createdBy: 'user-1',
      dependencies: [],
      tags: []
    });

    collaborativeBoard.addTaskToBoard(board.id, task);
    collaborativeBoard.moveTask(board.id, task.id, 'in-progress');

    const updated = taskAssignment.getTask(task.id);
    expect(updated?.status).toBe('in-progress');
  });

  it('should add comments to task', () => {
    const task = taskAssignment.createTask({
      title: 'Task 1',
      description: 'Test',
      status: 'todo',
      priority: 'medium',
      assignees: ['user-1'],
      createdBy: 'user-1',
      dependencies: [],
      tags: []
    });

    const comment = taskAssignment.addComment(task.id, 'user-2', 'Great work!', ['user-1']);

    expect(comment.id).toBeDefined();
    expect(comment.mentions).toContain('user-1');

    const comments = taskAssignment.getTaskComments(task.id);
    expect(comments.length).toBeGreaterThan(0);
  });

  it('should start team sync', () => {
    const syncId = teamSync.startTeamSync('team-1', ['user-1', 'user-2', 'user-3']);

    expect(syncId).toBeDefined();

    const details = teamSync.getSyncDetails(syncId);
    expect(details?.participantCount).toBe(3);
  });

  it('should create team vote', () => {
    const vote = workflowCoordinator.createVote(
      'Approve design?',
      ['yes', 'no', 'maybe'],
      ['user-1', 'user-2', 'user-3']
    );

    expect(vote.id).toBeDefined();
    expect(vote.options.length).toBe(3);

    workflowCoordinator.castVote(vote, 'user-1', 'yes');

    const results = workflowCoordinator.getVoteResults(vote);
    expect(results['yes']).toBe(1);
  });

  it('should track time on task', () => {
    const task = taskAssignment.createTask({
      title: 'Task 1',
      description: 'Test',
      status: 'todo',
      priority: 'medium',
      assignees: ['user-1'],
      createdBy: 'user-1',
      dependencies: [],
      tags: []
    });

    taskAssignment.addTimeSpent(task.id, 2);
    taskAssignment.addTimeSpent(task.id, 1.5);

    const updated = taskAssignment.getTask(task.id);
    expect(updated?.spent).toBe(3.5);
  });
});
