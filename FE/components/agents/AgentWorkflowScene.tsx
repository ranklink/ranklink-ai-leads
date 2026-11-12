"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { AgentStageId, AgentStageState } from "@/lib/agent-workspace";

interface AgentWorkflowSceneProps {
  agents: AgentStageState[];
  selectedAgent: AgentStageId;
  onSelectAgent: (id: AgentStageId) => void;
}

interface AnimatedAgent {
  id: AgentStageId;
  root: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  glow: THREE.Mesh;
}

const AGENT_POSITIONS: Record<AgentStageId, [number, number, number]> = {
  discovery: [-5.35, 0.005, -1.45],
  qualification: [-1.85, 0.005, 1.35],
  drafting: [1.85, 0.005, -1.45],
  review: [5.35, 0.005, 1.35],
};

function roundedMaterial(color: string, roughness = 0.5) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });
}

function makeAgent(agent: AgentStageState): AnimatedAgent {
  const color = new THREE.Color(agent.color);
  const bodyMaterial = roundedMaterial(agent.color, 0.34);
  const lightMaterial = new THREE.MeshStandardMaterial({ color: agent.color, emissive: color, emissiveIntensity: 0.45, roughness: 0.25 });
  const darkMaterial = roundedMaterial("#23324b", 0.46);
  const shellMaterial = roundedMaterial("#f9fbff", 0.4);
  const agentGroup = new THREE.Group();
  const root = new THREE.Group();
  agentGroup.add(root);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.37, 0.48, 5, 10), bodyMaterial);
  body.position.y = 1.03;
  body.castShadow = true;
  root.add(body);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.21, 0.12), shellMaterial);
  chest.position.set(0, 1.08, 0.34);
  chest.castShadow = true;
  root.add(chest);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 12), lightMaterial);
  core.position.set(0, 1.08, 0.418);
  root.add(core);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 20), shellMaterial);
  head.position.y = 1.74;
  head.castShadow = true;
  root.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.095), darkMaterial);
  visor.position.set(0, 1.75, 0.264);
  visor.castShadow = true;
  root.add(visor);

  for (const eyeX of [-0.085, 0.085]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 10), lightMaterial);
    eye.position.set(eyeX, 1.75, 0.315);
    root.add(eye);
  }

  const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 10), darkMaterial);
  antennaStem.position.set(0.12, 2.06, 0);
  root.add(antennaStem);
  const antenna = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), lightMaterial);
  antenna.position.set(0.12, 2.14, 0);
  root.add(antenna);

  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.39, 1.25, 0);
    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.23, 4, 8), bodyMaterial);
    upperArm.position.y = -0.16;
    upperArm.castShadow = true;
    arm.add(upperArm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), shellMaterial);
    hand.position.set(0, -0.36, 0.02);
    arm.add(hand);
    root.add(arm);
    return arm;
  });

  for (const legX of [-0.15, 0.15]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.24, 4, 8), darkMaterial);
    leg.position.set(legX, 0.38, 0);
    leg.castShadow = true;
    root.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.11, 0.34), shellMaterial);
    foot.position.set(legX, 0.15, 0.055);
    foot.castShadow = true;
    root.add(foot);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 28),
    new THREE.MeshBasicMaterial({ color: "#52617a", transparent: true, opacity: 0.12, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(0.64, 0.027, 8, 48),
    new THREE.MeshBasicMaterial({ color: agent.color, transparent: true, opacity: 0.78 }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.06;
  root.add(glow);
  agentGroup.userData.arms = arms;
  agentGroup.userData.material = lightMaterial;
  const [x, y, z] = AGENT_POSITIONS[agent.id];
  agentGroup.position.set(x, y, z);
  agentGroup.userData.agentId = agent.id;
  agentGroup.userData.leftArm = arms[0];
  agentGroup.userData.rightArm = arms[1];
  agentGroup.userData.glow = glow;
  return { id: agent.id, root: agentGroup, leftArm: arms[0], rightArm: arms[1], glow };
}

function addStation(scene: THREE.Scene, position: [number, number, number], color: string, agentId: AgentStageId) {
  const station = new THREE.Group();
  station.position.set(...position);
  station.userData.agentId = agentId;
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 1.02, 0.1, 40), roundedMaterial("#ffffff", 0.62));
  platform.position.y = 0.05;
  platform.castShadow = true;
  platform.receiveShadow = true;
  station.add(platform);
  const border = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.018, 7, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.56 }));
  border.rotation.x = Math.PI / 2;
  border.position.y = 0.105;
  station.add(border);
  const consoleTop = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.56), roundedMaterial("#e8edf5", 0.48));
  consoleTop.position.set(0.62, 0.72, -0.34);
  consoleTop.rotation.y = -0.16;
  consoleTop.castShadow = true;
  station.add(consoleTop);
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.07), roundedMaterial("#25364f", 0.32));
  monitor.position.set(0.62, 0.94, -0.5);
  monitor.rotation.y = -0.16;
  station.add(monitor);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.22), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 }));
  screen.position.set(0.62, 0.95, -0.455);
  screen.rotation.y = -0.16;
  station.add(screen);
  const bars = [0.12, 0.19, 0.1, 0.16].map((height, index) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, height, 0.012), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.88 }));
    bar.position.set(0.51 + index * 0.075, 0.88 + height / 2, -0.435);
    station.add(bar);
    return bar;
  });
  station.userData.bars = bars;
  scene.add(station);
  return station;
}

function addWorkflowPath(scene: THREE.Scene) {
  const points: THREE.Vector3[] = [
    new THREE.Vector3(-5.35, 0.18, -1.45),
    new THREE.Vector3(-4.0, 0.12, 0.8),
    new THREE.Vector3(-1.85, 0.18, 1.35),
    new THREE.Vector3(0, 0.12, -0.55),
    new THREE.Vector3(1.85, 0.18, -1.45),
    new THREE.Vector3(3.9, 0.12, 0.85),
    new THREE.Vector3(5.35, 0.18, 1.35),
  ];
  const curve = new THREE.CatmullRomCurve3(points);
  const line = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 120, 0.027, 8, false),
    new THREE.MeshBasicMaterial({ color: "#9aa8bf", transparent: true, opacity: 0.44 }),
  );
  scene.add(line);
  const dots = Array.from({ length: 4 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({ color: ["#4c7df0", "#19a87b", "#e9933d", "#9664d8"][index] });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), material);
    scene.add(dot);
    return { dot, offset: index * 0.22 };
  });
  return { curve, dots };
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
    geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export function AgentWorkflowScene({ agents, selectedAgent, onSelectAgent }: AgentWorkflowSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectAgent);
  const selectedAgentRef = useRef(selectedAgent);

  useEffect(() => {
    onSelectRef.current = onSelectAgent;
  }, [onSelectAgent]);

  useEffect(() => {
    selectedAgentRef.current = selectedAgent;
  }, [selectedAgent]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      mount.dataset.sceneUnavailable = "false";
    } catch {
      mount.dataset.sceneUnavailable = "true";
      const fallback = mount.querySelector<HTMLElement>(".agent-scene-fallback");
      if (fallback) fallback.textContent = "3D view is unavailable in this browser.";
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#eaf0ff", 19, 38);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 70);
    camera.position.set(13.5, 15, 16.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.65, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 17;
    controls.maxDistance = 31;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = Math.PI * 0.22;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor("#eaf0ff", 0);
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.className = "agent-scene-canvas";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#ffffff", "#d2d9e4", 2.25));
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.8);
    keyLight.position.set(-5, 13, 8);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight("#aab8ff", 1.55);
    rimLight.position.set(8, 7, -9);
    scene.add(rimLight);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: "#eaf0ff", transparent: true, opacity: 0 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.29;
    scene.add(floor);

    const foundation = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.32, 7.3), roundedMaterial("#dce4f5", 0.8));
    foundation.position.y = -0.13;
    foundation.receiveShadow = true;
    scene.add(foundation);
    const floorTop = new THREE.Mesh(new THREE.BoxGeometry(14.03, 0.08, 7.13), roundedMaterial("#f8f9ff", 0.78));
    floorTop.position.y = 0.06;
    scene.add(floorTop);

    const grid = new THREE.GridHelper(12.8, 22, "#c5c9ee", "#dfe3f5");
    grid.position.y = 0.108;
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      if (material instanceof THREE.Material) {
        material.transparent = true;
        material.opacity = 0.44;
      }
    });
    scene.add(grid);

    const agentsById = new Map<AgentStageId, AnimatedAgent>();
    const selectionTargets: THREE.Object3D[] = [];
    agents.forEach((agent) => {
      const rig = makeAgent(agent);
      scene.add(rig.root);
      agentsById.set(agent.id, rig);
      selectionTargets.push(rig.root, addStation(scene, AGENT_POSITIONS[agent.id], agent.color, agent.id));
    });

    const workflow = addWorkflowPath(scene);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6.55, 0.018, 8, 96),
      new THREE.MeshBasicMaterial({ color: "#b6c2d3", transparent: true, opacity: 0.42 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.11;
    ring.scale.z = 0.47;
    scene.add(ring);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: { x: number; y: number } | undefined;
    const handlePointerDown = (event: PointerEvent) => {
      pointerStart = { x: event.clientX, y: event.clientY };
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(selectionTargets, true)[0]?.object;
      if (hit) {
        let item: THREE.Object3D | null = hit;
        while (item && !item.userData.agentId) item = item.parent;
        if (item?.userData.agentId) onSelectRef.current(item.userData.agentId as AgentStageId);
      }
      pointerStart = undefined;
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let frameId = 0;
    const render = () => {
      const elapsed = clock.getElapsedTime();
      agentsById.forEach((agent, id) => {
        const phase = id === "discovery" ? 0 : id === "qualification" ? 0.8 : id === "drafting" ? 1.6 : 2.4;
        const working = agents.find((item) => item.id === id)?.presence === "working";
        const speed = reduceMotion ? 0.12 : working ? 1.55 : 0.8;
        agent.root.position.y = AGENT_POSITIONS[id][1] + Math.sin(elapsed * speed + phase) * (reduceMotion ? 0.025 : working ? 0.12 : 0.07);
        agent.root.rotation.y = Math.sin(elapsed * 0.45 + phase) * 0.09;
        agent.leftArm.rotation.z = Math.sin(elapsed * speed + phase) * 0.2 + 0.14;
        agent.rightArm.rotation.z = Math.sin(elapsed * speed + phase + 1.2) * 0.2 - 0.14;
        const selected = id === selectedAgentRef.current;
        (agent.glow.material as THREE.MeshBasicMaterial).opacity = selected ? 1 : 0.62;
        agent.glow.scale.setScalar(selected ? 1.1 : 1);
      });
      workflow.dots.forEach(({ dot, offset }) => {
        const progress = ((elapsed * (reduceMotion ? 0.025 : 0.085) + offset) % 1 + 1) % 1;
        dot.position.copy(workflow.curve.getPointAt(progress));
      });
      controls.update();
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.position.x = width < 570 ? 16 : 13.5;
      camera.position.z = width < 570 ? 20 : 16.5;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resizeObserver.observe(mount);
    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [agents]);

  return <div ref={mountRef} role="img" className="agent-scene" data-scene-unavailable="loading" aria-label="Interactive 3D visualization of the lead research workflow"><p className="agent-scene-fallback">Loading the interactive 3D workflow…</p></div>;
}
