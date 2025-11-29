import { useState, useEffect, useRef } from 'react';
import { Layers, RotateCcw, ZoomIn, ZoomOut, Sun, Contrast, Brain, Bone, Heart, Upload, ChevronLeft, ChevronRight, Play, Pause, Crosshair } from 'lucide-react';

export default function DICOMViewer() {
  const canvasRef = useRef(null);
  const [slice, setSlice] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [windowCenter, setWindowCenter] = useState(40);
  const [windowWidth, setWindowWidth] = useState(400);
  const [preset, setPreset] = useState('default');
  const [view, setView] = useState('axial');
  const [playing, setPlaying] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [is3D, setIs3D] = useState(false);
  const [volumeData, setVolumeData] = useState(null);

  useEffect(() => {
    const size = 128;
    const depth = 100;
    const data = new Float32Array(size * size * depth);
    
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = z * size * size + y * size + x;
          const cx = size / 2, cy = size / 2, cz = depth / 2;
          const dx = x - cx, dy = y - cy, dz = z - cz;
          
          const skullDist = Math.sqrt((dx/50)**2 + (dy/55)**2 + (dz/40)**2);
          if (skullDist < 1 && skullDist > 0.85) {
            data[idx] = 800 + Math.random() * 400;
          } else if (skullDist < 0.85) {
            data[idx] = 30 + Math.random() * 20;
            const ventDist = Math.sqrt((dx/15)**2 + (dy/10)**2 + ((dz+5)/20)**2);
            if (ventDist < 1) data[idx] = 0 + Math.random() * 10;
            const lesionDist = Math.sqrt((dx-20)**2 + (dy+10)**2 + (dz-5)**2);
            if (lesionDist < 12) data[idx] = 60 + Math.random() * 20;
          } else {
            data[idx] = -1000 + Math.random() * 50;
          }
        }
      }
    }
    setVolumeData({ data, width: size, height: size, depth });
  }, []);

  const presets = {
    default: { center: 40, width: 400, name: 'Default', icon: Layers },
    brain: { center: 40, width: 80, name: 'Brain', icon: Brain },
    bone: { center: 400, width: 1500, name: 'Bone', icon: Bone },
    soft: { center: 50, width: 350, name: 'Soft Tissue', icon: Heart },
  };

  const applyPreset = (key) => {
    setPreset(key);
    setWindowCenter(presets[key].center);
    setWindowWidth(presets[key].width);
  };

  useEffect(() => {
    if (!volumeData || !canvasRef.current || is3D) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { data, width, height, depth } = volumeData;
    
    canvas.width = width;
    canvas.height = height;
    
    const imageData = ctx.createImageData(width, height);
    const sliceIdx = Math.floor((slice / 100) * (depth - 1));
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value;
        if (view === 'axial') {
          value = data[sliceIdx * width * height + y * width + x];
        } else if (view === 'coronal') {
          const yIdx = Math.floor((slice / 100) * (height - 1));
          value = data[y * width * height + yIdx * width + x];
        } else {
          const xIdx = Math.floor((slice / 100) * (width - 1));
          value = data[y * width * height + x * width + xIdx];
        }
        
        let intensity = ((value - (windowCenter - windowWidth/2)) / windowWidth) * 255;
        intensity = Math.max(0, Math.min(255, intensity));
        
        const idx = (y * width + x) * 4;
        imageData.data[idx] = intensity;
        imageData.data[idx + 1] = intensity;
        imageData.data[idx + 2] = intensity;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [volumeData, slice, windowCenter, windowWidth, view, is3D]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setSlice(s => s >= 100 ? 0 : s + 1);
    }, 100);
    return () => clearInterval(interval);
  }, [playing]);

  useEffect(() => {
    if (!is3D || !volumeData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { data, width, height, depth } = volumeData;
    
    canvas.width = width;
    canvas.height = height;
    
    const imageData = ctx.createImageData(width, height);
    const cosX = Math.cos(rotation.x * Math.PI / 180);
    const sinX = Math.sin(rotation.x * Math.PI / 180);
    const cosY = Math.cos(rotation.y * Math.PI / 180);
    const sinY = Math.sin(rotation.y * Math.PI / 180);
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        let maxVal = -2000;
        for (let t = 0; t < depth; t++) {
          let x = px - width/2, y = py - height/2, z = t - depth/2;
          const x1 = x * cosY - z * sinY;
          const z1 = x * sinY + z * cosY;
          const y1 = y * cosX - z1 * sinX;
          const z2 = y * sinX + z1 * cosX;
          const sx = Math.floor(x1 + width/2);
          const sy = Math.floor(y1 + height/2);
          const sz = Math.floor(z2 + depth/2);
          if (sx >= 0 && sx < width && sy >= 0 && sy < height && sz >= 0 && sz < depth) {
            const val = data[sz * width * height + sy * width + sx];
            if (val > maxVal) maxVal = val;
          }
        }
        let intensity = ((maxVal - (windowCenter - windowWidth/2)) / windowWidth) * 255;
        intensity = Math.max(0, Math.min(255, intensity));
        const idx = (py * width + px) * 4;
        imageData.data[idx] = intensity;
        imageData.data[idx + 1] = intensity;
        imageData.data[idx + 2] = intensity;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [is3D, rotation, windowCenter, windowWidth, volumeData]);

  const handleMouseDrag = (e) => {
    if (!is3D || e.buttons !== 1) return;
    setRotation(r => ({ x: r.x + e.movementY * 0.5, y: r.y + e.movementX * 0.5 }));
  };

  const toggle3D = (enabled) => {
    setIs3D(enabled);
    if (enabled) {
      setPreset('bone');
      setWindowCenter(400);
      setWindowWidth(1500);
    } else {
      setPreset('default');
      setWindowCenter(40);
      setWindowWidth(400);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Layers size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">DICOM 3D Viewer</h1>
            <p className="text-xs text-slate-400">Medical Imaging Visualization</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Demo: Synthetic Brain CT</span>
          <button className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm flex items-center gap-2">
            <Upload size={14} /> Load DICOM
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <button onClick={() => { toggle3D(false); setView('axial'); }} className={`px-3 py-1.5 rounded-lg text-sm ${!is3D && view === 'axial' ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Axial</button>
                <button onClick={() => { toggle3D(false); setView('coronal'); }} className={`px-3 py-1.5 rounded-lg text-sm ${!is3D && view === 'coronal' ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Coronal</button>
                <button onClick={() => { toggle3D(false); setView('sagittal'); }} className={`px-3 py-1.5 rounded-lg text-sm ${!is3D && view === 'sagittal' ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Sagittal</button>
                <button onClick={() => toggle3D(true)} className={`px-3 py-1.5 rounded-lg text-sm ${is3D ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>3D MIP</button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Crosshair size={14} />
                <span>Slice: {Math.floor((slice / 100) * 99) + 1}/100</span>
              </div>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ height: '400px' }}>
              <canvas ref={canvasRef} onMouseMove={handleMouseDrag} className="cursor-crosshair" style={{ transform: `scale(${zoom})`, imageRendering: 'pixelated' }} />
              {is3D && <div className="absolute bottom-3 left-3 text-xs text-slate-400 bg-black/50 px-2 py-1 rounded">Drag to rotate • MIP Rendering</div>}
            </div>

            {!is3D && (
              <div className="mt-4 flex items-center gap-3">
                <button onClick={() => setSlice(s => Math.max(0, s - 1))} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600"><ChevronLeft size={16} /></button>
                <button onClick={() => setPlaying(!playing)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600">{playing ? <Pause size={16} /> : <Play size={16} />}</button>
                <input type="range" min="0" max="100" value={slice} onChange={(e) => setSlice(Number(e.target.value))} className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                <button onClick={() => setSlice(s => Math.min(100, s + 1))} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600"><ChevronRight size={16} /></button>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-slate-400">Zoom:</span>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600"><ZoomOut size={14} /></button>
              <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600"><ZoomIn size={14} /></button>
              <button onClick={() => { setZoom(1); setRotation({ x: 0, y: 0 }); }} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 ml-2"><RotateCcw size={14} /></button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Contrast size={16} className="text-violet-400" />Window Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presets).map(([key, { name, icon: Icon }]) => (
                <button key={key} onClick={() => applyPreset(key)} className={`p-2 rounded-lg text-xs flex flex-col items-center gap-1 ${preset === key ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                  <Icon size={16} />{name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Sun size={16} className="text-violet-400" />Window / Level</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Window Center</span><span>{windowCenter} HU</span></div>
                <input type="range" min="-1000" max="1000" value={windowCenter} onChange={(e) => setWindowCenter(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Window Width</span><span>{windowWidth} HU</span></div>
                <input type="range" min="1" max="2000" value={windowWidth} onChange={(e) => setWindowWidth(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3">Study Information</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Modality</span><span>CT</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Dimensions</span><span>128 × 128 × 100</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Slice Thickness</span><span>2.5 mm</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Body Part</span><span>Head</span></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 border border-violet-700/30 rounded-xl p-4">
            <h3 className="text-sm font-medium text-violet-300 mb-2">DICOM Standard</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Digital Imaging and Communications in Medicine (DICOM) is the international standard for medical images.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
