import { useMemo } from 'react';

type DecorPoint = {
  x: number;
  z: number;
  scale: number;
};

export function Environment({ decor }: { readonly decor: DecorPoint[] }) {
  return (
    <group>
      <Ground />
      <ArenaRing />
      <BorderTrees />
      <PerimeterFence />
      <FlowerScatter decor={decor} />
      <BushClusters />
      <Props />
      <PartySigns />
    </group>
  );
}

function Ground() {
  return (
    <>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.05, 0]}>
        <circleGeometry args={[18, 60]} />
        <meshStandardMaterial color="#b9c98a" roughness={1} />
      </mesh>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <circleGeometry args={[14.4, 56]} />
        <meshStandardMaterial color="#a3c378" roughness={1} />
      </mesh>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <circleGeometry args={[10.5, 52]} />
        <meshStandardMaterial color="#9ed46f" roughness={1} />
      </mesh>
    </>
  );
}

function ArenaRing() {
  const stripes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        angle: (index / 18) * Math.PI * 2,
        color: index % 2 === 0 ? '#fff5d6' : '#ffd99c',
      })),
    [],
  );

  return (
    <group>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
        <ringGeometry args={[8.55, 8.95, 64]} />
        <meshStandardMaterial color="#fffbe8" roughness={0.85} />
      </mesh>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
        <ringGeometry args={[8.95, 9.25, 64]} />
        <meshStandardMaterial color="#ffb86b" roughness={0.85} />
      </mesh>
      {stripes.map((stripe, index) => (
        <mesh
          key={index}
          receiveShadow
          rotation={[-Math.PI / 2, 0, stripe.angle]}
          position={[
            Math.cos(stripe.angle) * 9.4,
            0.006,
            Math.sin(stripe.angle) * 9.4,
          ]}
        >
          <planeGeometry args={[0.55, 0.34]} />
          <meshStandardMaterial color={stripe.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function BorderTrees() {
  const trees = useMemo(() => {
    const slots = 14;
    return Array.from({ length: slots }, (_, index) => {
      const angle = (index / slots) * Math.PI * 2 + (index % 2 === 0 ? 0 : 0.18);
      const radius = 12.4 + (index % 3) * 0.55;
      const variant = index % 3;
      const scale = 0.92 + ((index * 17) % 7) * 0.05;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale,
        variant,
        rotation: ((index * 23) % 360) * (Math.PI / 180),
      };
    });
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

function PerimeterFence() {
  const fencePosts = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const angle = (index / 28) * Math.PI * 2;
        const radius = 10.2;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          rotation: -angle + Math.PI / 2,
        };
      }),
    [],
  );

  return (
    <group>
      {fencePosts.map((post, index) => (
        <group
          key={index}
          position={[post.x, 0, post.z]}
          rotation={[0, post.rotation, 0]}
        >
          <mesh castShadow position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.64, 6]} />
            <meshStandardMaterial color="#f1e3c8" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 0.7, 0]}>
            <coneGeometry args={[0.1, 0.15, 6]} />
            <meshStandardMaterial color="#e6cea0" roughness={0.9} />
          </mesh>
          {index % 2 === 0 && (
            <>
              <mesh castShadow position={[0, 0.45, 0]}>
                <boxGeometry args={[1.18, 0.06, 0.05]} />
                <meshStandardMaterial color="#fff1d8" roughness={0.9} />
              </mesh>
              <mesh castShadow position={[0, 0.22, 0]}>
                <boxGeometry args={[1.18, 0.06, 0.05]} />
                <meshStandardMaterial color="#fff1d8" roughness={0.9} />
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
    [-7.1, -6.4, 1.05, '#7cb96a'],
    [-8.6, 1.8, 0.95, '#72b461'],
    [8.4, -1.6, 1.1, '#84bf72'],
    [7.8, 6.2, 0.96, '#70ac60'],
    [-1.4, -8.5, 1.15, '#79bb68'],
    [1.6, 8.4, 1.05, '#84bf72'],
    [-5.6, 7.7, 0.92, '#7ec369'],
    [6.0, -7.8, 1.0, '#74b35e'],
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
      <Bone position={[6.4, 0.18, 5.6]} rotation={0.6} />
      <Bone position={[-6.6, 0.18, -5.4]} rotation={-1.1} />
      <Bone position={[3.6, 0.18, -7.4]} rotation={0.2} />
      <BallProp position={[-4.8, 0.22, 6.6]} color="#ff6f73" />
      <BallProp position={[5.8, 0.22, -6.4]} color="#5fc8d4" />
      <FoodBowl position={[-7.4, 0.04, 3.2]} />
      <FoodBowl position={[7.2, 0.04, -3.4]} />
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

function FoodBowl({
  position,
}: {
  readonly position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.36, 0.18, 16]} />
        <meshStandardMaterial color="#ff8a64" roughness={0.7} />
      </mesh>
      <mesh receiveShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 16]} />
        <meshStandardMaterial color="#caa57d" roughness={0.95} />
      </mesh>
    </group>
  );
}

function PartySigns() {
  return (
    <group>
      <group position={[0, 0, -8.4]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.9, 6]} />
          <meshStandardMaterial color="#a07050" roughness={0.95} />
        </mesh>
        <mesh castShadow position={[0, 0.95, 0]}>
          <boxGeometry args={[1.6, 0.5, 0.08]} />
          <meshStandardMaterial color="#fff3d6" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.95, 0.045]}>
          <planeGeometry args={[1.4, 0.32]} />
          <meshStandardMaterial color="#ff7a8a" roughness={0.85} />
        </mesh>
      </group>

      <group position={[-8.4, 0, 6.5]} rotation={[0, 0.5, 0]}>
        <mesh castShadow position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
          <meshStandardMaterial color="#a07050" roughness={0.95} />
        </mesh>
        <mesh castShadow position={[0, 0.8, 0]}>
          <boxGeometry args={[0.7, 0.4, 0.06]} />
          <meshStandardMaterial color="#ffe0a8" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}
