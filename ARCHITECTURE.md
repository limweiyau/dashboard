# DB Studio - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DB STUDIO DESKTOP APP                             │
│                          (Electron + React + TypeScript)                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              MAIN PROCESS (Node.js)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  main.ts                                                                    │
│  ├─ BrowserWindow Management                                                │
│  ├─ IPC Communication Handler                                               │
│  ├─ File System Operations (Save/Load Projects)                             │
│  ├─ Native Menu & Dialogs                                                   │
│  └─ Application Lifecycle                                                   │
│                                                                             │
│  preload.ts                                                                 │
│  └─ Secure IPC Bridge (contextBridge)                                       │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                    IPC Communication (Secure)
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                        RENDERER PROCESS (Chromium)                          │
│                           React 18 + TypeScript                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             RENDERER PROCESS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      SimpleDashboard.tsx                           │     │
│  │                    (Main Application State)                        │     │
│  ├────────────────────────────────────────────────────────────────────┤     │ 
│  │  • Project Management (name, charts, data)                         │     │
│  │  • Chart CRUD Operations                                           │     │
│  │  • Data Import/Export                                              │     │
│  │  • Modal State Management                                          │     │
│  │  • AI Integration Orchestration                                    │     │
│  │  • PDF Export Pipeline                                             │     │
│  └──┬──────────────────┬──────────────────┬─────────────────┬─────────┘     │
│     │                  │                  │                 │               │
│     ▼                  ▼                  ▼                 ▼               │
│  ┌─────────┐      ┌─────────┐      ┌──────────┐     ┌──────────┐            │
│  │ Charts  │      │  Data   │      │   AI     │     │  Export  │            │
│  │ System  │      │ Import  │      │ Services │     │  System  │            │
│  └─────────┘      └─────────┘      └──────────┘     └──────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Charts System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CHARTS SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                       ChartBuilder.tsx                             │     │
│  │                   (Interactive Chart Creator)                      │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │  • Chart Type Selection (Bar, Line, Pie, Scatter, Area)            │     │
│  │  • Column Mapping (X-axis, Y-axis, Categories)                     │     │
│  │  • Style Configuration (Colors, Gradients, Borders)                │     │
│  │  • Advanced Features (Trend Lines, Animations)                     │     │
│  │  • Real-time Preview                                               │     │
│  └──────────────────────────────┬─────────────────────────────────────┘     │
│                                 │                                           │
│                                 │ Chart Config                              │
│                                 ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      ChartRenderer.tsx                             │     │
│  │                  (D3.js Rendering Engine)                          │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │                                                                    │     │
│  │  Bar Charts                Line Charts              Pie Charts     │     │
│  │  ├─ Vertical/Horizontal    ├─ Multiple Series      ├─ Donut        │     │
│  │  ├─ Gradients              ├─ Area Fill            ├─ Labels       │     │
│  │  ├─ Rounded Corners        ├─ Trend Lines          └─ Legends      │     │
│  │  └─ Hover Effects          ├─ Dot Markers                          │     │
│  │                            └─ Smooth Curves                        │     │
│  │                                                                    │     │
│  │  Scatter Charts            Area Charts                             │     │
│  │  ├─ Bubble Sizes           ├─ Stacked                              │     │
│  │  ├─ Color Coding           ├─ Gradients                            │     │
│  │  └─ Tooltips               └─ Legends                              │     │
│  │                                                                    │     │
│  │  Common Features:                                                  │     │
│  │  • SVG-based rendering with D3.js v7                               │     │
│  │  • Responsive scaling                                              │     │
│  │  • Smooth animations (enter/update/exit)                           │     │
│  │  • Interactive tooltips                                            │     │
│  │  • Axis labels and legends                                         │     │
│  │  • Export-ready (high DPI)                                         │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DATA IMPORT                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ User File (CSV/JSON/Excel)                                         │     │
│  └───────────────────────┬────────────────────────────────────────────┘     │
│                          │                                                  │
│                          ▼                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │              FileUploadModal.tsx                                   │     │
│  │  ├─ Papa Parse (CSV)                                               │     │
│  │  ├─ SheetJS/xlsx (Excel)                                           │     │
│  │  └─ JSON.parse (JSON)                                              │     │
│  └───────────────────────┬────────────────────────────────────────────┘     │
│                          │                                                  │
│                          ▼                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │           Data Type Detection & Validation                         │     │
│  │  • Auto-detect numeric vs string columns                           │     │
│  │  • Parse dates                                                     │     │
│  │  • Handle missing values                                           │     │
│  └───────────────────────┬────────────────────────────────────────────┘     │
│                          │                                                  │
│                          ▼                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │              In-Memory Data Store                                  │     │
│  │            (React State - SimpleDashboard)                         │     │
│  │  • Raw data arrays                                                 │     │
│  │  • Column metadata                                                 │     │
│  │  • Chart configurations                                            │     │
│  └───────────────────────┬────────────────────────────────────────────┘     │
│                          │                                                  │
│            ┌─────────────┼─────────────┐                                    │
│            │             │             │                                    │
│            ▼             ▼             ▼                                    │
│  ┌──────────────┐ ┌──────────┐ ┌────────────┐                               │
│  │   Charts     │ │    AI    │ │   Export   │                               │
│  │  Rendering   │ │ Analysis │ │    PDF     │                               │
│  └──────────────┘ └──────────┘ └────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## AI Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI SERVICES LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    SimpleDashboard.tsx                             │     │
│  │                   (AI Orchestration)                               │     │
│  └──────────────┬─────────────────────┬───────────────────────────────┘     │
│                 │                     │                                     │
│                 ▼                     ▼                                     │
│  ┌───────────────────────┐  ┌────────────────────────┐                      │
│  │  Chart Analysis       │  │  Executive Summary     │                      │
│  │  handleAnalyzeChart() │  │  generateAISummary()   │                      │
│  └──────────┬────────────┘  └────────┬───────────────┘                      │
│             │                        │                                      │
│             │  API Request           │  API Request                         │
│             │  (Chart Data +         │  (All Charts +                       │
│             │   Configuration)       │   Data Overview)                     │
│             │                        │                                      │
│             └────────────┬───────────┘                                      │
│                          │                                                  │
│                          ▼                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │              Google Generative AI (Gemini)                         │     │ 
│  │                External API Service                                │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │  • Pattern Detection                                               │     │
│  │  • Trend Analysis                                                  │     │
│  │  • Insight Generation                                              │     │
│  │  • Summary Creation                                                │     │
│  │  • Key Highlights Extraction                                       │     │
│  └────────────────────────┬───────────────────────────────────────────┘     │
│                           │                                                 │
│                           ▼                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    AI Response Processing                          │     │
│  │  • Parse structured insights                                       │     │
│  │  • Extract key metrics                                             │     │
│  │  • Format for display                                              │     │
│  └────────────────────────┬───────────────────────────────────────────┘     │
│                           │                                                 │
│                           ▼                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │              Store in Chart/Project State                          │     │
│  │  • chart.analysis (per-chart insights)                             │     │
│  │  • exportConfig.executiveSummary (report overview)                 │     │
│  │  • exportConfig.executiveHighlights (key metrics)                  │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    SettingsModal.tsx                               │     │
│  │                   (API Configuration)                              │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │  • API Key Storage (Electron Store)                                │     │
│  │  • Connection Testing                                              │     │
│  │  • Model Selection                                                 │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## PDF Export Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PDF EXPORT PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. EXPORT CONFIGURATION                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │         ExportConfigurationModal.tsx                               │     │
│  │         (User Configuration & Preview)                             │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │  • Select Charts for Export                                        │     │
│  │  • Report Title & Date                                             │     │
│  │  • Page Size (A4/Letter)                                           │     │
│  │  • Orientation (Portrait/Landscape)                                │     │
│  │  • Primary Color Theme                                             │     │
│  │  • Include AI Analysis Toggle                                      │     │
│  │  • Executive Summary Editor (Rich Text)                            │     │
│  │  • Key Highlights (up to 6 metrics)                                │     │
│  └───────────────────────┬────────────────────────────────────────────┘     │
│                          │                                                  │
│                          ▼                                                  │
│  2. PREVIEW GENERATION                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │            Live Preview Rendering                                  │     │
│  │       (data-report-page="true" elements)                           │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │  Pages Generated:                                                  │     │
│  │  ├─ Cover Page (if enabled)                                        │     │
│  │  ├─ Table of Contents                                              │     │
│  │  ├─ Executive Summary (if generated)                               │     │
│  │  └─ Chart Pages (one per chart)                                    │     │
│  │      ├─ Chart Title & Type Badge                                   │     │
│  │      ├─ Rendered Chart (D3.js SVG)                                 │     │
│  │      └─ AI Analysis (if included)                                  │     │
│  │                                                                    │     │
│  │  Preview Features:                                                 │     │
│  │  • Inline editing of all text elements                             │     │
│  │  • Real-time chart rendering                                       │     │
│  │  • Accurate page dimensions (780x1103 for A4)                      │     │
│  │  • CSS transform scale for viewport fit                            │     │
│  └───────────────────────┬────────────────────────────────────────────┘     │
│                          │                                                  │
│                          ▼                                                  │
│  3. PDF GENERATION                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │         SimpleDashboard.handleExportGenerate()                     │     │
│  │               (PDF Generation Pipeline)                            │     │
│  ├────────────────────────────────────────────────────────────────────┤     │
│  │                                                                    │     │
│  │  Step 1: Query Preview Elements                                    │     │
│  │  └─ document.querySelectorAll('[data-report-page="true"]')         │     │
│  │                                                                    │     │
│  │  Step 2: For Each Page Element                                     │     │
│  │  ├─ Get actual dimensions (offsetWidth/Height)                     │     │
│  │  ├─ Calculate render scale (3x minimum)                            │     │
│  │  │   scale = Math.max(3, devicePixelRatio * 2)                     │     │
│  │  │                                                                 │     │
│  │  ├─ Capture with html2canvas                                       │     │
│  │  │   ├─ High-quality settings:                                     │     │
│  │  │   │   • scale: 3x                                               │     │
│  │  │   │   • backgroundColor: #ffffff                              │     │
│  │  │   │   • foreignObjectRendering: false                           │     │
│  │  │   │   • useCORS: true                                           │     │
│  │  │   │                                                             │     │
│  │  │   └─ onclone callback:                                          │     │
│  │  │       • Remove CSS filters (except drop-shadow)                 │     │
│  │  │       • Remove backdrop-filters                                 │     │
│  │  │       • Ensure full opacity                                     │     │
│  │  │       • Remove scale transforms                                 │     │
│  │  │                                                                 │     │
│  │  ├─ Convert to PNG (lossless)                                      │     │
│  │  │   canvas.toDataURL('image/png', 1.0)                            │     │
│  │  │                                                                 │     │
│  │  └─ Add to PDF                                                     │     │
│  │      ├─ Calculate fit ratio                                        │     │
│  │      ├─ Center on page                                             │     │
│  │      └─ pdf.addImage(PNG, 'NONE' compression)                      │     │
│  │                                                                    │     │
│  │  Step 3: Save PDF                                                  │     │
│  │  └─ pdf.save(`${reportTitle}-${date}.pdf`)                         │     │
│  │                                                                    │     │
│  │  Technologies:                                                     │     │
│  │  • jsPDF - PDF document creation                                   │     │
│  │  • html2canvas - DOM to canvas rendering                           │     │
│  │  • PNG format - Lossless quality                                   │     │
│  │  • 3x scaling - Crisp output on all displays                       │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  Key Features:                                                              │
│  • No blurry charts (PNG + 3x scale + filter removal)                       │
│  • Accurate sizing (uses offsetWidth/Height, not scaled dimensions)         │
│  • Editable preview (all changes reflected in final PDF)                    │
│  • Multi-page support with table of contents                                │
│  • Professional formatting with brand colors                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## State Management Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION STATE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SimpleDashboard.tsx (Main State Container)                                 │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                                                                    │     │
│  │  Project State                                                     │     │
│  │  ├─ projectName: string                                            │     │
│  │  ├─ charts: Chart[]                                                │     │
│  │  ├─ parsedData: any[]                                              │     │
│  │  ├─ columns: string[]                                              │     │
│  │  └─ columnTypes: Record<string, 'number' | 'string'>               │     │
│  │                                                                    │     │
│  │  Chart State                                                       │     │
│  │  Chart = {                                                         │     │
│  │    id: string                                                      │     │ 
│  │    name: string                                                    │     │
│  │    type: 'bar' | 'line' | 'pie' | 'scatter' | 'area'               │     │
│  │    config: {                                                       │     │
│  │      xColumn: string                                               │     │
│  │      yColumns: string[]                                            │     │
│  │      colors: string[]                                              │     │
│  │      showLegend: boolean                                           │     │
│  │      showTrendLine: boolean                                        │     │
│  │      animation: boolean                                            │     │
│  │      // ... more config                                            │     │
│  │    }                                                               │     │
│  │    analysis?: string  // AI-generated insights                     │     │
│  │    thumbnail?: { dataUrl: string, timestamp: number }              │     │
│  │  }                                                                 │     │
│  │                                                                    │     │
│  │  UI State                                                          │     │
│  │  ├─ showFileUpload: boolean                                        │     │
│  │  ├─ showChartBuilder: boolean                                      │     │
│  │  ├─ showSettings: boolean                                          │     │
│  │  ├─ editingChartId: string | null                                  │     │
│  │  ├─ exportStage: 'selection' | 'config' | null                     │     │
│  │  └─ isCapturingExportAssets: boolean                               │     │
│  │                                                                    │     │
│  │  Export State                                                      │     │
│  │  exportConfig = {                                                  │     │
│  │    reportTitle: string                                             │     │
│  │    reportDate: string                                              │     │
│  │    pageSize: 'A4' | 'Letter'                                       │     │
│  │    orientation: 'portrait' | 'landscape'                           │     │
│  │    primaryColor: string                                            │     │
│  │    includeAnalysis: boolean                                        │     │
│  │    executiveSummary?: string  // HTML content                      │     │
│  │    executiveHighlights?: Array<{                                   │     │
│  │      metric: string                                                │     │
│  │      label: string                                                 │     │
│  │    }>                                                              │     │
│  │  }                                                                 │     │
│  │                                                                    │     │
│  │  AI State                                                          │     │
│  │  ├─ geminiApiKey: string | null                                    │     │
│  │  ├─ isAnalyzing: boolean                                           │     │
│  │  └─ isGeneratingSummary: boolean                                   │     │
│  │                                                                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  Persistence:                                                               │
│  • IPC to Main Process → File System (JSON files)                           │
│  • Auto-save on changes                                                     │
│  • API keys stored in electron-store (encrypted)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## IPC Communication Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INTER-PROCESS COMMUNICATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Renderer Process                   Main Process                            │
│  ┌──────────────────┐              ┌──────────────────┐                     │
│  │                  │    IPC        │                  │                    │
│  │  React App       │◄─────────────►│  Electron Main   │                    │
│  │  (UI Logic)      │   (Secure)    │  (System Access) │                    │
│  │                  │               │                  │                    │
│  └──────────────────┘               └──────────────────┘                    │
│                                                                             │
│  Available IPC Channels:                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                                                                    │     │
│  │  File Operations:                                                  │     │
│  │  • save-project          → Save project JSON to file               │     │
│  │  • load-project          → Load project from file                  │     │
│  │  • export-chart-image    → Save chart as PNG                       │     │
│  │                                                                    │     │
│  │  Settings:                                                         │     │
│  │  • save-api-key          → Store API key securely                  │     │
│  │  • get-api-key           → Retrieve stored API key                 │     │
│  │                                                                    │     │
│  │  System:                                                           │     │
│  │  • show-open-dialog      → Native file picker                      │     │
│  │  • show-save-dialog      → Native save dialog                      │     │
│  │  • get-app-version       → App version info                        │     │
│  │                                                                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  Security:                                                                  │
│  • contextBridge (preload.ts) - Secure API exposure                         │
│  • No direct Node.js access from renderer                                   │
│  • Validated IPC channels only                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack Details

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TECHNOLOGY LAYERS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Runtime & Framework                                                        │
│  ├─ Electron 25.x            Desktop app framework                          │
│  ├─ Node.js 18+              JavaScript runtime                             │
│  └─ Chromium                 Web rendering engine                           │
│                                                                             │
│  Frontend                                                                   │
│  ├─ React 18                 UI library with hooks                          │
│  ├─ TypeScript 5             Type-safe JavaScript                           │
│  └─ CSS-in-JS                Inline styling                                 │
│                                                                             │
│  Data Visualization                                                         │
│  ├─ D3.js v7                 Low-level SVG manipulation                     │
│  │   ├─ d3-scale            Axis scaling                                    │
│  │   ├─ d3-selection        DOM manipulation                                │
│  │   ├─ d3-shape            Path generators                                 │
│  │   ├─ d3-array            Data transforms                                 │
│  │   └─ d3-axis             Axis rendering                                  │
│  └─ Custom renderers         Hand-coded chart types                         │
│                                                                             │
│  Data Processing                                                            │
│  ├─ Papa Parse               CSV parsing                                    │
│  ├─ SheetJS (xlsx)           Excel file handling                            │
│  └─ Native JSON              JSON parsing                                   │
│                                                                             │
│  AI & External Services                                                     │
│  └─ Google Generative AI     Gemini API integration                         │
│                                                                             │
│  PDF Generation                                                             │
│  ├─ jsPDF                    PDF document creation                          │
│  └─ html2canvas              DOM to canvas capture                          │
│                                                                             │
│  Build & Development                                                        │
│  ├─ Webpack 5                Module bundler                                 │
│  ├─ TypeScript Compiler      Type checking & transpilation                  │
│  ├─ ts-loader                TypeScript webpack integration                 │
│  └─ electron-builder         App packaging                                  │
│                                                                             │
│  Storage & Persistence                                                      │
│  ├─ electron-store           Encrypted settings storage                     │
│  └─ File System (fs)         Project save/load                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Component Composition
- Small, focused components with single responsibilities
- Props-based configuration for reusability
- React hooks for state management

### 2. Lift State Up
- Centralized state in SimpleDashboard.tsx
- Child components receive data via props
- State updates via callback props

### 3. IPC Bridge Pattern
- Secure communication via preload.ts
- contextBridge for exposing limited APIs
- No direct Node.js access from renderer

### 4. Pipeline Architecture (PDF Export)
- Clear stages: Configure → Preview → Capture → Generate
- Each stage independent and testable
- Error handling at each step

### 5. Factory Pattern (Chart Rendering)
- Single ChartRenderer component
- Type-based dispatch to specific renderers
- Shared rendering logic and utilities

## Performance Optimizations

### Rendering
- D3.js for efficient SVG manipulation
- CSS transforms for preview scaling (no DOM resize)
- Debounced chart updates on config changes
- Virtual scrolling for large datasets (future)

### PDF Export
- 3x scaling for high DPI without excessive memory
- PNG format with selective compression
- Incremental page capture (not all at once)
- Canvas reuse between captures

### AI Integration
- Debounced API calls
- Loading states to prevent duplicate requests
- Cached results per chart
- Error handling with user feedback

## Security Considerations

### Data Privacy
- All processing local (no cloud uploads)
- Data never sent to external services except AI API (opt-in)
- Projects stored as local JSON files

### API Security
- API keys stored in encrypted electron-store
- Keys never exposed in logs
- Secure IPC for key access

### Electron Security
- contextIsolation enabled
- nodeIntegration disabled in renderer
- Content Security Policy
- Secure IPC channels only

## Future Architecture Enhancements

1. **Plugin System**: Allow custom chart types
2. **Database Integration**: Connect to SQL/NoSQL databases
3. **Collaboration**: Multi-user project editing
4. **Cloud Sync**: Optional cloud backup
5. **Real-time Data**: Live data connections
6. **Custom Themes**: User-defined color schemes
7. **Chart Templates**: Pre-built chart configurations
8. **Advanced Analytics**: Statistical functions built-in
