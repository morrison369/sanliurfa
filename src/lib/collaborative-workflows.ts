/**
 * Phase 118: Collaborative Workflows & Task Management
 * Task management with real-time collaboration and team coordination
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: string[];
  createdBy: string;
  createdAt: number;
  dueDate?: number;
  completedAt?: number;
  dependencies: string[];
  estimation?: number; // in hours
  spent?: number; // in hours
  tags: string[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  mentions: string[];
  createdAt: number;
  updatedAt?: number;
  editHistory: Array<{ content: string; timestamp: number }>;
}

export interface KanbanBoard {
  id: string;
  name: string;
  teamId: string;
  columns: Array<{ name: string; status: TaskStatus; maxWip?: number }>;
  tasks: Task[];
  createdAt: number;
}

export interface TeamVote {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, string>;
  participants: string[];
  deadline: number;
  createdAt: number;
  result?: string;
}

// ==================== WORKFLOW COORDINATOR ====================

export class WorkflowCoordinator {
  private workflows = new Map<string, Record<string, any>>();
  private workflowCount = 0;

  /**
   * Create workflow
   */
  createWorkflow(name: string, steps: Array<{ name: string; assignees: string[] }>): string {
    const id = 'workflow-' + Date.now() + '-' + this.workflowCount++;

    const workflow = {
      id,
      name,
      steps,
      currentStep: 0,
      createdAt: Date.now(),
      status: 'active'
    };

    this.workflows.set(id, workflow);

    logger.info('Workflow created', {
      workflowId: id,
      name,
      stepCount: steps.length
    });

    return id;
  }

  /**
   * Get workflow
   */
  getWorkflow(workflowId: string): Record<string, any> | null {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * Advance workflow step
   */
  advanceStep(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (workflow && workflow.currentStep < workflow.steps.length - 1) {
      workflow.currentStep++;
      logger.debug('Workflow advanced', { workflowId, step: workflow.currentStep });
    }
  }

  /**
   * Complete workflow
   */
  completeWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.status = 'completed';
      workflow.completedAt = Date.now();
      logger.debug('Workflow completed', { workflowId });
    }
  }

  /**
   * Get current step
   */
  getCurrentStep(workflowId: string): Record<string, any> | null {
    const workflow = this.workflows.get(workflowId);
    if (workflow && workflow.steps[workflow.currentStep]) {
      return workflow.steps[workflow.currentStep];
    }

    return null;
  }

  /**
   * Create vote
   */
  createVote(question: string, options: string[], participants: string[], deadlineMs: number = 86400000): TeamVote {
    const id = 'vote-' + Date.now();

    const vote: TeamVote = {
      id,
      question,
      options,
      votes: {},
      participants,
      deadline: Date.now() + deadlineMs,
      createdAt: Date.now()
    };

    logger.debug('Vote created', {
      voteId: id,
      question,
      participantCount: participants.length
    });

    return vote;
  }

  /**
   * Cast vote
   */
  castVote(vote: TeamVote, userId: string, option: string): void {
    if (vote.participants.includes(userId) && vote.options.includes(option)) {
      vote.votes[userId] = option;
      logger.debug('Vote cast', { voteId: vote.id, userId, option });
    }
  }

  /**
   * Get vote results
   */
  getVoteResults(vote: TeamVote): Record<string, number> {
    const results: Record<string, number> = {};

    for (const option of vote.options) {
      results[option] = 0;
    }

    for (const option of Object.values(vote.votes)) {
      results[option as string]++;
    }

    return results;
  }

  /**
   * Finalize vote
   */
  finalizeVote(vote: TeamVote): void {
    const results = this.getVoteResults(vote);
    let maxVotes = 0;
    let winner = '';

    for (const [option, count] of Object.entries(results)) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }

    vote.result = winner;
    logger.debug('Vote finalized', { voteId: vote.id, result: winner });
  }
}

// ==================== TASK ASSIGNMENT ====================

export class TaskAssignment {
  private tasks = new Map<string, Task>();
  private taskCount = 0;
  private userTasks = new Map<string, string[]>();
  private comments = new Map<string, TaskComment[]>();

  /**
   * Create task
   */
  createTask(config: Omit<Task, 'id' | 'createdAt' | 'completedAt'>): Task {
    const id = 'task-' + Date.now() + '-' + this.taskCount++;

    const task: Task = {
      ...config,
      id,
      createdAt: Date.now()
    };

    this.tasks.set(id, task);

    for (const assignee of config.assignees) {
      const tasks = this.userTasks.get(assignee) || [];
      tasks.push(id);
      this.userTasks.set(assignee, tasks);
    }

    this.comments.set(id, []);

    logger.info('Task created', {
      taskId: id,
      title: config.title,
      assigneeCount: config.assignees.length,
      priority: config.priority
    });

    return task;
  }

  /**
   * Get task
   */
  getTask(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Update task
   */
  updateTask(taskId: string, updates: Partial<Task>): void {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.assign(task, updates);

      if (updates.status === 'done') {
        task.completedAt = Date.now();
      }

      logger.debug('Task updated', { taskId, fields: Object.keys(updates) });
    }
  }

  /**
   * Change task status
   */
  changeTaskStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;

      if (status === 'done') {
        task.completedAt = Date.now();
      }

      logger.debug('Task status changed', { taskId, status });
    }
  }

  /**
   * Assign user to task
   */
  assignUser(taskId: string, userId: string): void {
    const task = this.tasks.get(taskId);
    if (task && !task.assignees.includes(userId)) {
      task.assignees.push(userId);

      const userTaskList = this.userTasks.get(userId) || [];
      userTaskList.push(taskId);
      this.userTasks.set(userId, userTaskList);

      logger.debug('User assigned to task', { taskId, userId });
    }
  }

  /**
   * Get user tasks
   */
  getUserTasks(userId: string, status?: TaskStatus): Task[] {
    const taskIds = this.userTasks.get(userId) || [];
    const userTasks: Task[] = [];

    for (const taskId of taskIds) {
      const task = this.tasks.get(taskId);
      if (task && (!status || task.status === status)) {
        userTasks.push(task);
      }
    }

    return userTasks;
  }

  /**
   * Add comment to task
   */
  addComment(taskId: string, userId: string, content: string, mentions: string[] = []): TaskComment {
    const id = 'comment-' + Date.now();

    const comment: TaskComment = {
      id,
      taskId,
      userId,
      content,
      mentions,
      createdAt: Date.now(),
      editHistory: []
    };

    const taskComments = this.comments.get(taskId) || [];
    taskComments.push(comment);
    this.comments.set(taskId, taskComments);

    logger.debug('Comment added to task', { taskId, userId, mentionCount: mentions.length });

    return comment;
  }

  /**
   * Get task comments
   */
  getTaskComments(taskId: string): TaskComment[] {
    return this.comments.get(taskId) || [];
  }

  /**
   * Track time spent
   */
  addTimeSpent(taskId: string, hours: number): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.spent = (task.spent || 0) + hours;
      logger.debug('Time spent added to task', { taskId, hours, totalSpent: task.spent });
    }
  }

  /**
   * Get task burndown
   */
  getTaskBurndown(taskIds: string[]): { todo: number; inProgress: number; review: number; done: number } {
    const burndown = { todo: 0, inProgress: 0, review: 0, done: 0 };

    for (const taskId of taskIds) {
      const task = this.tasks.get(taskId);
      if (task) {
        burndown[task.status as keyof typeof burndown]++;
      }
    }

    return burndown;
  }
}

// ==================== COLLABORATIVE BOARD ====================

export class CollaborativeBoard {
  private boards = new Map<string, KanbanBoard>();
  private boardCount = 0;

  /**
   * Create board
   */
  createBoard(name: string, teamId: string, columns?: Array<{ name: string; status: TaskStatus }>): KanbanBoard {
    const id = 'board-' + Date.now() + '-' + this.boardCount++;

    const defaultColumns = columns || [
      { name: 'To Do', status: 'todo' },
      { name: 'In Progress', status: 'in-progress' },
      { name: 'Review', status: 'review' },
      { name: 'Done', status: 'done' }
    ];

    const board: KanbanBoard = {
      id,
      name,
      teamId,
      columns: defaultColumns,
      tasks: [],
      createdAt: Date.now()
    };

    this.boards.set(id, board);

    logger.info('Kanban board created', {
      boardId: id,
      name,
      columnCount: defaultColumns.length
    });

    return board;
  }

  /**
   * Get board
   */
  getBoard(boardId: string): KanbanBoard | null {
    return this.boards.get(boardId) || null;
  }

  /**
   * Add task to board
   */
  addTaskToBoard(boardId: string, task: Task): void {
    const board = this.boards.get(boardId);
    if (board) {
      board.tasks.push(task);
      logger.debug('Task added to board', { boardId, taskId: task.id });
    }
  }

  /**
   * Move task to column
   */
  moveTask(boardId: string, taskId: string, newStatus: TaskStatus): void {
    const board = this.boards.get(boardId);
    if (board) {
      const task = board.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = newStatus;
        logger.debug('Task moved', { boardId, taskId, newStatus });
      }
    }
  }

  /**
   * Get board column tasks
   */
  getColumnTasks(boardId: string, status: TaskStatus): Task[] {
    const board = this.boards.get(boardId);
    if (!board) return [];

    return board.tasks.filter(t => t.status === status);
  }

  /**
   * Get board progress
   */
  getBoardProgress(boardId: string): Record<TaskStatus, number> {
    const board = this.boards.get(boardId);
    const progress: Record<TaskStatus, number> = {
      todo: 0,
      'in-progress': 0,
      review: 0,
      done: 0,
      blocked: 0
    };

    if (board) {
      for (const task of board.tasks) {
        progress[task.status]++;
      }
    }

    return progress;
  }
}

// ==================== TEAM SYNC ====================

export class TeamSync {
  private syncSessions = new Map<string, { teamId: string; participants: string[]; startedAt: number }>();
  private syncCount = 0;

  /**
   * Start team sync
   */
  startTeamSync(teamId: string, participants: string[]): string {
    const id = 'sync-' + Date.now() + '-' + this.syncCount++;

    const session = {
      teamId,
      participants,
      startedAt: Date.now()
    };

    this.syncSessions.set(id, session);

    logger.info('Team sync started', {
      syncId: id,
      teamId,
      participantCount: participants.length
    });

    return id;
  }

  /**
   * End team sync
   */
  endTeamSync(syncId: string): void {
    this.syncSessions.delete(syncId);
    logger.debug('Team sync ended', { syncId });
  }

  /**
   * Get active syncs
   */
  getActiveSyncs(teamId: string): string[] {
    const activeSyncs: string[] = [];

    for (const [syncId, session] of this.syncSessions.entries()) {
      if (session.teamId === teamId) {
        activeSyncs.push(syncId);
      }
    }

    return activeSyncs;
  }

  /**
   * Get sync details
   */
  getSyncDetails(syncId: string): { teamId: string; participants: string[]; startedAt: number; duration: number } | null {
    const session = this.syncSessions.get(syncId);
    if (session) {
      return {
        ...session,
        duration: Date.now() - session.startedAt
      };
    }

    return null;
  }

  /**
   * Record sync action
   */
  recordSyncAction(syncId: string, userId: string, action: string): void {
    const session = this.syncSessions.get(syncId);
    if (session) {
      logger.debug('Sync action recorded', { syncId, userId, action });
    }
  }
}

// ==================== EXPORTS ====================

export const workflowCoordinator = new WorkflowCoordinator();
export const taskAssignment = new TaskAssignment();
export const collaborativeBoard = new CollaborativeBoard();
export const teamSync = new TeamSync();
