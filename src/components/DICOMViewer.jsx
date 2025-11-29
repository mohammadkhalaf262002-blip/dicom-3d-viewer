import { useState, useEffect, useRef } from 'react';
import { Layers, RotateCcw, ZoomIn, ZoomOut, Sun, Contrast, Brain, Bone, Heart, Upload, ChevronLeft, ChevronRight, Play, Pause, Crosshair, Box } from 'lucide-react';

export default function DICOMViewer() {
  const canvasRef = useRef(null);
  const [slice, setSlice] = useState(50);
  const [zoom, setZoom] = useState(2);
  const [windowCenter, setWindowCenter] = useState(40);
  const [windowWidth, setWindowWidth] = useState(80);
  const [preset, setPreset] = useState('default');
  const [view, setView] = useState('axial');
  const [playing, setPlaying] = useState(false);
  const [rotation, setRotation] = useState({ x: 25, y: 0 });
  const [is3D, setIs3D] = useState(false);
  const [volumeData, setVolumeData] = useState(null);

  useEffect(() => {
    const size = 128, depth = 100;
    const data = new Float32Array(size * size * depth);
    const cx = size/2, cy = size/2, cz = depth/2;
    
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = z * size * size + y * size + x;
          const dx = x - cx, dy = y - cy, dz = z - cz;
          
          const outerSkull = Math.sqrt((dx/46)**2 + (dy/52)**2 + (dz/36)**2);
          const innerSkull = Math.sqrt((dx/41)**2 + (dy/47)**2 + (dz/31)**2);
          
          data[idx] = -1000;
          
          if (outerSkull <= 1.0 && innerSkull > 1.0) {
            data[idx] = 1000;
            
            // Eye sockets
            const leftEye = Math.sqrt(((dx+14)/12)**2 + ((dy+32)/14)**2 + (dz/10)**2);
            const rightEye = Math.sqrt(((dx-14)/12)**2 + ((dy+32)/14)**2 + (dz/10)**2);
            if (leftEye < 1.0 || rightEye < 1.0) data[idx] = -1000;
            
            // Nasal cavity
            const nasal = Math.sqrt((dx/7)**2 + ((dy+42)/10)**2 + (dz/8)**2);
            if (nasal < 1.0) data[idx] = -1000;
            
            // Mouth
            const mouth = Math.sqrt((dx/18)**2 + ((dy+48)/6)**2 + (dz/10)**2);
            if (mouth < 1.0) data[idx] = -1000;
          }
          
          if (innerSkull <= 1.0) {
            data[idx] = 40 + Math.random() * 10;
            const leftVent = Math.sqrt(((dx+8)/5)**2 + (dy/10)**2 + (dz/8)**2);
            const rightVent = Math.sqrt(((dx-8)/5)**2 + (dy/10)**2 + (dz/8)**2);
            if (leftVent < 1.0 || rightVent < 1.0) data[idx] = 5;
          }
        }
      }
    }
    setVolumeData({ data, width: size, height: size, depth });
  }, []);

  const presets = {
    default: { center: 40, width: 80, name: 'Default', icon: Layers },
    brain: { center: 35, width: 60, name: 'Brain', icon: Brain },
    bone: { center: 500, width: 2000, name: 'Bone', icon: Bone },
    soft: { center: 50, width: 400, name: 'Soft Tissue', icon: Heart },
  };

  const applyPreset = (key) => {
    setPreset(key);
    setWindowCenter(presets[key].center);
    setWindowWidth(presets[key].width);
  };

  // 2D rendering
  useEffect(() => {
    if (!volumeData || !canvasRef.current || is3D) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { data, width, height, depth } = volumeData;
    canvas.width = width; canvas.height = height;
    
    const imageData = ctx.createImageData(width, height);
    const sliceIdx = Math.floor((slice/100) * (depth-1));
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value;
        if (view === 'axial') value = data[sliceIdx * width * height + y * width + x];
        else if (view === 'coronal') { const yIdx = Math.floor((slice/100) * (height-1)); value = data[y * width * height + yIdx * width + x]; }
        else { const xIdx = Math.floor((slice/100) * (width-1)); value = data[y * width * height + x * width + xIdx]; }
        
        let intensity = ((value - (windowCenter - windowWidth/2)) / windowWidth) * 255;
        intensity = Math.max(0, Math.min(255, intensity));
        const idx = (y * width + x) * 4;
        imageData.data[idx] = imageData.data[idx+1] = imageData.data[idx+2] = intensity;
        imageData.data[idx+3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [volumeData, slice, windowCenter, windowWidth, view, is3D]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => setSlice(s => s >= 100 ? 0 : s + 1), 100);
    return () => clearInterval(interval);
  }, [playing]);

  // 3D surface rendering
  useEffect(() => {
    if (!is3D || !volumeData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { data, width, height, depth } = volumeData;
    canvas.width = width; canvas.height = height;
    
    const imageData = ctx.createImageData(width, height);
    const radX = rotation.x * Math.PI / 180, radY = rotation.y * Math.PI / 180;
    const cosX = Math.cos(radX), sinX = Math.sin(radX), cosY = Math.cos(radY), sinY = Math.sin(radY);
    const lightDir = { x: -0.5, y: -0.6, z: -0.6 };
    const lm = Math.sqrt(lightDir.x**2 + lightDir.y**2 + lightDir.z**2);
    lightDir.x /= lm; lightDir.y /= lm; lightDir.z /= lm;
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        let hitDepth = -1, normal = { x: 0, y: 0, z: 1 };
        
        for (let t = 0; t < 150; t++) {
          let x = px - width/2, y = py - height/2, z = t - 75;
          const x1 = x * cosY + z * sinY, z1 = -x * sinY + z * cosY;
          const y1 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
          const sx = Math.floor(x1 + width/2), sy = Math.floor(y1 + height/2), sz = Math.floor(z2 + depth/2);
          
          if (sx >= 1 && sx < width-1 && sy >= 1 && sy < height-1 && sz >= 1 && sz < depth-1) {
            const val = data[sz * width * height + sy * width + sx];
            if (val > 400 && hitDepth < 0) {
              hitDepth = t;
              const gx = data[sz * width * height + sy * width + (sx+1)] - data[sz * width * height + sy * width + (sx-1)];
              const gy = data[sz * width * height + (sy+1) * width + sx] - data[sz * width * height + (sy-1) * width + sx];
              const gz = data[(sz+1) * width * height + sy * width + sx] - data[(sz-1) * width * height + sy * width + sx];
              const mag = Math.sqrt(gx*gx + gy*gy + gz*gz) || 1;
              normal = { x: gx/mag, y: gy/mag, z: gz/mag };
              break;
            }
          }
        }
        
        let intensity = 0;
        if (hitDepth >= 0) {
          const diffuse = Math.max(0, -(normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z));
          intensity = Math.min(255, (0.3 + 0.7 * diffuse) * 255 * Math.max(0.5, 1 - hitDepth/200));
        }
        
        const idx = (py * width + px) * 4;
        imageData.data[idx] = intensity; imageData.data[idx+1] = intensity * 0.95; imageData.data[idx+2] = intensity * 0.85; imageData.data[idx+3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [is3D, rotation, volumeData]);

  const handleMouseDrag = (e) => {
    if (!is3D || e.buttons !== 1) return;
    setRotation(r => ({ x: Math.max(-60, Math.min(60, r.x + e.movementY * 0.5)), y: r.y - e.movementX * 0.5 }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Layers size={20} /></div>
          <div><h1 className="text-lg font-semibold">DICOM 3D Viewer</h1><p className="text-xs text-slate-400">Medical Imaging Visualization</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Demo: Synthetic Brain CT</span>
          <button className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm flex items-center gap-2"><Upload size={14} /> Load DICOM</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <button onClick={() => setIs3D(false) || setView('axial')} className={`px-3 py-1.5 rounded-lg text-sm ${!is3D && view === 'axial' ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Axial</button>
                <button onClick={() => setIs3D(false) || setView('coronal')} className={`px-3 py-1.5 rounded-lg text-sm ${!is3D && view === 'coronal' ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Coronal</button>
                <button onClick={() => setIs3D(false) || setView('sagittal')} className={`px-3 py-1.5 rounded-lg text-sm ${!is3D && view === 'sagittal' ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>Sagittal</button>
                <button onClick={() => setIs3D(true)} className={`px-3 py-1.5 rounded-lg text-sm ${is3D ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}>3D Skull</button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400"><Crosshair size={14} /><span>{is3D ? 'Surface Render' : `Slice: ${Math.floor((slice/100)*99)+1}/100`}</span></div>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ height: '400px' }}>
              <canvas ref={canvasRef} onMouseMove={handleMouseDrag} className={is3D ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"} style={{ transform: `scale(${zoom})` }} />
              {is3D && <div className="absolute bottom-3 left-3 text-xs text-slate-400 bg-black/50 px-2 py-1 rounded">Drag to rotate</div>}
              {!is3D && <div className="absolute bottom-3 left-3 text-xs text-slate-400 bg-black/50 px-2 py-1 rounded">{view.charAt(0).toUpperCase() + view.slice(1)} View</div>}
            </div>

            {!is3D && (
              <div className="mt-4 flex items-center gap-3">
                <button onClick={() => setSlice(s => Math.max(0, s-1))} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600"><ChevronLeft size={16} /></button>
                <button onClick={() => setPlaying(!playing)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600">{playing ? <Pause size={16} /> : <Play size={16} />}</button>
                <input type="range" min="0" max="100" value={slice} onChange={(e) => setSlice(Number(e.target.value))} className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                <button onClick={() => setSlice(s => Math.min(100, s+1))} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600"><ChevronRight size={16} /></button>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-slate-400">Zoom:</span>
              <button onClick={() => setZoom(z => Math.max(0.5, z-0.25))} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600"><ZoomOut size={14} /></button>
              <span className="text-sm w-12 text-center">{Math.round(zoom*100)}%</span>
              <button onClick={() => setZoom(z => Math.min(4, z+0.25))} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600"><ZoomIn size={14} /></button>
              <button onClick={() => { setZoom(2); setRotation({ x: 25, y: 0 }); }} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 ml-2"><RotateCcw size={14} /></button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {!is3D && (
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Contrast size={16} className="text-violet-400" />Window Presets</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(presets).map(([key, { name, icon: Icon }]) => (
                  <button key={key} onClick={() => applyPreset(key)} className={`p-2 rounded-lg text-xs flex flex-col items-center gap-1 ${preset === key ? 'bg-violet-600' : 'bg-slate-700 hover:bg-slate-600'}`}><Icon size={16} />{name}</button>
                ))}
              </div>
            </div>
          )}

          {!is3D && (
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Sun size={16} className="text-violet-400" />Window / Level</h3>
              <div className="space-y-3">
                <div><div className="flex justify-between text-xs text-slate-400 mb-1"><span>Center</span><span>{windowCenter} HU</span></div><input type="range" min="-1000" max="1000" value={windowCenter} onChange={(e) => setWindowCenter(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500" /></div>
                <div><div className="flex justify-between text-xs text-slate-400 mb-1"><span>Width</span><span>{windowWidth} HU</span></div><input type="range" min="1" max="3000" value={windowWidth} onChange={(e) => setWindowWidth(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500" /></div>
              </div>
            </div>
          )}

          {is3D && (
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Box size={16} className="text-violet-400" />3D Rendering</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Method</span><span>Surface</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Threshold</span><span>400 HU</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Rotation X</span><span>{Math.round(rotation.x)}°</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Rotation Y</span><span>{Math.round(rotation.y)}°</span></div>
              </div>
            </div>
          )}

          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3">Study Info</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Modality</span><span>CT</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Size</span><span>128×128×100</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Thickness</span><span>2.5 mm</span></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 border border-violet-700/30 rounded-xl p-4">
            <h3 className="text-sm font-medium text-violet-300 mb-2">Anatomy</h3>
            <ul className="text-xs text-slate-400 space-y-1"><li>• Cranium</li><li>• Eye sockets</li><li>• Nasal cavity</li><li>• Brain tissue</li></ul>
          </div>
        </div>
      </div>
    </div>
  );
}
