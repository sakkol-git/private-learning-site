import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import styles from './SceneStage.module.css';

/** What every visual engine (diagram, chart, …) exposes to the page. */
export interface EngineStage<M, A extends string> {
  goToStep(index: number): void;
  play(): void;
  pause(): void;
  replay(): void;
  break(action: A): boolean;
  reset(): void;
  onMetrics(cb: (metrics: M, summary: string) => void): () => void;
  setReducedMotion(reduced: boolean): void;
  destroy(): void;
}

export interface SceneStageHandle<A extends string = string> {
  break(action: A): boolean;
  reset(): void;
  replay(): void;
}

interface SceneStageProps<M, A extends string> {
  /** Builds the engine on the SVG. Called again only when `sceneKey` changes. */
  create: (svg: SVGSVGElement, reducedMotion: boolean) => EngineStage<M, A>;
  sceneKey: unknown;
  step: number;
  playing: boolean;
  reducedMotion: boolean;
  onMetrics: (metrics: M) => void;
  /** Accessible name of the scrollable diagram region. */
  label: string;
  ref?: Ref<SceneStageHandle<A>>;
}

/** The one React wrapper around the framework-agnostic visual engines. */
export function SceneStage<M, A extends string>({
  create,
  sceneKey,
  step,
  playing,
  reducedMotion,
  onMetrics,
  label,
  ref,
}: SceneStageProps<M, A>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<EngineStage<M, A> | null>(null);
  const createRef = useRef(create);
  const metricsCb = useRef(onMetrics);
  const stepRef = useRef(step);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    metricsCb.current = onMetrics;
  }, [onMetrics]);

  useEffect(() => {
    createRef.current = create;
  }, [create]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const stage = createRef.current(svg, reducedMotion);
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
  }, [sceneKey]);

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
