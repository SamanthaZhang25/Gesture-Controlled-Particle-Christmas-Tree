
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { TreeVersion, GestureState, DecorationItem, DecorationTemplate } from './types';
import { useHandTracker } from './hooks/useHandTracker';
import { detectGestures } from './utils/gestureLogic';
import Tree from './components/Tree';
import HandOverlay from './components/HandOverlay';
import DecorationSidebar, { DECORATIONS } from './components/DecorationSidebar';
import { Sparkles, Heart, Hand, MousePointer2, Linkedin, Globe } from 'lucide-react';

const i18n = {
  en: {
    edition: 'Edition',
    classic: 'Classic',
    pink: 'Pink',
    silver: 'Silver',
    guideResize: 'Center Palm & Open/Close',
    guideResizeSub: 'Resize the Christmas Tree (Only in center)',
    guideGlow: 'Fingers Together',
    guideGlowSub: 'Trigger glowing light effect',
    guideDecorate: 'Drag Decorations',
    guideDecorateSub: 'Dwell on tree and wait for the red circle to finish',
    carrying: 'Carrying',
    linkedin: 'LinkedIn',
    visionInput: 'Vision Input',
    collection: 'Collection',
    dwellToSelect: 'Dwell to Select'
  },
  zh: {
    edition: '版本',
    classic: '经典',
    pink: '粉色',
    silver: '银色',
    guideResize: '居中张开/合并手掌',
    guideResizeSub: '在屏幕中心区域放大或缩小圣诞树',
    guideGlow: '手指并拢',
    guideGlowSub: '触发圣诞树发光效果',
    guideDecorate: '拖拽右侧装饰',
    guideDecorateSub: '悬停树上等待红色圆圈加载完成即可放置',
    carrying: '正在拖拽',
    linkedin: '领英',
    visionInput: '视觉输入',
    collection: '装饰库',
    dwellToSelect: '悬停选择'
  }
};

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const results = useHandTracker(videoRef);
  
  const [treeVersion, setTreeVersion] = useState<TreeVersion>(TreeVersion.CLASSIC);
  const [gesture, setGesture] = useState<GestureState | null>(null);
  const [scale, setScale] = useState(1);
  const [isRelighting, setIsRelighting] = useState(false);
  const [decorations, setDecorations] = useState<DecorationItem[]>([]);
  const [heldDecoration, setHeldDecoration] = useState<DecorationTemplate | null>(null);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  
  const [handHoverIndex, setHandHoverIndex] = useState<number | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStartTime = useRef<number | null>(null);
  const lastTarget = useRef<string | null>(null);

  const t = i18n[lang];

  const MIN_SCALE = 0.8; 
  const MAX_SCALE = 2.8;

  const placeDecoration = useCallback((pos: [number, number, number]) => {
    if (!heldDecoration) return;
    
    // Convert world position to tree-local position by dividing by current scale
    // This ensures decorations stay attached to the same spot on the tree when it resizes
    const localPos: [number, number, number] = [
      pos[0] / scale,
      pos[1] / scale,
      pos[2] / scale
    ];

    const newDec: DecorationItem = {
      id: Date.now().toString(),
      type: heldDecoration.type,
      color: heldDecoration.color,
      position: localPos
    };
    
    setDecorations(prev => [...prev, newDec]);
    setHeldDecoration(null);
    setDwellProgress(0);
    dwellStartTime.current = null;
    lastTarget.current = null;
    if (window.navigator.vibrate) window.navigator.vibrate([40, 30, 40]);
  }, [heldDecoration, scale]);

  useEffect(() => {
    if (results?.landmarks?.length > 0) {
      const newGesture = detectGestures({
        landmarks: results.landmarks[0],
        worldLandmarks: results.worldLandmarks[0]
      }, gesture);
      setGesture(newGesture);

      // --- Updated Scaling Logic ---
      // Only change scale if the hand is relatively centered in the screen
      const { x: hX, y: hY } = newGesture.handCenterPos;
      const isCentered = hX > 0.3 && hX < 0.7 && hY > 0.3 && hY < 0.7;

      if (isCentered) {
        const targetScale = Math.max(MIN_SCALE, MIN_SCALE + newGesture.palmOpenness * (MAX_SCALE - MIN_SCALE));
        setScale(prev => prev * 0.9 + targetScale * 0.1);
      }
      // -----------------------------

      if (newGesture.isHeart && !isRelighting) {
        setIsRelighting(true);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
      }

      if (newGesture.isPeace) {
        setScale(1);
        setDecorations([]);
        setHeldDecoration(null);
        if (window.navigator.vibrate) window.navigator.vibrate(20);
      }

      const { x, y } = newGesture.indexFingerPos;
      const { x: wx, y: wy } = newGesture.worldIndexPos;
      let currentTarget: string | null = null;
      let hoverIdx: number | null = null;

      if (x < 0.2) {
        const sidebarY = (y - 0.1) / 0.8;
        const idx = Math.floor(sidebarY * DECORATIONS.length);
        if (idx >= 0 && idx < DECORATIONS.length) {
          hoverIdx = idx;
          currentTarget = `sidebar-${idx}`;
        }
      } 
      else if (heldDecoration) {
        const treeBaseY = -2.5 * scale;
        const treeTopY = 2.5 * scale;
        const currentY = wy;
        if (currentY >= treeBaseY && currentY <= treeTopY) {
          const hNorm = (currentY - treeBaseY) / (treeTopY - treeBaseY);
          const maxRadius = 2.8 * scale;
          const currentRadius = (1 - hNorm) * maxRadius;
          if (Math.abs(wx) <= currentRadius) currentTarget = 'tree';
        }
      }

      setHandHoverIndex(hoverIdx);

      if (currentTarget && currentTarget === lastTarget.current) {
        if (dwellStartTime.current === null) dwellStartTime.current = Date.now();
        const elapsed = Date.now() - dwellStartTime.current;
        const threshold = currentTarget.startsWith('sidebar') ? 600 : 1200;
        const progress = Math.min(elapsed / threshold, 1);
        setDwellProgress(progress);
        if (progress >= 1) {
          if (currentTarget.startsWith('sidebar')) {
            setHeldDecoration(DECORATIONS[hoverIdx!]);
            dwellStartTime.current = null;
            setDwellProgress(0);
            lastTarget.current = null;
          } else if (currentTarget === 'tree') {
            placeDecoration([wx, wy, 0]);
          }
        }
      } else {
        dwellStartTime.current = null;
        setDwellProgress(0);
        lastTarget.current = currentTarget;
      }
    }
  }, [results, isRelighting, heldDecoration, placeDecoration, scale]);

  return (
    <div className="relative w-full h-screen bg-[#020308] overflow-hidden font-sans select-none text-white">
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#0a1a2a_0%,_transparent_100%)] opacity-50" />
        <div className="absolute top-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
      </div>

      {/* Language Switcher - Top Right */}
      <div className="absolute top-6 right-6 z-30">
        <button 
          onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full transition-all text-xs font-bold tracking-wider"
        >
          <Globe size={14} className="text-cyan-400" />
          <span>{lang === 'en' ? 'EN / 中' : '中 / EN'}</span>
        </button>
      </div>

      {/* Top Center Copyright */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full flex items-center gap-4 shadow-2xl">
          <span className="text-[10px] font-black text-white/60 tracking-[0.2em] uppercase whitespace-nowrap">
            © 2024 Samantha Zhang
          </span>
          <div className="w-[1px] h-3 bg-white/20" />
          <a href="https://www.linkedin.com/in/yingxuan-zhang-8bb0b32ba/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors pointer-events-auto">
            <Linkedin size={12} fill="currentColor" />
            <span className="text-[10px] font-bold tracking-wider">{t.linkedin}</span>
          </a>
        </div>
      </div>

      <div className="absolute top-10 left-10 z-10 space-y-3">
        <h1 className="text-6xl font-black italic tracking-tighter text-white flex items-center gap-4 drop-shadow-2xl">
          <Sparkles className="text-yellow-300 fill-yellow-300 animate-pulse" size={40} />
          <span>XMAS<span className="text-red-500">GLOW</span></span>
        </h1>
        <div className="flex gap-4 pt-2">
          {[
            { id: TreeVersion.CLASSIC, label: t.classic },
            { id: TreeVersion.V2, label: t.pink },
            { id: TreeVersion.V3, label: t.silver }
          ].map((v) => (
            <button key={v.id} onClick={() => setTreeVersion(v.id)} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all duration-500 uppercase border-2 ${treeVersion === v.id ? 'bg-white text-black border-white scale-105 shadow-[0_0_25px_rgba(255,255,255,0.4)]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:bg-white/10'}`}>
              {v.label} {t.edition}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-10 right-32 z-10 flex flex-col gap-4 bg-white/5 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] max-w-xs">
        <div className="flex items-center gap-4 group px-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-inner shrink-0"><Hand size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white/90">{t.guideResize}</span>
            <span className="text-[8px] text-white/40 uppercase tracking-widest">{t.guideResizeSub}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 group px-2">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform shadow-inner shrink-0"><Heart size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white/90">{t.guideGlow}</span>
            <span className="text-[8px] text-white/40 uppercase tracking-widest">{t.guideGlowSub}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 group px-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-inner shrink-0"><MousePointer2 size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white/90">{t.guideDecorate}</span>
            <span className="text-[8px] text-white/40 uppercase tracking-[0.05em] leading-relaxed">{t.guideDecorateSub}</span>
          </div>
        </div>
      </div>

      {gesture && (
        <div className="absolute z-50 pointer-events-none transition-transform duration-75" style={{ left: `${(1 - gesture.indexFingerPos.x) * 100}%`, top: `${gesture.indexFingerPos.y * 100}%`, transform: 'translate(-50%, -50%)' }}>
          {dwellProgress > 0 && (
            <svg className="absolute -inset-10 w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
              <circle cx="40" cy="40" r="34" stroke={lastTarget.current === 'tree' ? "#f43f5e" : "#22d3ee"} strokeWidth="6" fill="none" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - dwellProgress)}`} className="transition-all duration-75 ease-linear" />
            </svg>
          )}
          <div className={`w-5 h-5 rounded-full shadow-[0_0_30px_white] transition-all duration-300 ${heldDecoration ? 'bg-cyan-400 scale-150' : 'bg-white'}`} />
          {heldDecoration && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-1.5 rounded-full shadow-2xl scale-90">
              <span className="text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">{t.carrying} {heldDecoration.label}</span>
            </div>
          )}
        </div>
      )}

      <Canvas shadows gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={45} />
        <OrbitControls enablePan={false} maxDistance={15} minDistance={6} enableDamping dampingFactor={0.05} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
        <spotLight position={[-10, 20, 10]} angle={0.2} penumbra={1} intensity={3} color={treeVersion === TreeVersion.CLASSIC ? '#ffebd3' : '#d3ebff'} />
        <Stars radius={120} depth={60} count={9000} factor={6} saturation={0.5} fade speed={2} />
        <Environment preset="night" />
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <Tree version={treeVersion} scale={scale} isRelighting={isRelighting} onRelightEnd={() => setIsRelighting(false)} decorations={decorations} />
        </Float>
        {heldDecoration && gesture && (
          <mesh position={[gesture.worldIndexPos.x, gesture.worldIndexPos.y, 1.0]}>
            {heldDecoration.type === 'ball' && <sphereGeometry args={[0.22, 24, 24]} />}
            {heldDecoration.type === 'star' && <octahedronGeometry args={[0.3, 0]} />}
            {heldDecoration.type === 'gift' && <boxGeometry args={[0.35, 0.35, 0.35]} />}
            <meshStandardMaterial color={heldDecoration.color} transparent opacity={0.6} emissive={heldDecoration.color} emissiveIntensity={2.5} roughness={0} />
            <pointLight intensity={2} color={heldDecoration.color} distance={4} />
          </mesh>
        )}
        <SparkleTrail position={gesture?.worldIndexPos || {x:0, y:0, z:0}} active={!!gesture} />
      </Canvas>

      <DecorationSidebar onDragStart={setHeldDecoration} activeDragId={heldDecoration?.id || null} handHoverIndex={handHoverIndex} labelCollection={t.collection} labelDwell={t.dwellToSelect} />
      <HandOverlay results={results} labelInput={t.visionInput} />
    </div>
  );
};

const SparkleTrail: React.FC<{ position: { x: number, y: number, z: number }, active: boolean }> = ({ position, active }) => {
  const points = useRef<THREE.Group>(null!);
  const particles = useMemo(() => Array.from({ length: 15 }).map(() => ({ offset: [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5], speed: 0.12 + Math.random() * 0.25, color: ['#ffffff', '#22d3ee', '#f472b6'][Math.floor(Math.random() * 3)] })), []);
  useFrame((state) => {
    if (points.current && active) {
      points.current.children.forEach((child, i) => {
        const p = particles[i];
        child.position.x = lerp(child.position.x, position.x + p.offset[0], p.speed);
        child.position.y = lerp(child.position.y, position.y + p.offset[1], p.speed);
        child.position.z = lerp(child.position.z, position.z + p.offset[2], p.speed);
        child.scale.setScalar(Math.sin(state.clock.elapsedTime * 10 + i) * 0.05 + 0.08);
      });
      points.current.visible = true;
    } else if (points.current) points.current.visible = false;
  });
  return <group ref={points}>{particles.map((p, i) => (<mesh key={i}><icosahedronGeometry args={[0.1, 1]} /><meshBasicMaterial color={p.color} transparent opacity={0.6} /></mesh>))}</group>;
};

const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;

export default App;
