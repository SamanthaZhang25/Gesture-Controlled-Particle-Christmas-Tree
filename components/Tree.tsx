
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeVersion, DecorationItem } from '../types';

interface TreeProps {
  version: TreeVersion;
  scale: number;
  isRelighting: boolean;
  onRelightEnd: () => void;
  decorations: DecorationItem[];
}

const createStarShape = (points: number, innerRadius: number, outerRadius: number) => {
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(i * step - Math.PI / 2) * radius;
    const y = Math.sin(i * step - Math.PI / 2) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
};

const StarMesh: React.FC<{ position: [number, number, number], color: string, scale?: number, isTop?: boolean }> = ({ position, color, scale = 1, isTop = false }) => {
  const starRef = useRef<THREE.Mesh>(null!);
  const starShape = useMemo(() => createStarShape(5, 0.15, 0.4), []);
  const extrudeSettings = useMemo(() => ({ depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 }), []);

  useFrame((state) => {
    if (starRef.current) {
      if (isTop) {
        starRef.current.rotation.y = state.clock.getElapsedTime() * 1.5;
        const pulse = Math.sin(state.clock.getElapsedTime() * 5) * 0.1 + 1.1;
        starRef.current.scale.set(pulse * scale, pulse * scale, pulse * scale);
      } else {
        starRef.current.rotation.y += 0.01;
        const twinkle = Math.sin(state.clock.getElapsedTime() * 4 + position[0] * 10) * 0.1 + 0.9;
        starRef.current.scale.set(twinkle * scale, twinkle * scale, twinkle * scale);
      }
    }
  });

  return (
    <mesh ref={starRef} position={position}>
      <extrudeGeometry args={[starShape, extrudeSettings]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={isTop ? 6 : 2} 
      />
      {isTop && <pointLight intensity={4} color={color} distance={10} />}
    </mesh>
  );
};

const Decoration: React.FC<{ item: DecorationItem }> = ({ item }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const sparkleRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.position.y = item.position[1] + Math.sin(t * 2 + item.position[0]) * 0.05;
      if (sparkleRef.current) {
        sparkleRef.current.rotation.z += 0.05;
        const s = Math.sin(t * 6 + item.position[0]) * 0.5 + 0.5;
        sparkleRef.current.scale.setScalar(s * 0.3);
        sparkleRef.current.material.opacity = s * 0.8;
      }
    }
  });

  return (
    <group ref={groupRef} position={item.position}>
      {item.type === 'ball' && (
        <mesh>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial 
            color={item.color} 
            emissive={item.color} 
            emissiveIntensity={1} 
            roughness={0.1} 
            metalness={0.8} 
          />
          <pointLight intensity={0.8} color={item.color} distance={2} />
        </mesh>
      )}
      {item.type === 'star' && <StarMesh position={[0, 0, 0]} color={item.color} scale={0.5} />}
      {item.type === 'gift' && (
        <group>
          <mesh>
            <boxGeometry args={[0.32, 0.32, 0.32]} />
            <meshStandardMaterial color={item.color} roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh><boxGeometry args={[0.34, 0.08, 0.34]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.8} /></mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.34, 0.08, 0.34]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.8} /></mesh>
        </group>
      )}
      <mesh ref={sparkleRef} position={[0, 0, 0.1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.5} 
          blending={THREE.AdditiveBlending}
          map={new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png')}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

const Tree: React.FC<TreeProps> = ({ version, scale, isRelighting, onRelightEnd, decorations }) => {
  const pointsRef = useRef<THREE.Points>(null!);
  const lightPointsRef = useRef<THREE.Points>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const relightProgress = useRef(0);

  const PARTICLE_COUNT = 5500;
  const LIGHT_COUNT = 400;

  const colors = useMemo(() => {
    switch (version) {
      case TreeVersion.V2: // Pink Theme
        return {
          foliage: '#ff85a2',
          lights: ['#ffffff', '#ff007f', '#ffc1cc', '#ffd1dc', '#fff0f5'],
          trunk: '#3d1a2a',
          star: '#ff007f'
        };
      case TreeVersion.V3: // Silver Theme
        return {
          foliage: '#c0c0c0',
          lights: ['#ffffff', '#e5e4e2', '#b0c4de', '#f5f5f5', '#dcdcdc'],
          trunk: '#2a2a2a',
          star: '#ffffff'
        };
      case TreeVersion.CLASSIC:
      default:
        return {
          foliage: '#0a3d0a',
          lights: ['#ff1a1a', '#ffd700', '#ffffff', '#00ff00', '#ffff00', '#ff00ff'],
          trunk: '#2d1a0a',
          star: '#ffea00'
        };
    }
  }, [version]);

  const [foliagePositions, lightPositions, lightColors] = useMemo(() => {
    const fPos = new Float32Array(PARTICLE_COUNT * 3);
    const lPos = new Float32Array(LIGHT_COUNT * 3);
    const lCol = new Float32Array(LIGHT_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const h = Math.random() * 5.2;
      const radius = (1 - h / 5.2) * 2.4;
      const angle = Math.random() * Math.PI * 2;
      fPos[i * 3] = Math.cos(angle) * radius * (0.85 + Math.random() * 0.3);
      fPos[i * 3 + 1] = h - 2.6;
      fPos[i * 3 + 2] = Math.sin(angle) * radius * (0.85 + Math.random() * 0.3);
    }

    for (let i = 0; i < LIGHT_COUNT; i++) {
      const h = Math.random() * 5.1;
      const radius = (1 - h / 5.2) * 2.3;
      const angle = Math.random() * Math.PI * 2;
      lPos[i * 3] = Math.cos(angle) * radius;
      lPos[i * 3 + 1] = h - 2.5;
      lPos[i * 3 + 2] = Math.sin(angle) * radius;
      const color = new THREE.Color(colors.lights[Math.floor(Math.random() * colors.lights.length)]);
      lCol[i * 3] = color.r;
      lCol[i * 3 + 1] = color.g;
      lCol[i * 3 + 2] = color.b;
    }
    return [fPos, lPos, lCol];
  }, [colors]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const sway = Math.sin(t * 0.5) * 0.03;
    if (groupRef.current) groupRef.current.rotation.y = sway;
    
    if (lightPointsRef.current) {
      const sparkleFactor = isRelighting ? (1 + Math.sin(t * 15) * 0.5) * 3 : (1 + Math.sin(t * 4) * 0.2);
      lightPointsRef.current.material.size = 0.09 * sparkleFactor;
    }
    
    if (isRelighting) {
      relightProgress.current += 0.02;
      if (relightProgress.current >= 1) {
        onRelightEnd();
        relightProgress.current = 0;
      }
    }
  });

  return (
    <group scale={scale}>
      <group ref={groupRef}>
        <StarMesh position={[0, 2.7, 0]} color={colors.star} isTop={true} scale={0.75} />
        <mesh position={[0, -2.7, 0]}>
          <cylinderGeometry args={[0.22, 0.38, 0.7]} />
          <meshStandardMaterial color={colors.trunk} roughness={1} />
        </mesh>
        <points ref={pointsRef}>
          <bufferGeometry><bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={foliagePositions} itemSize={3} /></bufferGeometry>
          <pointsMaterial size={0.038} color={colors.foliage} transparent opacity={0.75} />
        </points>
        <points ref={lightPointsRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={LIGHT_COUNT} array={lightPositions} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={LIGHT_COUNT} array={lightColors} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial vertexColors transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation={true} />
        </points>
        {decorations.map((d) => (<Decoration key={d.id} item={d} />))}
      </group>
    </group>
  );
};

export default Tree;
