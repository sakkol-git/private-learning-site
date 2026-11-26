import {
  createStage,
  type BreakAction,
  type Metrics,
  type Stage,
  type StageDiagram,
} from '@ss/diagram-engine';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import styles from './DiagramStage.module.css';

export interface DiagramStageHandle {
  break(action: BreakAction): boolean;
  reset(): void;
  replay(): void;
}

interface DiagramStageProps {
  diagram: StageDiagram;
  step: number;
  playing: boolean;
  reducedMotion: boolean;
  onMetrics: (metrics: Metrics) => void;
  /** Accessible name of the scrollable diagram region. */
  label: string;
  ref?: Ref<DiagramStageHandle>;
}

/** The one React wrapper around the framework-agnostic diagram engine. */
export function DiagramStage({
  diagram,
  step,
  playing,
  reducedMotion,
  onMetrics,
  label,
  ref,
}: DiagramStageProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const metricsCb = useRef(onMetrics);
  const stepRef = useRef(step);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    metricsCb.current = onMetrics;
  }, [onMetrics]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const stage = createStage(svg, diagram, { reducedMotion });
    stageRef.current = stage;
    stage.goToStep(stepRef.current);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = stage.onMetrics((m, text) => {
      metricsCb.current(m);
      clearTimeout(timer);
      timer = setTimeout(() => setSummary(text), 900);
    });
    return () => {
      clearTimeout(timer);
      off();
      stage.destroy();
      stageRef.current = null;
    };
    // reducedMotion changes are applied below without rebuilding the stage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram]);

  useEffect(() => {
    stepRef.current = step;
    stageRef.current?.goToStep(step);
  }, [step]);

  useEffect(() => {
    if (playing) stageRef.current?.play();
    else stageRef.current?.pause();
  }, [playing]);

  useEffect(() => {
    stageRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useImperativeHandle(
    ref,
    () => ({
      break: (action) => stageRef.current?.break(action) ?? false,
      reset: () => stageRef.current?.reset(),
      replay: () => stageRef.current?.replay(),
    }),
    [],
  );

  return (
    <div className={styles.scroller} tabIndex={0} role="region" aria-label={label}>
      <svg ref={svgRef} className={styles.svg} />
      <p className="visually-hidden" aria-live="polite">
        {summary}
      </p>
    </div>
  );
}
