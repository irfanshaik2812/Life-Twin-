import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AvatarPreferences, BodyRegion } from '../../types/lifetwin';

export type CameraPreset = 'front' | 'side' | 'back' | 'reset';

interface DigitalTwinCanvasProps {
  heightCm?: number;
  weightKg?: number;
  avatar?: Partial<AvatarPreferences> | null;
  heartRateBpm?: number | null;
  spo2Pct?: number | null;
  sleepHours?: number | null;
  steps?: number | null;
  moodScore?: number | null;
  energyScore?: number | null;
  selectedRegion?: BodyRegion;
  onSelectRegion?: (region: BodyRegion) => void;
  cameraPreset?: CameraPreset;
  zoomCommand?: { type: 'in' | 'out'; seq: number } | null;
  compact?: boolean;
  hasMissingData?: boolean;
}

const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _mouse = new THREE.Vector2();

const ACCENT_HEX: Record<string, number> = {
  cyan: 0x22d3ee,
  cobalt: 0x3b82f6,
  ice: 0x7dd3fc,
  teal: 0x2dd4bf,
};

function createLimbLathe(radii: Array<[number, number]>, segs = 24): THREE.LatheGeometry {
  const pts = radii.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, segs);
  geo.computeVertexNormals();
  return geo;
}

export const DigitalTwinCanvas: React.FC<DigitalTwinCanvasProps> = ({
  heightCm = 174,
  weightKg = 70,
  avatar,
  heartRateBpm = 72,
  spo2Pct = 98,
  sleepHours = 7.5,
  steps = 7800,
  moodScore = 7.5,
  energyScore = 7.6,
  selectedRegion = 'whole',
  onSelectRegion,
  cameraPreset = 'reset',
  zoomCommand = null,
  compact = false,
  hasMissingData = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglLost, setWebglLost] = useState(false);

  // Refs synced into the animation loop without tearing down WebGL context
  const stateRef = useRef({
    heartRateBpm: heartRateBpm ?? 70,
    spo2Pct: spo2Pct ?? 98,
    sleepHours: sleepHours ?? 7.5,
    steps: steps ?? 7000,
    moodScore: moodScore ?? 7,
    energyScore: energyScore ?? 7,
    selectedRegion,
    hasMissingData,
    heightScale: Math.max(0.86, Math.min(1.16, heightCm / 174)),
    widthScale: Math.max(
      0.84,
      Math.min(
        1.24,
        (weightKg / 70) * 0.45 +
          (avatar?.bodyBuild === 'lean'
            ? 0.48
            : avatar?.bodyBuild === 'athletic'
            ? 0.57
            : avatar?.bodyBuild === 'broad'
            ? 0.66
            : 0.55)
      )
    ),
    accentHex: ACCENT_HEX[avatar?.accentColor || 'cyan'] ?? 0x22d3ee,
    hairStyle: avatar?.hairStyle || 'short',
    onSelectRegion,
  });

  stateRef.current = {
    heartRateBpm: heartRateBpm ?? 70,
    spo2Pct: spo2Pct ?? 98,
    sleepHours: sleepHours ?? 7.5,
    steps: steps ?? 7000,
    moodScore: moodScore ?? 7,
    energyScore: energyScore ?? 7,
    selectedRegion,
    hasMissingData,
    heightScale: Math.max(0.86, Math.min(1.16, heightCm / 174)),
    widthScale: Math.max(
      0.84,
      Math.min(
        1.24,
        (weightKg / 70) * 0.45 +
          (avatar?.bodyBuild === 'lean'
            ? 0.48
            : avatar?.bodyBuild === 'athletic'
            ? 0.57
            : avatar?.bodyBuild === 'broad'
            ? 0.66
            : 0.55)
      )
    ),
    accentHex: ACCENT_HEX[avatar?.accentColor || 'cyan'] ?? 0x22d3ee,
    hairStyle: avatar?.hairStyle || 'short',
    onSelectRegion,
  };

  const cameraGoalRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    lookAt: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(0, 1.35, compact ? 3.5 : 3.9),
    lookAt: new THREE.Vector3(0, 1.05, 0),
  });

  // React to cameraPreset changes smoothly
  useEffect(() => {
    const dist = compact ? 3.35 : 3.85;
    if (cameraPreset === 'front' || cameraPreset === 'reset') {
      cameraGoalRef.current = {
        active: true,
        pos: new THREE.Vector3(0, 1.32, dist),
        lookAt: new THREE.Vector3(0, 1.04, 0),
      };
    } else if (cameraPreset === 'side') {
      cameraGoalRef.current = {
        active: true,
        pos: new THREE.Vector3(dist, 1.32, 0.2),
        lookAt: new THREE.Vector3(0, 1.04, 0),
      };
    } else if (cameraPreset === 'back') {
      cameraGoalRef.current = {
        active: true,
        pos: new THREE.Vector3(0, 1.32, -dist),
        lookAt: new THREE.Vector3(0, 1.04, 0),
      };
    }
  }, [cameraPreset, compact]);

  // React to region focus
  useEffect(() => {
    if (selectedRegion === 'head') {
      cameraGoalRef.current = {
        active: true,
        pos: new THREE.Vector3(0.45, 1.78, 1.65),
        lookAt: new THREE.Vector3(0, 1.68, 0),
      };
    } else if (selectedRegion === 'chest') {
      cameraGoalRef.current = {
        active: true,
        pos: new THREE.Vector3(0.35, 1.38, 1.95),
        lookAt: new THREE.Vector3(0, 1.32, 0),
      };
    } else if (selectedRegion === 'torso') {
      cameraGoalRef.current = {
        active: true,
        pos: new THREE.Vector3(-0.35, 1.15, 2.2),
        lookAt: new THREE.Vector3(0, 1.08, 0),
      };
    } else if (selectedRegion === 'limbs') {
      cameraGoalRef.current = {
        active: true,
        pos: new THREE.Vector3(0.8, 0.95, 3.2),
        lookAt: new THREE.Vector3(0, 0.88, 0),
      };
    }
  }, [selectedRegion]);

  // Zoom +/- commands
  const zoomActionRef = useRef<'in' | 'out' | null>(null);
  useEffect(() => {
    if (zoomCommand) {
      zoomActionRef.current = zoomCommand.type;
    }
  }, [zoomCommand]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061021);
    scene.fog = new THREE.FogExp2(0x061021, 0.065);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 40);
    camera.position.set(0, 1.32, compact ? 3.35 : 3.85);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // Mandatory studio environment map
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3-Point Studio Lighting + Warm/Cool Contrast
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
    keyLight.position.set(3.2, 4.8, 3.6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.9);
    rimLight.position.set(-3.2, 2.8, -3.5);
    scene.add(rimLight);

    const chestPointLight = new THREE.PointLight(0x22d3ee, 1.4, 2.5, 2);
    chestPointLight.position.set(0, 1.32, 0.35);
    scene.add(chestPointLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.04, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 1.4;
    controls.maxDistance = 6.2;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.addEventListener('start', () => {
      cameraGoalRef.current.active = false;
    });

    // Grounded holographic calibration base
    const baseGroup = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 0.98, 64),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.004;
    baseGroup.add(outerRing);

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.565, 64),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.006;
    baseGroup.add(innerRing);

    const pedestalDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0b1a33,
        roughness: 0.4,
        metalness: 0.6,
        transparent: true,
        opacity: 0.72,
      })
    );
    pedestalDisc.rotation.x = -Math.PI / 2;
    pedestalDisc.receiveShadow = !isSoftwareGl;
    baseGroup.add(pedestalDisc);

    // Subtle grid lines around pedestal
    const gridHelper = new THREE.GridHelper(10, 24, 0x0ea5e9, 0x0f2744);
    gridHelper.position.y = -0.005;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.22;
    scene.add(gridHelper);
    scene.add(baseGroup);

    // ---------------- ANATOMICAL HUMAN DIGITAL TWIN GROUP ----------------
    const humanRoot = new THREE.Group();
    scene.add(humanRoot);

    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0xa7d0f7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.16,
      roughness: 0.22,
      metalness: 0.32,
      transparent: true,
      opacity: 0.56,
      clearcoat: 1.0,
      clearcoatRoughness: 0.14,
      depthWrite: true,
    });

    const jointMat = new THREE.MeshPhysicalMaterial({
      color: 0xcbe4fc,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.22,
      roughness: 0.18,
      metalness: 0.45,
      transparent: true,
      opacity: 0.65,
      clearcoat: 1.0,
    });

    const wireMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
    });

    // Head & Neck
    const headGroup = new THREE.Group();
    const craniumGeo = createLimbLathe([
      [0.001, -0.02],
      [0.052, 0.0], // neck base
      [0.048, 0.08], // upper neck
      [0.068, 0.12], // jaw
      [0.095, 0.19], // cheekbones
      [0.098, 0.26], // forehead
      [0.072, 0.32], // crown
      [0.001, 0.34],
    ]);
    const craniumMesh = new THREE.Mesh(craniumGeo, shellMat);
    craniumMesh.position.y = 1.54;
    craniumMesh.scale.set(0.92, 1, 1.04);
    headGroup.add(craniumMesh);

    // Neural glowing brain core
    const neuralMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const neuralCore = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 24), neuralMat);
    neuralCore.position.set(0, 1.75, 0.01);
    neuralCore.scale.set(0.9, 0.82, 1.08);
    headGroup.add(neuralCore);

    // Subtle hair silhouette cap (customizable by hairStyle)
    const hairCapGeo = new THREE.SphereGeometry(0.102, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const hairCap = new THREE.Mesh(
      hairCapGeo,
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0369a1,
        emissiveIntensity: 0.25,
        roughness: 0.35,
        metalness: 0.4,
        transparent: true,
        opacity: 0.45,
      })
    );
    hairCap.position.set(0, 1.76, -0.01);
    headGroup.add(hairCap);
    humanRoot.add(headGroup);

    // Torso (Clavicle -> Ribcage -> Waist -> Pelvis)
    const torsoGroup = new THREE.Group();
    const torsoGeo = createLimbLathe(
      [
        [0.001, 0.86], // pelvis bottom
        [0.145, 0.91], // hips
        [0.148, 1.0], // iliac
        [0.128, 1.13], // waist
        [0.155, 1.29], // lower chest
        [0.178, 1.43], // upper chest
        [0.156, 1.52], // shoulders slope
        [0.056, 1.56], // neck base collar
        [0.001, 1.56],
      ],
      36
    );
    const torsoMesh = new THREE.Mesh(torsoGeo, shellMat);
    torsoMesh.scale.set(1.06, 1, 0.66); // anatomical width vs chest depth
    torsoGroup.add(torsoMesh);

    const torsoWire = new THREE.LineSegments(new THREE.EdgesGeometry(torsoGeo, 24), wireMat);
    torsoWire.scale.copy(torsoMesh.scale);
    torsoGroup.add(torsoWire);
    humanRoot.add(torsoGroup);

    // Cardiac Heart Core + Chest Pulse Ring
    const chestGroup = new THREE.Group();
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.8,
      roughness: 0.15,
      metalness: 0.2,
    });
    const heartCore = new THREE.Mesh(new THREE.SphereGeometry(0.044, 24, 24), heartMat);
    heartCore.position.set(0.028, 1.34, 0.03);
    heartCore.scale.set(0.95, 1.2, 0.9);
    chestGroup.add(heartCore);

    const chestPulseRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.004, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.75 })
    );
    chestPulseRing.position.set(0.028, 1.34, 0.11);
    chestGroup.add(chestPulseRing);
    humanRoot.add(chestGroup);

    // Internal Spinal & Vascular Data Conduits
    const spineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.95, -0.04),
      new THREE.Vector3(0, 1.15, -0.03),
      new THREE.Vector3(0, 1.35, -0.045),
      new THREE.Vector3(0, 1.56, -0.025),
      new THREE.Vector3(0, 1.72, 0),
    ]);
    const spineConduit = new THREE.Mesh(
      new THREE.TubeGeometry(spineCurve, 32, 0.011, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
    );
    humanRoot.add(spineConduit);

    // Limbs Group (Shoulders, Arms, Hands, Thighs, Calves, Feet)
    const limbsGroup = new THREE.Group();

    const buildArm = (side: -1 | 1) => {
      const armGroup = new THREE.Group();
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.058, 18, 18), jointMat);
      shoulder.position.set(side * 0.21, 1.46, 0);
      armGroup.add(shoulder);

      const upperArmGeo = createLimbLathe([
        [0.046, 0],
        [0.052, 0.14],
        [0.04, 0.28],
      ]);
      const upperArm = new THREE.Mesh(upperArmGeo, shellMat);
      upperArm.position.set(side * 0.215, 1.19, 0);
      upperArm.rotation.z = side * -0.09;
      armGroup.add(upperArm);

      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.039, 16, 16), jointMat);
      elbow.position.set(side * 0.24, 1.19, 0);
      armGroup.add(elbow);

      const forearmGeo = createLimbLathe([
        [0.028, 0],
        [0.036, 0.14],
        [0.04, 0.26],
      ]);
      const forearm = new THREE.Mesh(forearmGeo, shellMat);
      forearm.position.set(side * 0.258, 0.93, 0.02);
      forearm.rotation.z = side * -0.06;
      forearm.rotation.x = -0.07;
      armGroup.add(forearm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 14), jointMat);
      hand.position.set(side * 0.268, 0.91, 0.035);
      hand.scale.set(0.7, 1.35, 0.45);
      armGroup.add(hand);

      return armGroup;
    };

    const buildLeg = (side: -1 | 1) => {
      const legGroup = new THREE.Group();
      const hipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 18), jointMat);
      hipJoint.position.set(side * 0.095, 0.9, 0);
      legGroup.add(hipJoint);

      const thighGeo = createLimbLathe([
        [0.052, 0],
        [0.068, 0.22],
        [0.076, 0.42],
      ]);
      const thigh = new THREE.Mesh(thighGeo, shellMat);
      thigh.position.set(side * 0.098, 0.48, 0);
      thigh.rotation.z = side * 0.02;
      legGroup.add(thigh);

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), jointMat);
      knee.position.set(side * 0.095, 0.48, 0.005);
      legGroup.add(knee);

      const calfGeo = createLimbLathe([
        [0.034, 0],
        [0.048, 0.22],
        [0.054, 0.34],
        [0.048, 0.42],
      ]);
      const calf = new THREE.Mesh(calfGeo, shellMat);
      calf.position.set(side * 0.095, 0.06, -0.005);
      legGroup.add(calf);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.048, 0.18), jointMat);
      foot.position.set(side * 0.095, 0.025, 0.045);
      legGroup.add(foot);

      return legGroup;
    };

    limbsGroup.add(buildArm(-1), buildArm(1), buildLeg(-1), buildLeg(1));
    humanRoot.add(limbsGroup);

    // Interactive Invisible Proxy Hitboxes (Layer 1) for Raycasting
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
    const createHitbox = (
      region: BodyRegion,
      geo: THREE.BufferGeometry,
      pos: [number, number, number]
    ) => {
      const m = new THREE.Mesh(geo, hitboxMat);
      m.position.set(...pos);
      m.layers.set(1);
      m.userData.region = region;
      humanRoot.add(m);
      return m;
    };

    const hitboxes = [
      createHitbox('head', new THREE.SphereGeometry(0.18, 12, 12), [0, 1.72, 0]),
      createHitbox('chest', new THREE.BoxGeometry(0.38, 0.3, 0.26), [0, 1.36, 0]),
      createHitbox('torso', new THREE.BoxGeometry(0.34, 0.3, 0.25), [0, 1.04, 0]),
      createHitbox('limbs', new THREE.BoxGeometry(0.65, 0.88, 0.3), [0, 0.45, 0]),
    ];

    // Floating Telemetry Particles around the Digital Twin (InstancedMesh / Points)
    const particleCount = 120;
    const pPositions = new Float32Array(particleCount * 3);
    const pSpeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.65 + (i % 7) * 0.14;
      pPositions[i * 3] = Math.cos(angle) * radius;
      pPositions[i * 3 + 1] = 0.15 + ((i * 0.17) % 1.85);
      pPositions[i * 3 + 2] = Math.sin(angle) * radius;
      pSpeeds[i] = 0.12 + (i % 5) * 0.05;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.022,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Animated Data Connection Arcs from body to floating anchor coordinates
    const makeDataArc = (start: THREE.Vector3, end: THREE.Vector3) => {
      const mid = start.clone().lerp(end, 0.5);
      mid.y += 0.14;
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
      return new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.36 })
      );
    };
    const arcChest = makeDataArc(new THREE.Vector3(0.05, 1.35, 0.08), new THREE.Vector3(0.85, 1.5, 0.1));
    const arcHead = makeDataArc(new THREE.Vector3(-0.04, 1.75, 0.04), new THREE.Vector3(-0.82, 1.85, 0.1));
    const arcLimbs = makeDataArc(new THREE.Vector3(0.15, 0.6, 0.05), new THREE.Vector3(0.82, 0.68, 0.1));
    scene.add(arcChest, arcHead, arcLimbs);

    // Raycaster interaction
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastHoverCheck = 0;

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 60) return;
      lastHoverCheck = now;
      updateMouse(e.clientX, e.clientY);
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(hitboxes, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    let pointerDownPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 8) return; // drag rotation, not a click
      updateMouse(e.clientX, e.clientY);
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(hitboxes, false);
      if (hits.length > 0) {
        const reg = hits[0].object.userData.region as BodyRegion;
        stateRef.current.onSelectRegion?.(reg);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver for crisp responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(240, Math.floor(entry.contentRect.width));
        const h = Math.max(240, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation loop with software WebGL pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const s = stateRef.current;

      // Apply user height & build proportions smoothly
      humanRoot.scale.x = THREE.MathUtils.damp(humanRoot.scale.x, s.widthScale, 6, delta);
      humanRoot.scale.z = THREE.MathUtils.damp(humanRoot.scale.z, s.widthScale, 6, delta);
      humanRoot.scale.y = THREE.MathUtils.damp(humanRoot.scale.y, s.heightScale, 6, delta);

      // Apply hair style scale subtlety
      hairCap.visible = s.hairStyle !== 'minimal';
      hairCap.scale.setScalar(
        s.hairStyle === 'long' ? 1.07 : s.hairStyle === 'medium' ? 1.04 : 1.0
      );

      // Update accent color
      heartMat.color.setHex(s.accentHex);
      heartMat.emissive.setHex(s.accentHex);

      // Heartbeat double-pulse (lub-dub) synced to real BPM
      const bpm = s.hasMissingData ? 60 : Math.max(40, Math.min(180, s.heartRateBpm));
      const beatFreq = bpm / 60;
      const phase = (elapsed * beatFreq) % 1;
      const lub = Math.exp(-Math.pow((phase - 0.14) / 0.06, 2));
      const dub = 0.65 * Math.exp(-Math.pow((phase - 0.34) / 0.07, 2));
      const beatAmp = s.hasMissingData ? 0 : lub + dub;

      const heartScale = 1 + beatAmp * 0.24;
      heartCore.scale.set(0.95 * heartScale, 1.2 * heartScale, 0.9 * heartScale);
      heartMat.emissiveIntensity = s.selectedRegion === 'chest' ? 2.6 + beatAmp * 1.4 : 1.3 + beatAmp * 1.1;
      chestPointLight.intensity = 1.0 + beatAmp * 1.2;

      chestPulseRing.scale.setScalar(1 + phase * 0.45);
      (chestPulseRing.material as THREE.MeshBasicMaterial).opacity = s.hasMissingData
        ? 0.1
        : Math.max(0, 0.72 * (1 - phase));

      // Subtle breathing & region illumination
      torsoMesh.scale.z = 0.66 + Math.sin(elapsed * 1.2) * 0.014;
      neuralMat.emissiveIntensity = s.selectedRegion === 'head' ? 2.2 : 0.8 + (s.energyScore / 10) * 0.7;
      shellMat.opacity = s.hasMissingData ? 0.3 : 0.56;
      shellMat.emissiveIntensity = s.selectedRegion === 'whole' ? 0.16 : 0.22;

      // Floating data particles rising smoothly
      const posAttr = pGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let py = posAttr.getY(i) + pSpeeds[i] * delta;
        if (py > 2.05) py = 0.12;
        posAttr.setY(i, py);
      }
      posAttr.needsUpdate = true;
      particles.rotation.y = elapsed * 0.06;

      // Handle zoom commands cleanly
      if (zoomActionRef.current) {
        const factor = zoomActionRef.current === 'in' ? 0.82 : 1.22;
        _targetCamPos.copy(camera.position).sub(controls.target).multiplyScalar(factor);
        const len = THREE.MathUtils.clamp(_targetCamPos.length(), 1.5, 6.0);
        _targetCamPos.setLength(len).add(controls.target);
        cameraGoalRef.current = {
          active: true,
          pos: _targetCamPos.clone(),
          lookAt: controls.target.clone(),
        };
        zoomActionRef.current = null;
      }

      // Smooth damped camera preset transitions
      if (cameraGoalRef.current.active) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraGoalRef.current.pos.x, 5.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraGoalRef.current.pos.y, 5.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, cameraGoalRef.current.pos.z, 5.5, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, cameraGoalRef.current.lookAt.x, 5.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, cameraGoalRef.current.lookAt.y, 5.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, cameraGoalRef.current.lookAt.z, 5.5, delta);

        if (
          camera.position.distanceTo(cameraGoalRef.current.pos) < 0.02 &&
          controls.target.distanceTo(cameraGoalRef.current.lookAt) < 0.02
        ) {
          cameraGoalRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
    };
  }, [compact]);

  if (webglLost) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#061021] text-sky-100 p-6 text-center rounded-2xl">
        <p className="font-display text-lg font-semibold">3D Viewport Paused</p>
        <p className="text-sm text-sky-300/80 mt-1 max-w-sm">
          WebGL rendering context was interrupted by the browser. Reloading or switching tabs restores the 3D Digital Twin automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] font-mono-tabular text-sky-300/75">
        Drag to rotate 360° · Scroll to zoom · Click head, chest, torso, or limbs
      </div>
    </div>
  );
};
