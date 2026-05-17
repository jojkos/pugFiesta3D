import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import { DoubleSide } from 'three';
import {
  FIELD_HALF_X,
  FIELD_HALF_Z,
  GOAL_AREA_RADIUS,
  GOAL_DEPTH,
  GOAL_HEIGHT,
  GOAL_WIDTH,
  LINE_WIDTH,
  LINE_Y,
} from './config';

type DecorPoint = {
  x: number;
  z: number;
  scale: number;
};

export function Environment({
  decor,
  score,
  timeLeft,
}: {
  readonly decor: DecorPoint[];
  readonly score: number;
  readonly timeLeft: number;
}) {
  return (
    <group>
      <PitchGround />
      <PitchLines />
      <Goal side={-1} />
      <Goal side={1} />
      <Frisbee position={[-10.6, 0.025, 1.5]} rotation={0.4} />
      <Frisbee position={[1.6, 0.025, -7.4]} rotation={-0.9} />
      <Scoreboard3D score={score} timeLeft={timeLeft} />
      <PerimeterTrees />
      <FlowerScatter decor={decor} />
      <BushClusters />
      <Props />
    </group>
  );
}

function PitchGround() {
  return (
    <>
      {/* Far outer grass — extends well past the camera frustum on any aspect */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <planeGeometry args={[160, 120]} />
        <meshStandardMaterial color="#86b95b" roughness={1} />
      </mesh>
      {/* Pitch */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[FIELD_HALF_X * 2, FIELD_HALF_Z * 2]} />
        <meshStandardMaterial color="#9ed46f" roughness={1} />
      </mesh>
    </>
  );
}

function PitchLines() {
  const lineColor = '#fffaf0';
  const longLen = FIELD_HALF_X * 2;
  const shortLen = FIELD_HALF_Z * 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LINE_Y, FIELD_HALF_Z]}>
        <planeGeometry args={[longLen, LINE_WIDTH]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LINE_Y, -FIELD_HALF_Z]}>
        <planeGeometry args={[longLen, LINE_WIDTH]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        position={[FIELD_HALF_X, LINE_Y, 0]}
      >
        <planeGeometry args={[shortLen, LINE_WIDTH]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        position={[-FIELD_HALF_X, LINE_Y, 0]}
      >
        <planeGeometry args={[shortLen, LINE_WIDTH]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, LINE_Y, 0]}>
        <planeGeometry args={[shortLen, LINE_WIDTH]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LINE_Y, 0]}>
        <ringGeometry args={[1.6, 1.72, 48]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
        position={[-FIELD_HALF_X, LINE_Y, 0]}
      >
        <ringGeometry
          args={[
            GOAL_AREA_RADIUS - LINE_WIDTH / 2,
            GOAL_AREA_RADIUS + LINE_WIDTH / 2,
            48,
            1,
            0,
            Math.PI,
          ]}
        />
        <meshBasicMaterial color={lineColor} side={DoubleSide} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        position={[FIELD_HALF_X, LINE_Y, 0]}
      >
        <ringGeometry
          args={[
            GOAL_AREA_RADIUS - LINE_WIDTH / 2,
            GOAL_AREA_RADIUS + LINE_WIDTH / 2,
            48,
            1,
            0,
            Math.PI,
          ]}
        />
        <meshBasicMaterial color={lineColor} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function Goal({ side }: { readonly side: -1 | 1 }) {
  const postColor = '#fdfaf0';
  const netColor = '#f7f3e7';
  const x = side * FIELD_HALF_X;
  const backX = x + side * GOAL_DEPTH;
  const halfWidth = GOAL_WIDTH / 2;
  const postRadius = 0.13;
  return (
    <group>
      {/* Front uprights */}
      <mesh castShadow position={[x, GOAL_HEIGHT / 2, halfWidth]}>
        <cylinderGeometry args={[postRadius, postRadius, GOAL_HEIGHT, 12]} />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      <mesh castShadow position={[x, GOAL_HEIGHT / 2, -halfWidth]}>
        <cylinderGeometry args={[postRadius, postRadius, GOAL_HEIGHT, 12]} />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      {/* Crossbar */}
      <mesh
        castShadow
        position={[x, GOAL_HEIGHT + postRadius, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry
          args={[postRadius, postRadius, GOAL_WIDTH + postRadius * 2, 12]}
        />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      {/* Back uprights */}
      <mesh castShadow position={[backX, GOAL_HEIGHT / 2, halfWidth]}>
        <cylinderGeometry args={[postRadius * 0.85, postRadius * 0.85, GOAL_HEIGHT, 10]} />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      <mesh castShadow position={[backX, GOAL_HEIGHT / 2, -halfWidth]}>
        <cylinderGeometry args={[postRadius * 0.85, postRadius * 0.85, GOAL_HEIGHT, 10]} />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      {/* Top connectors (post → back-post) */}
      <mesh
        castShadow
        position={[(x + backX) / 2, GOAL_HEIGHT, halfWidth]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[postRadius * 0.7, postRadius * 0.7, GOAL_DEPTH, 8]} />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      <mesh
        castShadow
        position={[(x + backX) / 2, GOAL_HEIGHT, -halfWidth]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[postRadius * 0.7, postRadius * 0.7, GOAL_DEPTH, 8]} />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      {/* Bottom side rails (post → back-post, along the goal depth) */}
      <mesh
        position={[(x + backX) / 2, 0.06, halfWidth]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[postRadius * 0.7, postRadius * 0.7, GOAL_DEPTH, 8]} />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      <mesh
        position={[(x + backX) / 2, 0.06, -halfWidth]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[postRadius * 0.7, postRadius * 0.7, GOAL_DEPTH, 8]} />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      {/* Front bottom bar (post-to-post along goal width, at goal line) */}
      <mesh
        castShadow
        position={[x, 0.06, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry
          args={[postRadius * 0.85, postRadius * 0.85, GOAL_WIDTH, 10]}
        />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      {/* Back bottom bar */}
      <mesh
        castShadow
        position={[backX, 0.06, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry
          args={[postRadius * 0.7, postRadius * 0.7, GOAL_WIDTH, 10]}
        />
        <meshStandardMaterial color={postColor} roughness={0.55} />
      </mesh>
      {/* Back net (vertical, facing the field) */}
      <mesh position={[backX, GOAL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[GOAL_WIDTH, GOAL_HEIGHT]} />
        <meshStandardMaterial
          color={netColor}
          transparent
          opacity={0.55}
          side={DoubleSide}
          roughness={0.95}
        />
      </mesh>
      {/* Side nets */}
      <mesh
        position={[(x + backX) / 2, GOAL_HEIGHT / 2, halfWidth]}
        rotation={[0, 0, 0]}
      >
        <planeGeometry args={[GOAL_DEPTH, GOAL_HEIGHT]} />
        <meshStandardMaterial
          color={netColor}
          transparent
          opacity={0.5}
          side={DoubleSide}
          roughness={0.95}
        />
      </mesh>
      <mesh
        position={[(x + backX) / 2, GOAL_HEIGHT / 2, -halfWidth]}
        rotation={[0, 0, 0]}
      >
        <planeGeometry args={[GOAL_DEPTH, GOAL_HEIGHT]} />
        <meshStandardMaterial
          color={netColor}
          transparent
          opacity={0.5}
          side={DoubleSide}
          roughness={0.95}
        />
      </mesh>
      {/* Top net */}
      <mesh
        position={[(x + backX) / 2, GOAL_HEIGHT, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[GOAL_DEPTH, GOAL_WIDTH]} />
        <meshStandardMaterial
          color={netColor}
          transparent
          opacity={0.45}
          side={DoubleSide}
          roughness={0.95}
        />
      </mesh>
    </group>
  );
}

function Frisbee({
  position,
  rotation,
}: {
  readonly position: [number, number, number];
  readonly rotation: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.05, 24]} />
        <meshStandardMaterial color="#fdfaf0" roughness={0.55} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.027, 0]}>
        <ringGeometry args={[0.32, 0.4, 24]} />
        <meshStandardMaterial color="#e3d9b5" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Scoreboard3D({
  score,
  timeLeft,
}: {
  readonly score: number;
  readonly timeLeft: number;
}) {
  const seconds = Math.max(0, Math.ceil(timeLeft));
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const timeText = `${mm.toString().padStart(2, '0')}:${ss
    .toString()
    .padStart(2, '0')}`;
  const scoreText = score.toString().padStart(2, '0');
  const standColor = '#141414';
  const cardBg = '#fbfbf7';
  const digitColor = '#1a1a1a';
  const accentRed = '#d94a4a';
  const tilt = Math.PI / 7;
  const panelW = 4.0;
  const panelH = 1.05;
  return (
    <group position={[0, 0, -6.8]}>
      {/* Front face — leans back, top closer to -Z (away from camera) */}
      <group position={[0, 0.6, 0.3]} rotation={[-tilt, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[panelW, panelH, 0.08]} />
          <meshStandardMaterial color={standColor} roughness={0.85} />
        </mesh>
        {/* Score cluster (left, 2 cards) */}
        <FlipCard position={[-1.55, 0, 0.06]} digit={scoreText[0]} bg={cardBg} fg={digitColor} />
        <FlipCard position={[-1.05, 0, 0.06]} digit={scoreText[1]} bg={cardBg} fg={accentRed} />
        {/* Time cluster (right, 4 cards MM:SS) */}
        <FlipCard position={[0.05, 0, 0.06]} digit={timeText[0]} bg={cardBg} fg={digitColor} />
        <FlipCard position={[0.55, 0, 0.06]} digit={timeText[1]} bg={cardBg} fg={digitColor} />
        <Text
          position={[0.85, 0, 0.07]}
          fontSize={0.36}
          color={cardBg}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          :
        </Text>
        <FlipCard position={[1.15, 0, 0.06]} digit={timeText[3]} bg={cardBg} fg={digitColor} />
        <FlipCard position={[1.65, 0, 0.06]} digit={timeText[4]} bg={cardBg} fg={digitColor} />
      </group>
      {/* Back face — leans forward, mirrors the front so the two meet at apex */}
      <group position={[0, 0.6, -0.3]} rotation={[tilt, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[panelW, panelH, 0.08]} />
          <meshStandardMaterial color={standColor} roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

function FlipCard({
  position,
  digit,
  bg,
  fg,
}: {
  readonly position: [number, number, number];
  readonly digit: string;
  readonly bg: string;
  readonly fg: string;
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.7, 0.04]} />
        <meshStandardMaterial color={bg} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[0.4, 0.012]} />
        <meshBasicMaterial color="#cfcabd" />
      </mesh>
      <mesh position={[-0.1, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.04, 0.011, 8, 16]} />
        <meshStandardMaterial color="#c8c4b5" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.1, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.04, 0.011, 8, 16]} />
        <meshStandardMaterial color="#c8c4b5" metalness={0.6} roughness={0.4} />
      </mesh>
      <Text
        position={[0, 0, 0.028]}
        fontSize={0.5}
        color={fg}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {digit}
      </Text>
    </group>
  );
}

function PerimeterTrees() {
  const trees = useMemo(() => {
    const positions: Array<{ x: number; z: number; scale: number }> = [];
    const longHalf = FIELD_HALF_X + 3;
    const shortHalf = FIELD_HALF_Z + 3;
    // Bottom edge (near camera, +Z): skip middle tree, scale others smaller
    for (let i = 0; i < 5; i += 1) {
      if (i === 2) continue;
      const t = (i + 0.5) / 5;
      const jx = ((i * 73) % 11) * 0.06 - 0.3;
      const jz = ((i * 41) % 9) * 0.06 - 0.25;
      positions.push({
        x: -longHalf + t * longHalf * 2 + jx,
        z: shortHalf + jz,
        scale: 0.62,
      });
    }
    // Top edge (far from camera, -Z): skip trees that would block the scoreboard (|x| < 2.6)
    for (let i = 0; i < 5; i += 1) {
      const t = (i + 0.5) / 5;
      const jx = ((i * 73) % 11) * 0.06 - 0.3;
      const jz = ((i * 41) % 9) * 0.06 - 0.25;
      const x = -longHalf + t * longHalf * 2 + jz;
      if (Math.abs(x) < 2.6) continue;
      positions.push({ x, z: -shortHalf - jx, scale: 1 });
    }
    // Short edges (left/right)
    for (let i = 0; i < 3; i += 1) {
      const t = (i + 0.5) / 3;
      const jz = ((i * 53) % 7) * 0.06 - 0.2;
      positions.push({ x: longHalf + jz, z: -shortHalf + t * shortHalf * 2, scale: 1 });
      positions.push({ x: -longHalf - jz, z: -shortHalf + t * shortHalf * 2, scale: 1 });
    }
    return positions.map((pos, index) => ({
      x: pos.x,
      z: pos.z,
      scale: pos.scale * (0.9 + ((index * 17) % 7) * 0.05),
      variant: index % 3,
      rotation: ((index * 23) % 360) * (Math.PI / 180),
    }));
  }, []);

  return (
    <group>
      {trees.map((tree, index) => (
        <group
          key={index}
          position={[tree.x, 0, tree.z]}
          scale={tree.scale}
          rotation={[0, tree.rotation, 0]}
        >
          <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.22, 0.32, 1.7, 8]} />
            <meshStandardMaterial color="#8a5a3a" roughness={0.96} />
          </mesh>
          {tree.variant === 0 && (
            <>
              <mesh castShadow position={[0, 2.05, 0]}>
                <coneGeometry args={[1.05, 1.85, 8]} />
                <meshStandardMaterial color="#5fa247" roughness={0.95} />
              </mesh>
              <mesh castShadow position={[0, 2.95, 0]}>
                <coneGeometry args={[0.8, 1.45, 8]} />
                <meshStandardMaterial color="#4f9438" roughness={0.95} />
              </mesh>
              <mesh castShadow position={[0, 3.7, 0]}>
                <coneGeometry args={[0.55, 1, 8]} />
                <meshStandardMaterial color="#427e2c" roughness={0.95} />
              </mesh>
            </>
          )}
          {tree.variant === 1 && (
            <mesh castShadow position={[0, 2.4, 0]}>
              <sphereGeometry args={[1.18, 12, 12]} />
              <meshStandardMaterial color="#6cb854" roughness={0.95} />
            </mesh>
          )}
          {tree.variant === 2 && (
            <>
              <mesh castShadow position={[0, 2.1, 0]}>
                <sphereGeometry args={[0.95, 12, 12]} />
                <meshStandardMaterial color="#76c662" roughness={0.95} />
              </mesh>
              <mesh castShadow position={[0.55, 2.45, -0.1]}>
                <sphereGeometry args={[0.6, 10, 10]} />
                <meshStandardMaterial color="#6fbb5b" roughness={0.95} />
              </mesh>
              <mesh castShadow position={[-0.5, 2.35, 0.18]}>
                <sphereGeometry args={[0.55, 10, 10]} />
                <meshStandardMaterial color="#82cf6d" roughness={0.95} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

function FlowerScatter({ decor }: { readonly decor: DecorPoint[] }) {
  return (
    <group>
      {decor.map((item, index) => {
        const palettes = ['#ffd15c', '#ff86a7', '#7ed8ff', '#ffa2c6', '#c08bff'];
        const color = palettes[index % palettes.length];
        return (
          <group key={index} position={[item.x, 0.05, item.z]} scale={item.scale}>
            <mesh castShadow position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.04, 0.06, 0.28, 6]} />
              <meshStandardMaterial color="#4f8f3b" roughness={0.95} />
            </mesh>
            <mesh castShadow position={[0, 0.32, 0]}>
              <sphereGeometry args={[0.16, 8, 8]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
            <mesh castShadow position={[0, 0.32, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#fff7b6" roughness={0.85} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function BushClusters() {
  const bushes = [
    [-12.6, -7.8, 1.05, '#7cb96a'],
    [-13.4, 3.2, 0.95, '#72b461'],
    [12.8, -3.6, 1.1, '#84bf72'],
    [13.2, 5.8, 0.96, '#70ac60'],
    [-4.8, -8.6, 1.15, '#79bb68'],
    [4.5, 8.4, 1.05, '#84bf72'],
    [-7.6, 8.2, 0.92, '#7ec369'],
    [7.0, -8.4, 1.0, '#74b35e'],
  ] as const;

  return (
    <group>
      {bushes.map(([x, z, scale, color], index) => (
        <group key={index} position={[x, 0.08, z]} scale={scale}>
          <mesh castShadow>
            <sphereGeometry args={[0.55, 12, 12]} />
            <meshStandardMaterial color={color} roughness={0.96} />
          </mesh>
          <mesh castShadow position={[0.42, 0.04, 0.08]} scale={0.78}>
            <sphereGeometry args={[0.46, 10, 10]} />
            <meshStandardMaterial color={color} roughness={0.96} />
          </mesh>
          <mesh castShadow position={[-0.38, 0.02, -0.04]} scale={0.72}>
            <sphereGeometry args={[0.44, 10, 10]} />
            <meshStandardMaterial color={color} roughness={0.96} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Props() {
  return (
    <group>
      <Bone position={[8.4, 0.18, 7.6]} rotation={0.6} />
      <Bone position={[-9.0, 0.18, -7.4]} rotation={-1.1} />
      <Bone position={[3.6, 0.18, 8.2]} rotation={0.2} />
      <BallProp position={[-6.6, 0.22, 8.0]} color="#ff6f73" />
      <BallProp position={[8.8, 0.22, -7.4]} color="#5fc8d4" />
      <Frisbee position={[-12.4, 0.025, 0.6]} rotation={0.8} />
      <Frisbee position={[12.4, 0.025, -0.4]} rotation={-0.4} />
    </group>
  );
}

function Bone({
  position,
  rotation,
}: {
  readonly position: [number, number, number];
  readonly rotation: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.7, 8]} />
        <meshStandardMaterial color="#fff5dc" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color="#fff5dc" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.13, 0.38, 0]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color="#fff5dc" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, -0.38, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color="#fff5dc" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.13, -0.38, 0]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color="#fff5dc" roughness={0.85} />
      </mesh>
    </group>
  );
}

function BallProp({
  position,
  color,
}: {
  readonly position: [number, number, number];
  readonly color: string;
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh castShadow scale={[1.01, 0.05, 1.01]}>
        <sphereGeometry args={[0.22, 16, 4]} />
        <meshStandardMaterial color="#fff8f0" roughness={0.7} />
      </mesh>
    </group>
  );
}

