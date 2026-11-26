export type NodeKind =
  'users' | 'loadBalancer' | 'server' | 'cache' | 'database' | 'queue' | 'cdn' | 'service';

export type Health = 'healthy' | 'degraded' | 'down';

/** x, y are isometric floor grid cells; z lifts the block off the floor. */
export interface DiagramNode {
  id: string;
  kind: NodeKind;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  z?: number;
  health?: Health;
  /** Requests per second this node handles before it saturates. */
  capacity?: number;
}

export interface DiagramLink {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed';
}

export type FlowKind = 'request' | 'response' | 'healthCheck' | 'failed';

export interface TrafficFlow {
  route: string[];
  kind: FlowKind;
  ratePerSec: number;
}

export interface Metrics {
  users: number;
  requestsPerSec: number;
  p95LatencyMs: number;
  errorRatePct: number;
  /** [healthy, total] servers */
  healthy: [number, number];
}

export type NodeUpdate = Partial<DiagramNode> & { id: string };

/** A step is a diff from the previous step, never a full redraw. */
export interface StepChange {
  add?: { nodes?: DiagramNode[]; links?: DiagramLink[] };
  remove?: { nodes?: string[]; links?: string[] };
  update?: { nodes?: NodeUpdate[] };
  /** Replaces the active flows when present; omitted keeps the previous flows. */
  flows?: TrafficFlow[];
  metrics?: Partial<Metrics>;
}

export type BreakAction = 'killServer' | 'spikeTraffic' | 'slowDatabase';

export interface DiagramInitial {
  nodes: DiagramNode[];
  links: DiagramLink[];
  metrics: Metrics;
}

export interface DiagramState {
  nodes: DiagramNode[];
  links: DiagramLink[];
  flows: TrafficFlow[];
  metrics: Metrics;
}
