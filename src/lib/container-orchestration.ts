/**
 * Phase 137: Container Orchestration & Management
 * Kubernetes cluster management with node scaling, pod health, and service discovery
 */

import { logger } from './logger';

interface Node {
  name: string;
  status: 'ready' | 'notReady' | 'unknown';
  cpuCapacity: number;
  memoryCapacity: number;
  podsRunning: number;
  cpuUsage: number;
  memoryUsage: number;
  age: number;
  labels: Record<string, string>;
}

interface Pod {
  name: string;
  namespace: string;
  status: 'pending' | 'running' | 'failed' | 'succeeded' | 'unknown';
  age: number;
  restarts: number;
  cpuUsage: number;
  memoryUsage: number;
  ready: boolean;
  image: string;
  nodeSelector?: Record<string, string>;
}

interface PodEvent {
  type: 'created' | 'scheduled' | 'pulled' | 'started' | 'ready' | 'failed' | 'terminated';
  timestamp: number;
  message: string;
  reason: string;
}

interface ReplicaSet {
  name: string;
  desiredReplicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  availableReplicas: number;
}

class KubernetesCluster {
  private nodes: Map<string, Node> = new Map();
  private counter = 0;

  listNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  getNode(nodeName: string): Node | undefined {
    return this.nodes.get(nodeName);
  }

  addNode(config: {
    name: string;
    cpuCapacity: number;
    memoryCapacity: number;
    labels?: Record<string, string>;
  }): Node {
    const node: Node = {
      name: config.name,
      status: 'ready',
      cpuCapacity: config.cpuCapacity,
      memoryCapacity: config.memoryCapacity,
      podsRunning: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      age: 0,
      labels: config.labels || {}
    };

    this.nodes.set(config.name, node);
    logger.debug('Node added to cluster', { name: config.name, cpu: config.cpuCapacity });
    return node;
  }

  cordonNode(nodeName: string): boolean {
    const node = this.nodes.get(nodeName);
    if (node) {
      node.status = 'notReady';
      logger.debug('Node cordoned', { name: nodeName });
      return true;
    }
    return false;
  }

  uncordonNode(nodeName: string): boolean {
    const node = this.nodes.get(nodeName);
    if (node) {
      node.status = 'ready';
      logger.debug('Node uncordoned', { name: nodeName });
      return true;
    }
    return false;
  }

  drainNode(nodeName: string): { successCount: number; failedCount: number } {
    const node = this.nodes.get(nodeName);
    if (!node) return { successCount: 0, failedCount: 0 };

    const podsToRemove = node.podsRunning;
    node.podsRunning = 0;
    logger.debug('Node drained', { name: nodeName, podsRemoved: podsToRemove });

    return { successCount: podsToRemove, failedCount: 0 };
  }

  getNodeMetrics(nodeName: string): {
    cpuUsagePercent: number;
    memoryUsagePercent: number;
  } | null {
    const node = this.nodes.get(nodeName);
    if (!node) return null;

    return {
      cpuUsagePercent: (node.cpuUsage / node.cpuCapacity) * 100,
      memoryUsagePercent: (node.memoryUsage / node.memoryCapacity) * 100
    };
  }

  getClusterCapacity(): {
    totalCpu: number;
    totalMemory: number;
    usedCpu: number;
    usedMemory: number;
    utilizationPercent: { cpu: number; memory: number };
  } {
    let totalCpu = 0;
    let totalMemory = 0;
    let usedCpu = 0;
    let usedMemory = 0;

    for (const node of this.nodes.values()) {
      totalCpu += node.cpuCapacity;
      totalMemory += node.memoryCapacity;
      usedCpu += node.cpuUsage;
      usedMemory += node.memoryUsage;
    }

    return {
      totalCpu,
      totalMemory,
      usedCpu,
      usedMemory,
      utilizationPercent: {
        cpu: totalCpu > 0 ? (usedCpu / totalCpu) * 100 : 0,
        memory: totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0
      }
    };
  }
}

class NodeManager {
  private nodes: Map<string, Node> = new Map();

  registerNode(node: Node): void {
    this.nodes.set(node.name, node);
    logger.debug('Node registered', { name: node.name });
  }

  listReadyNodes(): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.status === 'ready');
  }

  getNodeCapacity(nodeName: string): { available: number; used: number } | null {
    const node = this.nodes.get(nodeName);
    if (!node) return null;

    return {
      available: node.cpuCapacity - node.cpuUsage,
      used: node.cpuUsage
    };
  }

  updateNodeMetrics(nodeName: string, cpuUsage: number, memoryUsage: number): void {
    const node = this.nodes.get(nodeName);
    if (node) {
      node.cpuUsage = cpuUsage;
      node.memoryUsage = memoryUsage;
      logger.debug('Node metrics updated', { name: nodeName, cpu: cpuUsage, memory: memoryUsage });
    }
  }

  taintNode(nodeName: string, taint: { key: string; value: string; effect: string }): void {
    const node = this.nodes.get(nodeName);
    if (node) {
      logger.debug('Node tainted', { name: nodeName, taint });
    }
  }

  removeNodeTaint(nodeName: string, key: string): void {
    const node = this.nodes.get(nodeName);
    if (node) {
      logger.debug('Node taint removed', { name: nodeName, key });
    }
  }
}

class PodManager {
  private pods: Map<string, Pod> = new Map();
  private events: Map<string, PodEvent[]> = new Map();
  private counter = 0;

  createPod(config: {
    name: string;
    namespace: string;
    image: string;
    cpuRequest?: number;
    memoryRequest?: number;
  }): Pod {
    const podId = `${config.namespace}/${config.name}`;
    const pod: Pod = {
      name: config.name,
      namespace: config.namespace,
      status: 'pending',
      age: 0,
      restarts: 0,
      cpuUsage: config.cpuRequest || 0.1,
      memoryUsage: config.memoryRequest || 128,
      ready: false,
      image: config.image
    };

    this.pods.set(podId, pod);
    this.events.set(podId, []);

    logger.debug('Pod created', { namespace: config.namespace, name: config.name });
    return pod;
  }

  listPods(namespace: string): Pod[] {
    const namespacePods: Pod[] = [];
    for (const [key, pod] of this.pods.entries()) {
      if (pod.namespace === namespace) {
        namespacePods.push(pod);
      }
    }
    return namespacePods;
  }

  getPod(namespace: string, name: string): Pod | undefined {
    return this.pods.get(`${namespace}/${name}`);
  }

  updatePodStatus(namespace: string, name: string, status: Pod['status']): void {
    const podId = `${namespace}/${name}`;
    const pod = this.pods.get(podId);
    if (pod) {
      pod.status = status;
      if (status === 'running') {
        pod.ready = true;
      }
      this.recordEvent(podId, {
        type: status === 'running' ? 'started' : status === 'failed' ? 'failed' : 'scheduled',
        message: `Pod ${status}`,
        reason: status
      });
    }
  }

  recordEvent(podId: string, event: Omit<PodEvent, 'timestamp'>): void {
    const events = this.events.get(podId) || [];
    events.push({
      ...event,
      timestamp: Date.now()
    });
    this.events.set(podId, events.slice(-50)); // Keep last 50 events
  }

  getEvents(namespace: string, name: string): PodEvent[] {
    const podId = `${namespace}/${name}`;
    return this.events.get(podId) || [];
  }

  deletePod(namespace: string, name: string): boolean {
    const podId = `${namespace}/${name}`;
    const deleted = this.pods.delete(podId);
    if (deleted) {
      logger.debug('Pod deleted', { namespace, name });
    }
    return deleted;
  }

  getPodMetrics(namespace: string, name: string): {
    cpuUsagePercent: number;
    memoryUsagePercent: number;
  } | null {
    const pod = this.getPod(namespace, name);
    if (!pod) return null;

    return {
      cpuUsagePercent: (pod.cpuUsage / 2) * 100,
      memoryUsagePercent: (pod.memoryUsage / 1024) * 100
    };
  }
}

class ServiceRegistry {
  private services: Map<string, { name: string; namespace: string; clusterIP: string; endpoints: string[] }> = new Map();
  private counter = 0;

  registerService(config: {
    name: string;
    namespace: string;
    port: number;
  }): { clusterIP: string; dnsName: string } {
    const serviceId = `${config.namespace}/${config.name}`;
    const clusterIP = `10.${++this.counter}.0.1`;
    const dnsName = `${config.name}.${config.namespace}.svc.cluster.local`;

    this.services.set(serviceId, {
      name: config.name,
      namespace: config.namespace,
      clusterIP,
      endpoints: []
    });

    logger.debug('Service registered', { name: config.name, namespace: config.namespace, clusterIP });
    return { clusterIP, dnsName };
  }

  getService(namespace: string, name: string): {
    clusterIP: string;
    dnsName: string;
  } | null {
    const serviceId = `${namespace}/${name}`;
    const service = this.services.get(serviceId);
    if (!service) return null;

    return {
      clusterIP: service.clusterIP,
      dnsName: `${service.name}.${service.namespace}.svc.cluster.local`
    };
  }

  addEndpoint(namespace: string, serviceName: string, podIP: string): void {
    const serviceId = `${namespace}/${serviceName}`;
    const service = this.services.get(serviceId);
    if (service) {
      service.endpoints.push(podIP);
      logger.debug('Endpoint added', { service: serviceName, ip: podIP });
    }
  }

  getEndpoints(namespace: string, serviceName: string): string[] {
    const serviceId = `${namespace}/${serviceName}`;
    const service = this.services.get(serviceId);
    return service?.endpoints || [];
  }

  discoverServices(namespace: string): Array<{ name: string; clusterIP: string }> {
    const namespaceServices: Array<{ name: string; clusterIP: string }> = [];
    for (const [, service] of this.services.entries()) {
      if (service.namespace === namespace) {
        namespaceServices.push({ name: service.name, clusterIP: service.clusterIP });
      }
    }
    return namespaceServices;
  }
}

export const kubernetesCluster = new KubernetesCluster();
export const nodeManager = new NodeManager();
export const podManager = new PodManager();
export const serviceRegistry = new ServiceRegistry();

export { Node, Pod, PodEvent, ReplicaSet };
