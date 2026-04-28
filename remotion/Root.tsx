import {Composition} from 'remotion';
import {SolveIntelligenceVideo} from './SolveIntelligence/SolveIntelligenceVideo';
import {VIDEO_CONFIG} from './SolveIntelligence/config';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SolveIntelligenceFeatures"
        component={SolveIntelligenceVideo}
        durationInFrames={VIDEO_CONFIG.durationInFrames}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
    </>
  );
};
