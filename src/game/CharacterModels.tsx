import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AnimationAction,
  AnimationClip,
  Group,
  LoopOnce,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type CharacterAction = 'idle' | 'run' | 'dash' | 'latch' | 'react';

type ActionRef = { current: CharacterAction };

type CharacterPalette = {
  bodyColor: string;
  headColor: string;
  accentColor: string;
  accessoryColor?: string;
};

type PugModelProps = ThreeElements['group'] & {
  palette: CharacterPalette;
  isPlayer?: boolean;
  actionRef?: ActionRef;
  npcIndex?: number;
  npcActions?: { current: CharacterAction[] };
  modelUrl?: string;
  bodyScale?: number;
};

const DEFAULT_MODEL_URL = '/assets/models/pug-quaternius.glb';
const DEFAULT_BODY_SCALE = 0.34;

type ActionMap = Partial<Record<CharacterAction, AnimationAction>>;

const PRIMARY_CLIP_PRIORITY: Record<CharacterAction, string[]> = {
  idle: ['Armature|Idle', 'Idle'],
  run: ['Armature|Run', 'Armature|Walk', 'Run', 'Walk'],
  dash: ['Armature|Jump', 'Armature|Run', 'Jump', 'Run'],
  latch: ['Armature|Bite', 'Armature|Attack', 'Armature|Idle', 'Idle'],
  react: ['Armature|HitReact', 'Armature|Idle', 'Idle'],
};

function pickClip(
  animations: AnimationClip[],
  preferences: string[],
): AnimationClip | undefined {
  for (const name of preferences) {
    const direct = animations.find((clip) => clip.name === name);
    if (direct) {
      return direct;
    }
  }

  const lowerNames = animations.map((clip) => clip.name.toLowerCase());
  for (const name of preferences) {
    const lower = name.toLowerCase();
    const index = lowerNames.findIndex((entry) => entry.includes(lower));
    if (index >= 0) {
      return animations[index];
    }
  }

  return animations[0];
}

export function PugCharacter({
  palette,
  isPlayer = false,
  actionRef,
  npcIndex,
  npcActions,
  modelUrl = DEFAULT_MODEL_URL,
  bodyScale = DEFAULT_BODY_SCALE,
  ...props
}: Readonly<PugModelProps>) {
  const host = useRef<Group>(null);
  const root = useRef<Group>(null);
  const { scene, animations } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => {
    const nextScene = clone(scene);

    let totalMaterials = 0;
    nextScene.traverse((object) => {
      if (
        object instanceof Mesh &&
        object.material instanceof MeshStandardMaterial
      ) {
        totalMaterials += 1;
      }
    });

    nextScene.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      const material = object.material;
      if (!(material instanceof MeshStandardMaterial)) {
        return;
      }

      const nextMaterial = material.clone();
      const materialName = nextMaterial.name.toLowerCase();

      if (materialName.includes('beige')) {
        nextMaterial.color.set(palette.bodyColor);
      } else if (materialName.includes('brown')) {
        nextMaterial.color.set(palette.headColor);
      } else if (totalMaterials === 1) {
        nextMaterial.color.set(palette.bodyColor);
      }

      nextMaterial.roughness = 0.95;
      nextMaterial.metalness = 0;
      object.material = nextMaterial;
      object.castShadow = true;
      object.receiveShadow = true;
    });

    return nextScene;
  }, [palette.bodyColor, palette.headColor, scene]);

  const { mixer } = useAnimations(animations, root);
  const accessoryColor = palette.accessoryColor ?? palette.accentColor;
  const actions = useRef<ActionMap>({});
  const currentAction = useRef<CharacterAction>('idle');
  const proceduralPhase = useRef(((npcIndex ?? 0) * 1.37) % (Math.PI * 2));

  useEffect(() => {
    if (!root.current) {
      return;
    }

    const map: ActionMap = {};
    const seen = new Map<string, AnimationAction>();

    (['idle', 'run', 'dash', 'latch', 'react'] as CharacterAction[]).forEach(
      (action) => {
        const clip = pickClip(animations, PRIMARY_CLIP_PRIORITY[action]);
        if (!clip) {
          return;
        }

        const cached = seen.get(clip.name);
        if (cached) {
          map[action] = cached;
          return;
        }

        const animationAction = mixer.clipAction(clip, root.current ?? undefined);
        seen.set(clip.name, animationAction);
        map[action] = animationAction;
      },
    );

    actions.current = map;
    if (map.dash) {
      map.dash.setLoop(LoopOnce, 1);
      map.dash.clampWhenFinished = true;
    }
    const idle = map.idle;
    if (idle) {
      idle.reset().fadeIn(0.2).play();
    }

    return () => {
      Object.values(map).forEach((action) => {
        action?.stop();
      });
      actions.current = {};
    };
  }, [animations, mixer]);

  useFrame((_, delta) => {
    const map = actions.current;
    const desired = npcActions
      ? npcActions.current[npcIndex ?? 0] ?? 'idle'
      : actionRef?.current ?? 'idle';

    if (map.idle && desired !== currentAction.current) {
      const previous = map[currentAction.current];
      const next = map[desired];

      if (previous && previous !== next) {
        previous.fadeOut(0.12);
      }
      if (next) {
        if (next === previous) {
          next.reset();
        } else {
          next.reset().fadeIn(0.12).play();
        }
      }
      currentAction.current = desired;
    }

    const action = map[desired];
    if (action) {
      const timeScales: Record<CharacterAction, number> = {
        idle: 1,
        run: 1.5,
        dash: 1.3,
        latch: 1.6,
        react: 1.2,
      };
      action.timeScale = timeScales[desired];
    }

    proceduralPhase.current += delta * (desired === 'run' ? 16 : desired === 'dash' ? 22 : 6);
    const rootNode = root.current;
    if (rootNode) {
      const baseScale = bodyScale;
      let yOffset = 0;
      let scaleX = 1;
      let scaleY = 1;
      let scaleZ = 1;
      let tiltX = 0;

      if (desired === 'run') {
        yOffset = Math.abs(Math.sin(proceduralPhase.current)) * 0.06;
        scaleY = 1 + Math.sin(proceduralPhase.current * 2) * 0.04;
        tiltX = -0.08;
      } else if (desired === 'dash') {
        scaleX = 0.86;
        scaleZ = 1.22;
        tiltX = -0.32;
        yOffset = 0.05;
      } else if (desired === 'latch') {
        const wobble = Math.sin(proceduralPhase.current * 3) * 0.08;
        scaleX = 1 + wobble;
        scaleY = 1 - wobble;
      } else if (desired === 'react') {
        scaleY = 1 + Math.sin(proceduralPhase.current * 4) * 0.1;
      }

      rootNode.position.y = yOffset;
      rootNode.scale.set(baseScale * scaleX, baseScale * scaleY, baseScale * scaleZ);
      rootNode.rotation.x = tiltX;
    }
  });

  return (
    <group ref={host} {...props}>
      <group position={[0, 0, 0]}>
        <group ref={root} scale={bodyScale}>
          <primitive object={clonedScene} />
        </group>

        {isPlayer ? null : (
          <group position={[0.04, 1.04, 0.02]}>
            <mesh castShadow rotation={[0.2, 0.1, 0]}>
              <sphereGeometry args={[0.08, 10, 10]} />
              <meshStandardMaterial color={accessoryColor} roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0.1, 0.06, 0]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshStandardMaterial color="#ffd971" roughness={0.9} />
            </mesh>
            <mesh castShadow position={[-0.06, 0.05, 0.04]}>
              <sphereGeometry args={[0.05, 10, 10]} />
              <meshStandardMaterial color="#fff2f5" roughness={0.9} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

useGLTF.preload('/assets/models/pug-quaternius.glb');
useGLTF.preload('/assets/models/pugSmall.glb');
