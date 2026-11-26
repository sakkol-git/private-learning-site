/** Infrastructure kinds (system design) and money kinds (financial education). */
export type NodeKind =
  | 'users'
  | 'loadBalancer'
  | 'server'
  | 'cache'
  | 'database'
  | 'queue'
  | 'cdn'
  | 'service'
  | 'person'
  | 'employer'
  | 'bank'
  | 'wallet'
  | 'jar'
  | 'shop'
  | 'scheme'
  | 'market';

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
  /**
   * Throughput this node handles before it saturates (flows count against it),
   * or, for a jar, the amount that counts as full.
   */
  capacity?: number;
  /** An amount shown in the node's stat pill, formatted by the stage's formatValue. */
  value?: number;
}

export interface DiagramLink {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed';
}

/**
 * request: the main thing moving (requests, money). response: what comes back
 * (responses, interest, returns). failed: bounces back. healthCheck: small muted pings.
 */
export type FlowKind = 'request' | 'response' | 'healthCheck' | 'failed';

export interface TrafficFlow {
  route: string[];
  kind: FlowKind;
  ratePerSec: number;
}

export type NodeUpdate = Partial<DiagramNode> & { id: string };

/** A step is a diff from the previous step, never a full redraw. */
export interface StepChange<M> {
  add?: { nodes?: DiagramNode[]; links?: DiagramLink[] };
  remove?: { nodes?: string[]; links?: string[] };
  update?: { nodes?: NodeUpdate[] };
  /** Replaces the active flows when present; omitted keeps the previous flows. */
  flows?: TrafficFlow[];
  metrics?: Partial<M>;
}

export interface DiagramInitial<M> {
  nodes: DiagramNode[];
  links: DiagramLink[];
  metrics: M;
}

export interface DiagramState<M> {
  nodes: DiagramNode[];
  links: DiagramLink[];
  flows: TrafficFlow[];
  metrics: M;
}
