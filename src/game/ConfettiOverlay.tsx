import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import type { RefObject } from 'react';
import type { Group } from 'three';
import { CAMERA_POSITION } from './config';
import {
  CONFETTI_COLORS,
  CONFETTI_COUNT,
  type CameraMirror,
  type ConfettiParticle,
} from './confetti';

// Renders the confetti meshes into a SEPARATE transparent canvas that sits
// above the speech bubble overlay in z-order. The main scene's useFrame
// updates the meshes' transforms (via shared refs) and the camera mirror —
// here we just read them and copy onto this canvas's camera each frame.
function ConfettiScene({
  particlesRef,
  groupsRef,
  cameraMirrorRef,
}: {
  readonly particlesRef: RefObject<ConfettiParticle[]>;
  readonly groupsRef: RefObject<Array<Group | null>>;
  readonly cameraMirrorRef: RefObject<CameraMirror>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const mirror = cameraMirrorRef.current;
    if (!mirror) return;
    camera.position.set(mirror.posX, mirror.posY, mirror.posZ);
    camera.lookAt(mirror.focusX, 0, mirror.focusZ);
    if ('zoom' in camera && typeof camera.zoom === 'number') {
      if (Math.abs(camera.zoom - mirror.zoom) > 0.001) {
        camera.zoom = mirror.zoom;
        camera.updateProjectionMatrix();
      }
    }

    // Visibility is driven entirely by the main canvas's physics tick
    // updating each group's .visible / .position / .rotation / .scale.
    // Nothing to do per frame here besides camera mirroring — the meshes
    // belong to this canvas's scene graph but their transforms are
    // mutated from the other canvas via the shared groupsRef.
    void particlesRef;
    void groupsRef;
  });

  return (
    <>
      <hemisphereLight args={['#ffe9c8', '#7fa860', 0.7]} />
      <ambientLight intensity={0.85} />
      <directionalLight intensity={1.0} position={[10, 16, 8]} />
      {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
        <group
          key={`confetti-${index}`}
          ref={(node) => {
            groupsRef.current[index] = node;
          }}
          visible={false}
        >
          <mesh>
            <boxGeometry args={[0.16, 0.025, 0.22]} />
            <meshStandardMaterial
              color={CONFETTI_COLORS[index % CONFETTI_COLORS.length]}
              roughness={0.55}
              metalness={0.05}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function ConfettiOverlay({
  particlesRef,
  groupsRef,
  cameraMirrorRef,
  baseZoom,
}: {
  readonly particlesRef: RefObject<ConfettiParticle[]>;
  readonly groupsRef: RefObject<Array<Group | null>>;
  readonly cameraMirrorRef: RefObject<CameraMirror>;
  readonly baseZoom: number;
}) {
  return (
    <Canvas
      className="confetti-canvas"
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <OrthographicCamera
        makeDefault
        position={CAMERA_POSITION.toArray()}
        zoom={baseZoom}
      />
      <ConfettiScene
        particlesRef={particlesRef}
        groupsRef={groupsRef}
        cameraMirrorRef={cameraMirrorRef}
      />
    </Canvas>
  );
}
