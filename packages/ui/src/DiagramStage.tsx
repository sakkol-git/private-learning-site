import { createStage, type Stage, type StageDiagram, type StageOptions } from '@ss/diagram-engine';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import styles from './DiagramStage.module.css';

export interface DiagramStageHandle<A extends string = string> {
  break(action: A): boolean;
  reset(): void;
  replay(): void;
}

interface DiagramStageProps<M, A extends string> {
  diagram: StageDiagram<M>;
  /** Scenarios, summary and value formatting for this course. Read once per diagram. */
  engine: Pick<StageOptions<M, A>, 'scenarios' | 'summarize' | 'formatValue'>;
  step: number;
  playing: boolean;
  reducedMotion: boolean;
  onMetrics: (metrics: M) => void;
  /** Accessible name of the scrollable diagram region. */
  label: string;
  ref?: Ref<DiagramStageHandle<A>>;
}

/** The one React wrapper around the framework-agnostic diagram engine. */
export function DiagramStage<M, A extends string>({
  diagram,
  engine,
  step,
  playing,
  reducedMotion,
  onMetrics,
  label,
  ref,
}: DiagramStageProps<M, A>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage<M, A> | null>(null);
  const engineRef = useRef(engine);
  const metricsCb = useRef(onMetrics);
  const stepRef = useRef(step);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    metricsCb.current = onMetrics;
  }, [onMetrics]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const stage = createStage<M, A>(svg, diagram, { ...engineRef.current, reducedMotion });
    stageRef.current = stage;
    stage.goToStep(stepRef.current);
    // On narrow screens the diagram scrolls sideways; start in the middle of it.
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
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
    <div
      ref={scrollerRef}
      className={styles.scroller}
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <svg ref={svgRef} className={styles.svg} />
      <p className="visually-hidden" aria-live="polite">
        {summary}
      </p>
    </div>
  );
}
