/**
 * Phase 209: Control Mesh Autonomy
 */

import { logger } from '../logger';

export interface MeshControlNode {
  nodeId: string;
  controlId: string;
  autonomy: 'manual' | 'assisted' | 'autonomous';
  health: number;
}

class ControlMeshRegistry {
  private nodes = new Map<string, MeshControlNode>();
  private counter = 0;

  register(controlId: string, autonomy: MeshControlNode['autonomy'], health = 100): MeshControlNode {
    const node: MeshControlNode = {
      nodeId: `mesh-${Date.now()}-${++this.counter}`,
      controlId,
      autonomy,
      health
    };
    this.nodes.set(node.nodeId, node);
    return node;
  }

  list(): MeshControlNode[] {
    return Array.from(this.nodes.values());
  }
}

class MeshRoutingEngine {
  route(nodes: MeshControlNode[], minHealth = 70): MeshControlNode[] {
    return nodes.filter(n => n.health >= minHealth);
  }
}

class MeshAutonomyScaler {
  scale(node: MeshControlNode, signal: 'stable' | 'warning' | 'critical'): MeshControlNode {
    const autonomy =
      signal === 'stable' ? 'autonomous' :
      signal === 'warning' ? 'assisted' :
      'manual';
    return { ...node, autonomy };
  }
}

class MeshHealthReporter {
  summarize(nodes: MeshControlNode[]): { avgHealth: number; autonomousCount: number } {
    if (nodes.length === 0) return { avgHealth: 0, autonomousCount: 0 };
    const avgHealth = nodes.reduce((a, b) => a + b.health, 0) / nodes.length;
    const autonomousCount = nodes.filter(n => n.autonomy === 'autonomous').length;
    logger.debug('Control mesh health summarized', { avgHealth, autonomousCount });
    return { avgHealth: Math.round(avgHealth * 10) / 10, autonomousCount };
  }
}

export const controlMeshRegistry = new ControlMeshRegistry();
export const meshRoutingEngine = new MeshRoutingEngine();
export const meshAutonomyScaler = new MeshAutonomyScaler();
export const meshHealthReporter = new MeshHealthReporter();

export {
  ControlMeshRegistry,
  MeshRoutingEngine,
  MeshAutonomyScaler,
  MeshHealthReporter
};


