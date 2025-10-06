# DB Studio - High-Level Architecture Overview

## What is DB Studio?

DB Studio is a desktop application for data visualization and reporting. Users import data files (CSV, Excel, JSON), create interactive charts, and generate professional PDF reports with AI-powered insights.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         DB STUDIO                               │
│                    Desktop Application                          │
│                  (Electron + React + D3.js)                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
          ┌──────────────┐ ┌────────┐ ┌─────────┐
          │ Data Import  │ │ Charts │ │ Reports │
          │  CSV/Excel   │ │  D3.js │ │   PDF   │
          └──────────────┘ └────────┘ └─────────┘
                    │           │           │
                    └───────────┼───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   AI Insights         │
                    │   (Google Gemini)     │
                    └───────────────────────┘
```

## Core Architecture

### Desktop Framework: Electron

```
┌──────────────────────────────────────────────────────────┐
│                      Electron App                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Main Process (Node.js)         Renderer Process         │
│  ┌────────────────────┐          ┌──────────────────┐    │
│  │ • File System      │◄───IPC──►│ • React UI       │    │
│  │ • Native Dialogs   │          │ • Chart Rendering│    │
│  │ • Settings Storage │          │ • User Interface │    │
│  └────────────────────┘          └──────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Why Electron?**
- Cross-platform: Works on Windows, macOS, Linux
- Native features: File system access, dialogs
- Web technologies: Use React, HTML, CSS
- Privacy: All data stays local

### Frontend: React + TypeScript

```
┌──────────────────────────────────────────────────────────┐
│                    React Application                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  SimpleDashboard (Main Component)                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  State:                                            │  │
│  │  • Project data                                    │  │
│  │  • Charts configuration                            │  │
│  │  • UI state                                        │  │
│  │                                                    │  │
│  │  Components:                                       │  │
│  │  ├─ FileUploadModal     (Import data)              │  │
│  │  ├─ ChartBuilder        (Create charts)            │  │
│  │  ├─ ChartRenderer       (Display charts)           │  │
│  │  ├─ ExportModal         (PDF reports)              │  │
│  │  └─ SettingsModal       (API config)               │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Why React?**
- Component-based: Modular, reusable UI pieces
- State management: Centralized data flow
- TypeScript: Type safety, fewer bugs

## Key Features & Architecture

### 1. Data Import

```
User File (CSV/Excel/JSON)
         │
         ▼
   File Reader
   ├─ CSV → Papa Parse
   ├─ Excel → SheetJS
   └─ JSON → Native parser
         │
         ▼
   Auto-detect types
   (numbers, strings, dates)
         │
         ▼
   Store in React state
```

**Technologies:**
- Papa Parse: CSV parsing
- SheetJS (xlsx): Excel files
- Native JSON parser

### 2. Chart Creation

```
User selects:
├─ Chart type (Bar/Line/Pie/Scatter/Area)
├─ Data columns (X-axis, Y-axis)
└─ Styling (colors, labels, trends)
         │
         ▼
   ChartBuilder validates config
         │
         ▼
   ChartRenderer creates SVG with D3.js
         │
         ▼
   Interactive chart displayed
```

**Technologies:**
- D3.js v7: Low-level SVG drawing
- Custom renderers for each chart type
- CSS-in-JS for styling

**Why D3.js?**
- Full control over rendering
- High-quality output for PDF export
- Interactive features (tooltips, hover)

### 3. AI Integration

```
User clicks "Analyze Chart"
         │
         ▼
   Extract chart data + configuration
         │
         ▼
   Send to Google Gemini API
   (Pattern detection, insights)
         │
         ▼
   Receive AI-generated insights
         │
         ▼
   Display analysis text
   Store with chart for reports
```

**Technologies:**
- Google Generative AI SDK
- Gemini model

**Privacy:**
- API key stored locally (encrypted)
- Only chart data sent to AI (opt-in)
- No tracking or data collection

### 4. PDF Export

```
User configures report:
├─ Select charts
├─ Title, date, branding
├─ Include AI analysis?
└─ Executive summary
         │
         ▼
   Render preview pages (HTML)
   ├─ Table of contents
   ├─ Executive summary
   └─ Chart pages (one per chart)
         │
         ▼
   Capture each page:
   ├─ html2canvas → PNG (3x scale)
   └─ High quality, no compression
         │
         ▼
   jsPDF combines into multi-page PDF
         │
         ▼
   Save to file system
```

**Technologies:**
- html2canvas: HTML → Image
- jsPDF: Image → PDF
- PNG format (lossless quality)

**Quality optimizations:**
- 3x rendering scale for crisp output
- Filter removal for clear charts
- Proper sizing calculations

## Data Flow

```
┌────────────────────────────────────────────────────────────┐
│                      User Actions                          │
└────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │ Import Data  │ │  Create  │ │    Export    │
    │              │ │  Charts  │ │     PDF      │
    └──────┬───────┘ └─────┬────┘ └──────┬───────┘
           │               │              │
           ▼               ▼              ▼
    ┌──────────────────────────────────────────────┐
    │         React State (SimpleDashboard)        │
    │                                              │
    │  • parsedData: any[]                         │
    │  • charts: Chart[]                           │
    │  • exportConfig: ExportConfig                │
    │                                              │
    └──────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │   Render     │ │   Save   │ │  Generate    │
    │   Charts     │ │  Project │ │     PDF      │
    └──────────────┘ └──────────┘ └──────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  Local Files   │
                   │  (JSON/PDF)    │
                   └────────────────┘
```

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop Framework** | Electron 25 | Cross-platform app, native features |
| **UI Framework** | React 18 | Component-based UI |
| **Language** | TypeScript 5 | Type-safe JavaScript |
| **Charts** | D3.js v7 | Data visualization, SVG rendering |
| **Data Import** | Papa Parse, SheetJS | Parse CSV, Excel files |
| **AI** | Google Gemini API | Chart analysis, insights |
| **PDF Export** | jsPDF, html2canvas | Generate reports |
| **Build** | Webpack 5 | Bundle app for production |

## Security & Privacy

```
┌─────────────────────────────────────────────────────────┐
│                   Privacy-First Design                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ All data processed locally                           │
│  ✓ No cloud uploads or tracking                         │
│  ✓ API keys stored encrypted (electron-store)           │
│  ✓ Projects saved as local JSON files                   │
│  ✓ AI features optional (user controls)                 │
│                                                         │
│  Security Measures:                                     │
│  • contextIsolation enabled                             │
│  • nodeIntegration disabled                             │
│  • Secure IPC channels only                             │
│  • No eval() or unsafe code execution                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Project Structure (Simplified)

```
db-studio/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # App entry, window management
│   │   └── preload.ts           # Secure IPC bridge
│   │
│   └── renderer/                # React frontend
│       ├── components/
│       │   ├── SimpleDashboard.tsx      # Main app logic
│       │   ├── charts/
│       │   │   ├── ChartBuilder.tsx     # Chart creation UI
│       │   │   └── ChartRenderer.tsx    # D3.js rendering
│       │   ├── export/
│       │   │   └── ExportConfigurationModal.tsx  # PDF config
│       │   ├── FileUploadModal.tsx      # Data import
│       │   └── SettingsModal.tsx        # API settings
│       ├── types/
│       │   └── index.ts         # TypeScript definitions
│       └── index.tsx            # React entry point
│
├── package.json                 # Dependencies
├── webpack.config.js            # Build configuration
└── README.md                    # Getting started
```

## How It Works: End-to-End Example

### Scenario: User creates a sales report

```
1. Import Data
   User: Click "Import Data" → Select sales.csv
   App:  Parse CSV → Detect columns → Store in state
   ✓ Data ready

2. Create Chart
   User: Click "New Chart" → Select "Bar Chart"
         X-axis: Month, Y-axis: Revenue
   App:  Validate config → Render with D3.js
   ✓ Chart displayed

3. Get AI Insights
   User: Click "Analyze Chart"
   App:  Send data to Gemini → Receive insights
   ✓ "Revenue shows 15% upward trend..."

4. Generate Report
   User: Click "Export Report" → Configure title
         Include analysis → Click "Generate"
   App:  Render preview → Capture as PNG → Build PDF
   ✓ sales-report-2025-01-15.pdf saved

5. Save Project
   App:  Auto-save project as JSON file
   ✓ Can reload later with all charts
```

## Performance Considerations

### Fast Rendering
- D3.js for efficient SVG updates
- React re-renders only what changed
- Debounced updates during chart editing

### Memory Management
- Large datasets? Load incrementally (future)
- Charts rendered on-demand
- PDF export processes pages sequentially

### Build Size
- Webpack bundles and minifies code
- Tree-shaking removes unused code
- Current bundle: ~1.44 MB

## Future Enhancements

1. **Database Connections**
   - Connect directly to SQL/NoSQL databases
   - Live data refresh

2. **Collaboration**
   - Share projects with team
   - Real-time co-editing

3. **Plugin System**
   - Custom chart types
   - User-defined data transforms

4. **Cloud Sync** (Optional)
   - Backup projects to cloud
   - Sync across devices

5. **Advanced Analytics**
   - Built-in statistical functions
   - Regression analysis, correlation

## Getting Started

### For Users
```bash
# Install and run
npm start
```

### For Developers
```bash
# Development mode (hot reload)
npm run dev

# Build for production
npm run package
```

## Summary

DB Studio is a **privacy-first**, **desktop** application for **data visualization** and **reporting**. It combines:

- **Electron** for cross-platform desktop functionality
- **React** for a modern, responsive UI
- **D3.js** for high-quality, customizable charts
- **Google Gemini** for optional AI insights
- **jsPDF** for professional report generation

All data stays local, processing happens on your device, and you have full control over what gets shared with AI services.

---

**Architecture Principle:** Keep it simple, keep it local, keep it powerful.
