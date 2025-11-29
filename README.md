# DICOM 3D Medical Imaging Viewer

### 🔗 [Live Demo](https://dicom-3d-viewer.vercel.app/)

A web-based medical imaging viewer that renders DICOM data in 2D slices and 3D volume projections. Built for radiologists, medical students, and healthcare developers exploring diagnostic imaging visualization.

## Why This Project

Medical imaging is the backbone of modern diagnostics — CT, MRI, and PET scans generate thousands of DICOM files daily. Yet most viewing software is desktop-only, expensive, or difficult to integrate. This project demonstrates web-based medical imaging that runs anywhere, on any device.

## Features

- **Multi-Planar Reconstruction** — View axial, coronal, and sagittal planes
- **3D Volume Rendering** — Maximum Intensity Projection (MIP) with rotation
- **Window/Level Presets** — Brain, bone, and soft tissue visualization
- **Interactive Controls** — Slice scrolling, zoom, auto-play through volume
- **Real-time Rendering** — Pure JavaScript canvas rendering, no plugins required
- **DICOM Metadata Display** — Study information panel

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 |
| Rendering | HTML5 Canvas, Custom Volume Renderer |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Standard | DICOM (Digital Imaging and Communications in Medicine) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                           │
├─────────────────────────────────────────────────────────────┤
│  ViewSelector  │  Canvas Renderer  │  Controls  │  Presets  │
└───────┬────────┴────────┬──────────┴─────┬──────┴───────────┘
        │                 │                │
        ▼                 ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Volume Processing                         │
│  • Slice extraction     • Window/level transform            │
│  • MPR reconstruction   • MIP ray marching                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   3D Volume Data                            │
│            128 × 128 × 100 voxel array                      │
└─────────────────────────────────────────────────────────────┘
```

## Imaging Concepts Implemented

| Concept | Description |
|---------|-------------|
| **Hounsfield Units (HU)** | CT density scale: Air (-1000), Water (0), Bone (+1000) |
| **Window/Level** | Contrast adjustment to visualize specific tissue densities |
| **Multi-Planar Reconstruction** | Viewing volume from different anatomical planes |
| **Maximum Intensity Projection** | 3D rendering showing highest density along each ray |

## Window Presets

| Preset | Window Center | Window Width | Use Case |
|--------|---------------|--------------|----------|
| Default | 40 HU | 400 HU | General viewing |
| Brain | 40 HU | 80 HU | Gray/white matter differentiation |
| Bone | 400 HU | 1500 HU | Skeletal structures |
| Soft Tissue | 50 HU | 350 HU | Organs and muscles |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/mohammadkhalaf262002-blip/dicom-3d-viewer.git
cd dicom-3d-viewer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage

1. Open `http://localhost:5173` in your browser
2. Use view buttons to switch between Axial, Coronal, Sagittal, and 3D MIP
3. Scroll through slices with the slider or play button
4. Adjust window presets to visualize different tissue types
5. In 3D mode, drag to rotate the volume

## Project Structure

```
src/
├── components/
│   └── DICOMViewer.jsx    # Main viewer with all rendering logic
├── main.jsx               # React entry point
├── App.jsx                # App wrapper
└── index.css              # Tailwind styles
```

## Roadmap

- [ ] **DICOM File Parser** — Load real .dcm files using dcmjs
- [ ] **Transfer Syntax Support** — Handle compressed DICOM formats
- [ ] **Measurement Tools** — Distance, area, and angle measurements
- [ ] **Annotation System** — Add markers and notes to images
- [ ] **Volume Rendering** — Ray casting with transfer functions
- [ ] **Segmentation Overlay** — Display AI-generated masks
- [ ] **PACS Integration** — Connect to hospital imaging archives

## Medical Imaging Standards Reference

- [DICOM Standard](https://www.dicomstandard.org/)
- [Hounsfield Scale](https://radiopaedia.org/articles/hounsfield-unit)
- [Windowing (Radiology)](https://radiopaedia.org/articles/windowing-ct)
- [OHIF Viewer](https://ohif.org/) — Open-source reference implementation

## Disclaimer

This project is for educational and demonstration purposes only. It is not intended for clinical diagnosis or medical decision-making. Always use certified medical imaging software for clinical applications.

## License

MIT License — see [LICENSE](LICENSE) for details.

## Author

**Mohammad Khalaf** — Biomedical Engineer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mohammad-khalaf-b80273261/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohammadkhalaf262002-blip)

---

*Built to demonstrate medical imaging visualization and DICOM processing skills.*
