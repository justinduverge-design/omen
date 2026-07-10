import React from 'react';
import { AbsoluteFill, Audio, Composition, Img, interpolate, registerRoot, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

const COLORS = {
  raven: '#0A0A0B',
  charcoal: '#1C1C1E',
  bone: '#F5F0E8',
  brass: '#A67C2E',
  verdigris: '#2F7D5B',
  crimson: '#7E1717',
  umber: '#5A3A25',
};

const copy = {
  hook: 'Your lineup has a blind spot.',
  context: 'Trades. Drafts. Weekly starts.',
  turn: 'Omen tests the move before you make it.',
  line: 'See the result before it happens.',
  soon: 'Coming soon',
  cta: 'Join the waitlist',
};

const hypeCopy = {
  hook: 'Your league is guessing.',
  snap: 'Trades. Starts. Draft calls.',
  turn: 'Omen is coming.',
  line: 'See the move before the league does.',
  cta: 'Join the waitlist',
};

const explainerCopy = {
  hook: 'Your league is guessing.',
  context: 'Omen reads the roster, matchup, and league context.',
  result: 'Recommendation first. Confidence and risk right behind it.',
  edge: 'The edge is in what you almost missed.',
  cta: 'Join the waitlist',
};

const appExplainerCopy = [
  'Real Omen UI. Mock roster data.',
  'Recommendation first.',
  'Confidence, risk, and input honesty stay visible.',
  'Join the waitlist',
];

function fade(frame, start, end) {
  return interpolate(frame, [start, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

function out(frame, start, end) {
  return interpolate(frame, [start, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

function SceneText({ children, top, size, delay = 0, align = 'center', maxWidth = 780 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 24, stiffness: 90 } });
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: '50%',
        width: '86%',
        maxWidth,
        transform: `translate(-50%, ${interpolate(enter, [0, 1], [24, 0])}px)`,
        opacity: enter,
        color: COLORS.bone,
        fontFamily: 'Alegreya Sans, Arial, sans-serif',
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.02,
        textAlign: align,
        letterSpacing: 0,
      }}
    >
      {children}
    </div>
  );
}

function DataGrid({ variant }) {
  const frame = useCurrentFrame();
  const vertical = variant === 'vertical';
  const cols = vertical ? 5 : 8;
  const rows = vertical ? 11 : 5;
  const cells = Array.from({ length: cols * rows });
  return (
    <div
      style={{
        position: 'absolute',
        inset: vertical ? '140px 70px' : '90px 130px',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: vertical ? 18 : 16,
        opacity: 0.32,
      }}
    >
      {cells.map((_, index) => {
        const pulse = Math.sin((frame + index * 7) / 19);
        const active = index % 9 === 2 || index % 13 === 5;
        return (
          <div
            key={index}
            style={{
              height: vertical ? 58 : 54,
              border: `1px solid ${active ? COLORS.verdigris : 'rgba(245,240,232,0.13)'}`,
              background: active ? `rgba(47,125,91,${0.12 + pulse * 0.03})` : 'rgba(245,240,232,0.035)',
              boxShadow: active ? `0 0 ${18 + pulse * 8}px rgba(47,125,91,0.22)` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

function DecisionCards({ variant }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = variant === 'vertical';
  const enter = spring({ frame: frame - 70, fps, config: { damping: 22, stiffness: 80 } });
  const labels = [
    ['Trade', 'Medium risk'],
    ['Draft', 'Value missed'],
    ['Weekly Move', 'Start signal'],
  ];
  return (
    <div
      style={{
        position: 'absolute',
        top: vertical ? 650 : 380,
        left: '50%',
        transform: `translateX(-50%) scale(${interpolate(enter, [0, 1], [0.96, 1])})`,
        display: 'grid',
        gridTemplateColumns: vertical ? '1fr' : 'repeat(3, 1fr)',
        gap: 22,
        width: vertical ? '78%' : '76%',
        opacity: enter,
      }}
    >
      {labels.map(([title, meta], index) => (
        <div
          key={title}
          style={{
            minHeight: vertical ? 132 : 150,
            padding: 28,
            background: 'rgba(28,28,30,0.92)',
            border: `1px solid ${index === 1 ? COLORS.crimson : 'rgba(245,240,232,0.14)'}`,
            boxShadow: index === 1 ? '0 0 34px rgba(126,23,23,0.28)' : '0 18px 60px rgba(0,0,0,0.24)',
          }}
        >
          <div style={{ color: COLORS.bone, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: vertical ? 42 : 38, fontWeight: 800 }}>
            {title}
          </div>
          <div style={{ marginTop: 14, color: index === 1 ? '#E6B0A8' : '#B9CDBF', fontFamily: 'Alegreya, Georgia, serif', fontSize: 25 }}>
            {meta}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecommendationPanel({ variant }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = variant === 'vertical';
  const enter = spring({ frame: frame - 165, fps, config: { damping: 24, stiffness: 85 } });
  const scan = interpolate(frame, [165, 255], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        top: vertical ? 690 : 400,
        left: '50%',
        width: vertical ? '82%' : 820,
        minHeight: vertical ? 330 : 260,
        transform: `translateX(-50%) scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
        opacity: enter,
        background: `linear-gradient(135deg, rgba(28,28,30,0.97), rgba(10,10,11,0.96))`,
        border: `1px solid rgba(166,124,46,0.72)`,
        boxShadow: '0 0 80px rgba(47,125,91,0.2), 0 30px 90px rgba(0,0,0,0.42)',
        padding: vertical ? 38 : 34,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${scan * 100 - 18}%`,
          width: '18%',
          background: 'linear-gradient(90deg, transparent, rgba(47,125,91,0.28), transparent)',
        }}
      />
      <div style={{ color: COLORS.brass, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: 24, fontWeight: 800, textTransform: 'uppercase' }}>
        Omen signal
      </div>
      <div style={{ marginTop: 22, color: COLORS.bone, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: vertical ? 55 : 47, fontWeight: 900, lineHeight: 1.04 }}>
        Start the stronger move.
      </div>
      <div style={{ marginTop: 18, color: '#C9D8CE', fontFamily: 'Alegreya, Georgia, serif', fontSize: vertical ? 31 : 27, lineHeight: 1.25 }}>
        Clear recommendation. Visible confidence. Risk shown before kickoff.
      </div>
    </div>
  );
}

function Promo({ variant = 'vertical' }) {
  const frame = useCurrentFrame();
  const vertical = variant === 'vertical';
  const showCards = fade(frame, 58, 84) * out(frame, 150, 166);
  const showPanel = fade(frame, 154, 178) * out(frame, 262, 282);
  const showLine = fade(frame, 262, 286) * out(frame, 352, 366);
  const showEnd = fade(frame, 354, 378);
  const slowZoom = interpolate(frame, [0, 450], [1, 1.08]);

  return (
    <AbsoluteFill style={{ background: COLORS.raven, overflow: 'hidden' }}>
      <Audio src={staticFile('audio/coming-soon-bed.wav')} volume={0.72} />
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          transform: `scale(${slowZoom})`,
          background:
            `radial-gradient(circle at 50% 28%, rgba(47,125,91,0.20), transparent 30%), ` +
            `linear-gradient(180deg, ${COLORS.raven}, #11100E 58%, ${COLORS.raven})`,
        }}
      />
      <DataGrid variant={variant} />
      <Img
        src={staticFile('omen-primary-emblem.png')}
        style={{
          position: 'absolute',
          top: vertical ? 210 : 84,
          left: '50%',
          width: vertical ? 290 : 210,
          transform: 'translateX(-50%)',
          opacity: (0.14 + fade(frame, 0, 42) * 0.34) * out(frame, 76, 108),
          filter: 'drop-shadow(0 0 46px rgba(166,124,46,0.32))',
        }}
      />

      <div style={{ opacity: fade(frame, 6, 30) * out(frame, 70, 86) }}>
        <SceneText top={vertical ? 600 : 350} size={vertical ? 78 : 70} delay={8} maxWidth={vertical ? 860 : 1100}>
          {copy.hook}
        </SceneText>
      </div>

      <div style={{ opacity: showCards }}>
        <SceneText top={vertical ? 470 : 250} size={vertical ? 54 : 50} delay={72} maxWidth={vertical ? 820 : 1100}>
          {copy.context}
        </SceneText>
        <DecisionCards variant={variant} />
      </div>

      <div style={{ opacity: showPanel }}>
        <SceneText top={vertical ? 470 : 250} size={vertical ? 48 : 46} delay={164} maxWidth={vertical ? 850 : 1150}>
          {copy.turn}
        </SceneText>
        <RecommendationPanel variant={variant} />
      </div>

      <div style={{ opacity: showLine }}>
        <SceneText top={vertical ? 680 : 390} size={vertical ? 86 : 82} delay={268} maxWidth={vertical ? 900 : 1220}>
          {copy.line}
        </SceneText>
        <div
          style={{
            position: 'absolute',
            top: vertical ? 905 : 530,
            left: '50%',
            width: vertical ? 420 : 560,
            height: 5,
            transform: 'translateX(-50%)',
            background: COLORS.brass,
            boxShadow: '0 0 28px rgba(166,124,46,0.52)',
          }}
        />
      </div>

      <div style={{ opacity: showEnd }}>
        <Img
          src={staticFile('omen-primary-emblem.png')}
          style={{
            position: 'absolute',
            top: vertical ? 430 : 240,
            left: '50%',
            width: vertical ? 280 : 200,
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 0 42px rgba(166,124,46,0.32))',
          }}
        />
        <SceneText top={vertical ? 755 : 470} size={vertical ? 96 : 86} delay={358}>
          Omen
        </SceneText>
        <SceneText top={vertical ? 890 : 580} size={vertical ? 46 : 40} delay={370}>
          {copy.soon}
        </SceneText>
        <div
          style={{
            position: 'absolute',
            top: vertical ? 1030 : 672,
            left: '50%',
            transform: 'translateX(-50%)',
            color: COLORS.raven,
            background: COLORS.brass,
            fontFamily: 'Alegreya Sans, Arial, sans-serif',
            fontSize: vertical ? 38 : 31,
            fontWeight: 900,
            padding: vertical ? '22px 42px' : '18px 36px',
          }}
        >
          {copy.cta}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: vertical ? 72 : 46,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(245,240,232,0.58)',
          fontFamily: 'Alegreya Sans, Arial, sans-serif',
          fontSize: vertical ? 26 : 22,
          opacity: fade(frame, 10, 30),
        }}
      >
        Fantasy football decision intelligence
      </div>
    </AbsoluteFill>
  );
}

function StrikeLine({ top, delay, width = 620 }) {
  const frame = useCurrentFrame();
  const reveal = fade(frame, delay, delay + 10);
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: '50%',
        width: width * reveal,
        height: 5,
        transform: 'translateX(-50%)',
        background: COLORS.brass,
        boxShadow: '0 0 30px rgba(166,124,46,0.48)',
      }}
    />
  );
}

function HypeText({ children, top, size, delay, maxWidth = 900 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 180 } });
  const exit = out(frame, delay + 54, delay + 68);
  const shake = Math.sin(frame * 1.7) * interpolate(enter, [0, 1], [7, 0]);
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: '50%',
        width: '88%',
        maxWidth,
        transform: `translate(calc(-50% + ${shake}px), ${interpolate(enter, [0, 1], [38, 0])}px) scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
        opacity: enter * exit,
        color: COLORS.bone,
        fontFamily: 'Alegreya Sans, Arial, sans-serif',
        fontSize: size,
        fontWeight: 900,
        lineHeight: 0.98,
        textAlign: 'center',
        letterSpacing: 0,
        textShadow: '0 16px 45px rgba(0,0,0,0.56)',
      }}
    >
      {children}
    </div>
  );
}

function ScoreboardStrips({ variant }) {
  const frame = useCurrentFrame();
  const vertical = variant === 'vertical';
  const labels = ['TRADE', 'START', 'DRAFT', 'RISK', 'EDGE', 'OMEN'];
  return (
    <div
      style={{
        position: 'absolute',
        inset: vertical ? '180px 46px' : '92px 92px',
        display: 'grid',
        gridTemplateColumns: vertical ? '1fr 1fr' : 'repeat(6, 1fr)',
        gap: 14,
        opacity: 0.62,
      }}
    >
      {labels.map((label, index) => {
        const active = Math.sin((frame + index * 11) / 9) > 0.25;
        return (
          <div
            key={label}
            style={{
              height: vertical ? 88 : 76,
              border: `1px solid ${active ? COLORS.brass : 'rgba(245,240,232,0.14)'}`,
              background: active ? 'rgba(166,124,46,0.10)' : 'rgba(28,28,30,0.52)',
              color: active ? COLORS.brass : 'rgba(245,240,232,0.26)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Alegreya Sans, Arial, sans-serif',
              fontSize: vertical ? 28 : 24,
              fontWeight: 900,
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

function HypeReel({ variant = 'vertical' }) {
  const frame = useCurrentFrame();
  const vertical = variant === 'vertical';
  const speed = interpolate(frame, [0, 360], [0, vertical ? -360 : -180]);
  const flash = [42, 86, 130, 174, 218, 276, 326].some((hit) => Math.abs(frame - hit) < 3);
  const end = fade(frame, 298, 326);

  return (
    <AbsoluteFill style={{ background: COLORS.raven, overflow: 'hidden' }}>
      <Audio src={staticFile('audio/hype-snare-bed.wav')} volume={0.9} />
      <div
        style={{
          position: 'absolute',
          inset: '-12%',
          background:
            `radial-gradient(circle at 50% 38%, rgba(126,23,23,0.20), transparent 26%), ` +
            `radial-gradient(circle at 50% 48%, rgba(47,125,91,0.26), transparent 34%), ` +
            `linear-gradient(180deg, ${COLORS.raven}, #151313 55%, ${COLORS.raven})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: flash ? 0.22 : 0,
          background: COLORS.bone,
        }}
      />
      <div style={{ transform: `translateY(${speed}px)`, opacity: out(frame, 286, 314) }}>
        <ScoreboardStrips variant={variant} />
      </div>
      <Img
        src={staticFile('omen-primary-emblem.png')}
        style={{
          position: 'absolute',
          top: vertical ? 270 : 110,
          left: '50%',
          width: vertical ? 360 : 250,
          transform: `translateX(-50%) scale(${1 + Math.sin(frame / 10) * 0.012})`,
          opacity: 0.22,
          filter: 'drop-shadow(0 0 62px rgba(166,124,46,0.34))',
        }}
      />

      <HypeText top={vertical ? 570 : 320} size={vertical ? 88 : 84} delay={10} maxWidth={vertical ? 900 : 1240}>
        {hypeCopy.hook}
      </HypeText>
      <HypeText top={vertical ? 575 : 320} size={vertical ? 78 : 76} delay={82} maxWidth={vertical ? 920 : 1240}>
        {hypeCopy.snap}
      </HypeText>
      <HypeText top={vertical ? 600 : 338} size={vertical ? 104 : 98} delay={156} maxWidth={vertical ? 920 : 1240}>
        {hypeCopy.turn}
      </HypeText>

      <div style={{ opacity: fade(frame, 232, 256) * out(frame, 302, 318) }}>
        <SceneText top={vertical ? 640 : 355} size={vertical ? 76 : 74} delay={236} maxWidth={vertical ? 920 : 1280}>
          {hypeCopy.line}
        </SceneText>
        <StrikeLine top={vertical ? 860 : 485} delay={248} width={vertical ? 520 : 680} />
      </div>

      <div style={{ opacity: end }}>
        <Img
          src={staticFile('omen-primary-emblem.png')}
          style={{
            position: 'absolute',
            top: vertical ? 410 : 220,
            left: '50%',
            width: vertical ? 320 : 220,
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 0 54px rgba(166,124,46,0.36))',
          }}
        />
        <SceneText top={vertical ? 760 : 460} size={vertical ? 98 : 86} delay={304}>
          Omen
        </SceneText>
        <div
          style={{
            position: 'absolute',
            top: vertical ? 930 : 586,
            left: '50%',
            transform: 'translateX(-50%)',
            color: COLORS.raven,
            background: COLORS.brass,
            fontFamily: 'Alegreya Sans, Arial, sans-serif',
            fontSize: vertical ? 38 : 31,
            fontWeight: 900,
            padding: vertical ? '22px 42px' : '18px 36px',
          }}
        >
          {hypeCopy.cta}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: vertical ? 74 : 46,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(245,240,232,0.6)',
          fontFamily: 'Alegreya Sans, Arial, sans-serif',
          fontSize: vertical ? 26 : 22,
        }}
      >
        Fantasy football decision intelligence
      </div>
    </AbsoluteFill>
  );
}

function ExplainerCaption({ children, top, delay, size, maxWidth = 980 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 24, stiffness: 95 } });
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: '50%',
        width: '88%',
        maxWidth,
        transform: `translate(-50%, ${interpolate(enter, [0, 1], [26, 0])}px)`,
        opacity: enter,
        color: COLORS.bone,
        fontFamily: 'Alegreya Sans, Arial, sans-serif',
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.02,
        textAlign: 'center',
        letterSpacing: 0,
      }}
    >
      {children}
    </div>
  );
}

function UiShell({ variant, children, top, delay, width = 760, height = 560 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = variant === 'vertical';
  const enter = spring({ frame: frame - delay, fps, config: { damping: 26, stiffness: 82 } });
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: '50%',
        width: vertical ? '84%' : width,
        height: vertical ? height : Math.round(height * 0.72),
        transform: `translateX(-50%) scale(${interpolate(enter, [0, 1], [0.95, 1])})`,
        opacity: enter,
        background: 'linear-gradient(145deg, rgba(28,28,30,0.98), rgba(8,8,9,0.98))',
        border: '1px solid rgba(166,124,46,0.36)',
        boxShadow: '0 28px 110px rgba(0,0,0,0.55), 0 0 70px rgba(47,125,91,0.12)',
        overflow: 'hidden',
        padding: vertical ? 30 : 26,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 22,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 999, background: COLORS.crimson }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: COLORS.brass }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: COLORS.verdigris }} />
        <span style={{ marginLeft: 'auto', color: 'rgba(245,240,232,0.35)', fontSize: 17, fontFamily: 'Alegreya Sans, Arial, sans-serif' }}>
          Omen
        </span>
      </div>
      {children}
    </div>
  );
}

function Pill({ children, color = COLORS.brass }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${color}66`,
        background: `${color}18`,
        color,
        padding: '8px 12px',
        fontFamily: 'Alegreya Sans, Arial, sans-serif',
        fontSize: 18,
        fontWeight: 800,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function DecisionProblemPanel({ variant }) {
  const vertical = variant === 'vertical';
  const rows = [
    ['Trade offer', 'Breece Hall + Olave', 'Accept?'],
    ['Start/Sit', 'Warren vs. Conner', 'Who starts?'],
    ['Draft call', 'WR run at pick 18', 'Reach or wait?'],
  ];
  return (
    <UiShell variant={variant} top={vertical ? 530 : 284} delay={48} height={vertical ? 650 : 480}>
      <div style={{ color: COLORS.brass, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: vertical ? 24 : 21, fontWeight: 900, textTransform: 'uppercase' }}>
        Close calls
      </div>
      <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
        {rows.map(([type, detail, question], index) => (
          <div
            key={type}
            style={{
              display: 'grid',
              gridTemplateColumns: vertical ? '1fr' : '170px 1fr 150px',
              gap: vertical ? 7 : 16,
              alignItems: 'center',
              border: '1px solid rgba(245,240,232,0.1)',
              background: index === 1 ? 'rgba(126,23,23,0.15)' : 'rgba(245,240,232,0.035)',
              padding: vertical ? 18 : 16,
            }}
          >
            <div style={{ color: 'rgba(245,240,232,0.46)', fontSize: vertical ? 20 : 18, fontFamily: 'Alegreya Sans, Arial, sans-serif', textTransform: 'uppercase', fontWeight: 800 }}>
              {type}
            </div>
            <div style={{ color: COLORS.bone, fontSize: vertical ? 30 : 25, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontWeight: 900 }}>
              {detail}
            </div>
            <div style={{ color: index === 1 ? '#E0A59B' : COLORS.brass, fontSize: vertical ? 21 : 19, fontFamily: 'Alegreya, Georgia, serif' }}>
              {question}
            </div>
          </div>
        ))}
      </div>
    </UiShell>
  );
}

function ContextPanel({ variant }) {
  const vertical = variant === 'vertical';
  const items = [
    ['Roster', 'Starters, bench, injuries'],
    ['Matchup', 'Opponent, scoring, schedule'],
    ['Market', 'Player value, depth, waivers'],
  ];
  return (
    <UiShell variant={variant} top={vertical ? 540 : 282} delay={154} height={vertical ? 600 : 500}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
        <div>
          <div style={{ color: COLORS.brass, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: vertical ? 23 : 20, fontWeight: 900, textTransform: 'uppercase' }}>
            League context
          </div>
          <div style={{ marginTop: 10, color: COLORS.bone, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: vertical ? 38 : 32, fontWeight: 900 }}>
            ESPN · Yahoo · Sleeper
          </div>
        </div>
        <Pill color={COLORS.verdigris}>Connected</Pill>
      </div>
      <div style={{ marginTop: 30, display: 'grid', gap: 16 }}>
        {items.map(([label, value], index) => (
          <div
            key={label}
            style={{
              display: 'grid',
              gridTemplateColumns: vertical ? '1fr' : '160px 1fr',
              alignItems: 'center',
              borderLeft: `5px solid ${index === 0 ? COLORS.verdigris : index === 1 ? COLORS.brass : COLORS.crimson}`,
              background: 'rgba(245,240,232,0.045)',
              padding: vertical ? 18 : 16,
            }}
          >
            <div style={{ color: 'rgba(245,240,232,0.48)', fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: 19, fontWeight: 800, textTransform: 'uppercase' }}>
              {label}
            </div>
            <div style={{ color: COLORS.bone, fontFamily: 'Alegreya, Georgia, serif', fontSize: vertical ? 28 : 24 }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </UiShell>
  );
}

function RecommendationExplainerPanel({ variant }) {
  const vertical = variant === 'vertical';
  return (
    <UiShell variant={variant} top={vertical ? 500 : 238} delay={278} height={vertical ? 710 : 610}>
      <div style={{ color: COLORS.brass, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: 22, fontWeight: 900, textTransform: 'uppercase' }}>
        Omen recommendation
      </div>
      <div style={{ marginTop: 20, color: COLORS.bone, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: vertical ? 50 : 42, lineHeight: 1.05, fontWeight: 900 }}>
        Accept the trade.
      </div>
      <div style={{ marginTop: 16, color: 'rgba(245,240,232,0.7)', fontFamily: 'Alegreya, Georgia, serif', fontSize: vertical ? 28 : 24, lineHeight: 1.25 }}>
        Your weekly upside improves and you gain a stronger long-term starter.
      </div>
      <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: vertical ? '1fr' : '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid rgba(47,125,91,0.36)', background: 'rgba(47,125,91,0.10)', padding: 20 }}>
          <div style={{ color: 'rgba(245,240,232,0.48)', fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: 17, fontWeight: 800, textTransform: 'uppercase' }}>
            Confidence
          </div>
          <div style={{ marginTop: 10, color: COLORS.bone, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: 36, fontWeight: 900 }}>
            82 · Strong lean
          </div>
        </div>
        <div style={{ border: '1px solid rgba(166,124,46,0.36)', background: 'rgba(166,124,46,0.10)', padding: 20 }}>
          <div style={{ color: 'rgba(245,240,232,0.48)', fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: 17, fontWeight: 800, textTransform: 'uppercase' }}>
            Risk
          </div>
          <div style={{ marginTop: 10, color: COLORS.bone, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: 36, fontWeight: 900 }}>
            Medium
          </div>
        </div>
      </div>
      <div style={{ marginTop: 18, border: '1px solid rgba(245,240,232,0.1)', background: 'rgba(245,240,232,0.035)', padding: 18 }}>
        <div style={{ color: COLORS.brass, fontFamily: 'Alegreya Sans, Arial, sans-serif', fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>
          Why it matters
        </div>
        <div style={{ marginTop: 8, color: 'rgba(245,240,232,0.68)', fontFamily: 'Alegreya, Georgia, serif', fontSize: vertical ? 24 : 21, lineHeight: 1.26 }}>
          Better role stability. Cleaner matchup path. Less downside than the player you give up.
        </div>
      </div>
    </UiShell>
  );
}

function ExplainerEndCard({ variant }) {
  const vertical = variant === 'vertical';
  return (
    <>
      <Img
        src={staticFile('omen-horizontal-lockup-transparent.png')}
        style={{
          position: 'absolute',
          top: vertical ? 535 : 260,
          left: '50%',
          width: vertical ? 560 : 460,
          transform: 'translateX(-50%)',
        }}
      />
      <ExplainerCaption top={vertical ? 810 : 500} size={vertical ? 58 : 52} delay={742} maxWidth={vertical ? 920 : 1180}>
        {explainerCopy.edge}
      </ExplainerCaption>
      <div
        style={{
          position: 'absolute',
          top: vertical ? 1010 : 640,
          left: '50%',
          transform: 'translateX(-50%)',
          background: COLORS.brass,
          color: COLORS.raven,
          fontFamily: 'Alegreya Sans, Arial, sans-serif',
          fontSize: vertical ? 38 : 32,
          fontWeight: 900,
          padding: vertical ? '22px 44px' : '18px 38px',
        }}
      >
        {explainerCopy.cta}
      </div>
    </>
  );
}

function OmenExplainer({ variant = 'vertical' }) {
  const frame = useCurrentFrame();
  const vertical = variant === 'vertical';
  const phaseOne = fade(frame, 0, 24) * out(frame, 118, 140);
  const phaseTwo = fade(frame, 126, 154) * out(frame, 246, 270);
  const phaseThree = fade(frame, 254, 286) * out(frame, 640, 676);
  const phaseFour = fade(frame, 682, 730);

  return (
    <AbsoluteFill style={{ background: COLORS.raven, overflow: 'hidden' }}>
      <Audio src={staticFile('audio/omen-explainer-boom-bap.mp3')} volume={0.58} />
      <div
        style={{
          position: 'absolute',
          inset: '-12%',
          background:
            `radial-gradient(circle at 52% 18%, rgba(166,124,46,0.16), transparent 27%), ` +
            `radial-gradient(circle at 50% 62%, rgba(47,125,91,0.20), transparent 35%), ` +
            `linear-gradient(180deg, ${COLORS.raven}, #11100E 54%, ${COLORS.raven})`,
        }}
      />
      <div style={{ opacity: phaseOne }}>
        <ExplainerCaption top={vertical ? 315 : 120} size={vertical ? 78 : 72} delay={10}>
          {explainerCopy.hook}
        </ExplainerCaption>
        <DecisionProblemPanel variant={variant} />
      </div>
      <div style={{ opacity: phaseTwo }}>
        <ExplainerCaption top={vertical ? 300 : 116} size={vertical ? 58 : 52} delay={134}>
          {explainerCopy.context}
        </ExplainerCaption>
        <ContextPanel variant={variant} />
      </div>
      <div style={{ opacity: phaseThree }}>
        <ExplainerCaption top={vertical ? 260 : 92} size={vertical ? 58 : 52} delay={266}>
          {explainerCopy.result}
        </ExplainerCaption>
        <RecommendationExplainerPanel variant={variant} />
      </div>
      <div style={{ opacity: phaseFour }}>
        <ExplainerEndCard variant={variant} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: vertical ? 76 : 42,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(245,240,232,0.58)',
          fontFamily: 'Alegreya Sans, Arial, sans-serif',
          fontSize: vertical ? 26 : 22,
          opacity: 0.86,
        }}
      >
        Fantasy football decision intelligence
      </div>
    </AbsoluteFill>
  );
}

function AppScreenshot({ src, opacity, scale = 1, x = 0, y = 0 }) {
  return (
    <Img
      src={staticFile(src)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: 'center top',
      }}
    />
  );
}

function AppCallout({ children, variant, top, delay, align = 'center' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = variant === 'vertical';
  const enter = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 96 } });
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: align === 'left' ? (vertical ? 58 : 86) : '50%',
        maxWidth: vertical ? 860 : 980,
        transform: align === 'left'
          ? `translateY(${interpolate(enter, [0, 1], [22, 0])}px)`
          : `translate(-50%, ${interpolate(enter, [0, 1], [22, 0])}px)`,
        opacity: enter,
        color: COLORS.bone,
        fontFamily: 'Alegreya Sans, Arial, sans-serif',
        fontSize: vertical ? 48 : 42,
        fontWeight: 900,
        lineHeight: 1.02,
        letterSpacing: 0,
        textAlign: align,
        textShadow: '0 12px 34px rgba(0,0,0,0.9)',
        padding: vertical ? '20px 26px' : '16px 24px',
        background: 'linear-gradient(135deg, rgba(10,10,11,0.82), rgba(28,28,30,0.72))',
        border: '1px solid rgba(166,124,46,0.34)',
      }}
    >
      {children}
    </div>
  );
}

function AppExplainerEndCard({ variant }) {
  const vertical = variant === 'vertical';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vertical ? 54 : 36,
        background:
          `radial-gradient(circle at 50% 32%, rgba(166,124,46,0.18), transparent 28%), ` +
          `linear-gradient(180deg, rgba(10,10,11,0.78), ${COLORS.raven})`,
      }}
    >
      <Img
        src={staticFile('omen-horizontal-lockup-transparent.png')}
        style={{ width: vertical ? 560 : 470 }}
      />
      <div
        style={{
          maxWidth: vertical ? 820 : 950,
          color: COLORS.bone,
          fontFamily: 'Alegreya Sans, Arial, sans-serif',
          fontSize: vertical ? 68 : 60,
          fontWeight: 900,
          lineHeight: 1.02,
          textAlign: 'center',
        }}
      >
        See the move before your league does.
      </div>
      <div
        style={{
          color: COLORS.raven,
          background: COLORS.brass,
          fontFamily: 'Alegreya Sans, Arial, sans-serif',
          fontSize: vertical ? 38 : 32,
          fontWeight: 900,
          padding: vertical ? '22px 44px' : '18px 38px',
        }}
      >
        {appExplainerCopy[3]}
      </div>
    </div>
  );
}

function OmenAppExplainer({ variant = 'vertical' }) {
  const frame = useCurrentFrame();
  const vertical = variant === 'vertical';
  const top = vertical ? 'captures/app-promo-top.png' : 'captures/app-promo-horizontal-top.png';
  const middle = vertical ? 'captures/app-promo-middle.png' : 'captures/app-promo-horizontal-middle.png';
  const bottom = vertical ? 'captures/app-promo-bottom.png' : 'captures/app-promo-horizontal-middle.png';
  const first = fade(frame, 0, 26) * out(frame, 232, 270);
  const second = fade(frame, 218, 260) * out(frame, 470, 514);
  const third = fade(frame, 486, 526) * out(frame, 690, 730);
  const end = fade(frame, 724, 772);
  const drift = interpolate(frame, [0, 900], [0, vertical ? -34 : -18]);

  return (
    <AbsoluteFill style={{ background: COLORS.raven, overflow: 'hidden' }}>
      <Audio src={staticFile('audio/omen-explainer-boom-bap.mp3')} volume={0.62} />
      <AppScreenshot src={top} opacity={first} scale={vertical ? 1.01 : 1.02} y={drift} />
      <AppScreenshot src={middle} opacity={second} scale={vertical ? 1.02 : 1.02} y={vertical ? -18 : -10} />
      <AppScreenshot src={bottom} opacity={third} scale={vertical ? 1.02 : 1.02} y={vertical ? -26 : -10} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(10,10,11,0.18), transparent 20%, transparent 72%, rgba(10,10,11,0.84))',
          opacity: 1 - end,
        }}
      />

      <div style={{ opacity: first }}>
        <AppCallout variant={variant} top={vertical ? 1560 : 830} delay={24}>
          {appExplainerCopy[0]}
        </AppCallout>
      </div>
      <div style={{ opacity: second }}>
        <AppCallout variant={variant} top={vertical ? 1480 : 790} delay={238} align={vertical ? 'center' : 'left'}>
          {appExplainerCopy[1]}
        </AppCallout>
      </div>
      <div style={{ opacity: third }}>
        <AppCallout variant={variant} top={vertical ? 1460 : 790} delay={506} align={vertical ? 'center' : 'left'}>
          {appExplainerCopy[2]}
        </AppCallout>
      </div>
      <div style={{ opacity: end }}>
        <AppExplainerEndCard variant={variant} />
      </div>
    </AbsoluteFill>
  );
}

function MouseCursor({ x, y, opacity = 1, scale = 1 }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 0,
        height: 0,
        opacity,
        transform: `scale(${scale})`,
        filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.55))',
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '0 solid transparent',
          borderRight: '24px solid transparent',
          borderTop: '34px solid #F5F0E8',
          transform: 'rotate(-18deg)',
        }}
      />
    </div>
  );
}

function ReelCaption({ children, top, delay, size = 44 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 24, stiffness: 95 } });
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: '50%',
        width: '84%',
        transform: `translate(-50%, ${interpolate(enter, [0, 1], [18, 0])}px)`,
        opacity: enter,
        color: COLORS.bone,
        background: 'linear-gradient(135deg, rgba(10,10,11,0.84), rgba(28,28,30,0.72))',
        border: '1px solid rgba(166,124,46,0.34)',
        padding: '18px 22px',
        fontFamily: 'Alegreya Sans, Arial, sans-serif',
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.05,
        textAlign: 'center',
        letterSpacing: 0,
        textShadow: '0 10px 28px rgba(0,0,0,0.8)',
      }}
    >
      {children}
    </div>
  );
}

function FlowScreenshot({ src, opacity, scale = 1, x = 0, y = 0 }) {
  return (
    <Img
      src={staticFile(`captures/trade-flow/${src}`)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: 'center top',
      }}
    />
  );
}

function LaunchOpen() {
  const frame = useCurrentFrame();
  const iconPress = fade(frame, 6, 26);
  const openGlow = fade(frame, 22, 50);
  const cursorX = interpolate(frame, [0, 34], [740, 516], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cursorY = interpolate(frame, [0, 34], [1320, 882], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: COLORS.raven }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            `radial-gradient(circle at 50% 44%, rgba(166,124,46,${0.08 + openGlow * 0.16}), transparent 34%), ` +
            `linear-gradient(180deg, ${COLORS.raven}, #11100E 58%, ${COLORS.raven})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 740,
          left: '50%',
          width: 260,
          height: 260,
          transform: `translateX(-50%) scale(${1 - iconPress * 0.04})`,
          border: '1px solid rgba(166,124,46,0.42)',
          background: 'rgba(28,28,30,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 ${44 + openGlow * 52}px rgba(166,124,46,${0.2 + openGlow * 0.18})`,
        }}
      >
        <Img src={staticFile('omen-primary-emblem.png')} style={{ width: 170 }} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1042,
          left: '50%',
          transform: 'translateX(-50%)',
          color: COLORS.bone,
          fontFamily: 'Alegreya Sans, Arial, sans-serif',
          fontSize: 48,
          fontWeight: 900,
        }}
      >
        Omen
      </div>
      <MouseCursor x={cursorX} y={cursorY} opacity={fade(frame, 0, 12) * out(frame, 52, 64)} scale={1.15} />
    </AbsoluteFill>
  );
}

function OmenTradeFlowReel() {
  const frame = useCurrentFrame();
  const tradeOpen = fade(frame, 48, 76) * out(frame, 138, 162);
  const tradeSend = fade(frame, 132, 160) * out(frame, 232, 254);
  const tradeReceive = fade(frame, 224, 252) * out(frame, 324, 350);
  const tradeResult = fade(frame, 314, 348) * out(frame, 472, 506);
  const omenOne = fade(frame, 488, 522) * out(frame, 638, 670);
  const omenTwo = fade(frame, 640, 674) * out(frame, 762, 792);
  const end = fade(frame, 760, 806);

  return (
    <AbsoluteFill style={{ background: COLORS.raven, overflow: 'hidden' }}>
      <Audio src={staticFile('audio/omen-explainer-boom-bap.mp3')} volume={0.64} />
      <div style={{ opacity: out(frame, 54, 82) }}>
        <LaunchOpen />
      </div>

      <FlowScreenshot src="trade-open.png" opacity={tradeOpen} scale={1.06} y={-18} />
      <FlowScreenshot src="trade-send.png" opacity={tradeSend} scale={1.09} y={-78} />
      <FlowScreenshot src="trade-receive.png" opacity={tradeReceive} scale={1.09} y={-94} />
      <FlowScreenshot src="trade-result.png" opacity={tradeResult} scale={1.12} y={-256} />
      <FlowScreenshot src="omen-top.png" opacity={omenOne} scale={1.1} y={-210} />
      <FlowScreenshot src="omen-middle.png" opacity={omenTwo} scale={1.12} y={-120} />

      <div style={{ opacity: tradeOpen }}>
        <ReelCaption top={1492} delay={74}>Open the Trade Analyzer.</ReelCaption>
        <MouseCursor x={245} y={594} opacity={fade(frame, 82, 96) * out(frame, 118, 134)} scale={0.9} />
      </div>

      <div style={{ opacity: tradeSend }}>
        <ReelCaption top={1492} delay={158}>Pick a position and type the player you would send.</ReelCaption>
        <MouseCursor
          x={interpolate(frame, [154, 210], [268, 536], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          y={interpolate(frame, [154, 210], [604, 608], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          opacity={fade(frame, 154, 168) * out(frame, 218, 236)}
          scale={0.9}
        />
      </div>

      <div style={{ opacity: tradeReceive }}>
        <ReelCaption top={1492} delay={248}>Add the player coming back.</ReelCaption>
        <MouseCursor
          x={interpolate(frame, [252, 306], [273, 558], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          y={interpolate(frame, [252, 306], [804, 810], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          opacity={fade(frame, 248, 262) * out(frame, 312, 332)}
          scale={0.9}
        />
      </div>

      <div style={{ opacity: tradeResult }}>
        <ReelCaption top={1460} delay={354}>Get the verdict, value gap, and why it matters.</ReelCaption>
      </div>

      <div style={{ opacity: omenOne }}>
        <ReelCaption top={1496} delay={520}>Then Omen turns the close call into a recommendation.</ReelCaption>
      </div>

      <div style={{ opacity: omenTwo }}>
        <ReelCaption top={1496} delay={674}>Confidence, risk, and reasoning stay visible.</ReelCaption>
      </div>

      <div style={{ opacity: end }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 48,
            background:
              `radial-gradient(circle at 50% 35%, rgba(166,124,46,0.18), transparent 30%), ` +
              `linear-gradient(180deg, rgba(10,10,11,0.76), ${COLORS.raven})`,
          }}
        >
          <Img src={staticFile('omen-horizontal-lockup-transparent.png')} style={{ width: 560 }} />
          <div
            style={{
              width: '86%',
              color: COLORS.bone,
              fontFamily: 'Alegreya Sans, Arial, sans-serif',
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.02,
              textAlign: 'center',
            }}
          >
            See the move before your league does.
          </div>
          <div
            style={{
              color: COLORS.raven,
              background: COLORS.brass,
              fontFamily: 'Alegreya Sans, Arial, sans-serif',
              fontSize: 38,
              fontWeight: 900,
              padding: '22px 44px',
            }}
          >
            Join the waitlist
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const RemotionRoot = () => (
  <>
    <Composition
      id="OmenTradeFlowReel"
      component={OmenTradeFlowReel}
      durationInFrames={840}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="OmenComingSoonVertical"
      component={() => <Promo variant="vertical" />}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="OmenComingSoonHorizontal"
      component={() => <Promo variant="horizontal" />}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="OmenHypeVertical"
      component={() => <HypeReel variant="vertical" />}
      durationInFrames={360}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="OmenHypeHorizontal"
      component={() => <HypeReel variant="horizontal" />}
      durationInFrames={360}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="OmenExplainerVertical"
      component={() => <OmenExplainer variant="vertical" />}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="OmenExplainerHorizontal"
      component={() => <OmenExplainer variant="horizontal" />}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="OmenAppExplainerVertical"
      component={() => <OmenAppExplainer variant="vertical" />}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="OmenAppExplainerHorizontal"
      component={() => <OmenAppExplainer variant="horizontal" />}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);

registerRoot(RemotionRoot);
