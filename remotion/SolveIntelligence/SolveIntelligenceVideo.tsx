import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {SCENES} from './config';
import {Background} from './Background';
import {IntroScene} from './scenes/IntroScene';
import {ProblemScene} from './scenes/ProblemScene';
import {DraftingScene} from './scenes/DraftingScene';
import {ProsecutionScene} from './scenes/ProsecutionScene';
import {ChartsScene} from './scenes/ChartsScene';
import {TrustScene} from './scenes/TrustScene';
import {StatsScene} from './scenes/StatsScene';
import {CTAScene} from './scenes/CTAScene';

const FADE_FRAMES = 12;

const SceneFader: React.FC<{
  from: number;
  duration: number;
  children: React.ReactNode;
}> = ({from, duration, children}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const opacity = interpolate(
    local,
    [0, FADE_FRAMES, duration - FADE_FRAMES, duration],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return (
    <AbsoluteFill style={{opacity}}>
      <Sequence from={from} durationInFrames={duration}>
        {children}
      </Sequence>
    </AbsoluteFill>
  );
};

export const SolveIntelligenceVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <SceneFader from={SCENES.intro.from} duration={SCENES.intro.duration}>
        <IntroScene />
      </SceneFader>
      <SceneFader from={SCENES.problem.from} duration={SCENES.problem.duration}>
        <ProblemScene />
      </SceneFader>
      <SceneFader from={SCENES.drafting.from} duration={SCENES.drafting.duration}>
        <DraftingScene />
      </SceneFader>
      <SceneFader
        from={SCENES.prosecution.from}
        duration={SCENES.prosecution.duration}
      >
        <ProsecutionScene />
      </SceneFader>
      <SceneFader from={SCENES.charts.from} duration={SCENES.charts.duration}>
        <ChartsScene />
      </SceneFader>
      <SceneFader from={SCENES.trust.from} duration={SCENES.trust.duration}>
        <TrustScene />
      </SceneFader>
      <SceneFader from={SCENES.stats.from} duration={SCENES.stats.duration}>
        <StatsScene />
      </SceneFader>
      <SceneFader from={SCENES.cta.from} duration={SCENES.cta.duration}>
        <CTAScene />
      </SceneFader>
    </AbsoluteFill>
  );
};
