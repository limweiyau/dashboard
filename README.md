# ⬛ DB Studio

A powerful native desktop application for data visualization and dashboard creation with AI-powered insights.

![DB Studio](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- **📊 Professional Charts**: Bar, line, pie, scatter, area charts with full customization
- **🎛️ Interactive Dashboards**: Drag-and-drop builder with real-time editing
- **📄 Smart Import**: CSV, JSON, Excel files with automatic type detection
- **🤖 AI Integration**: Google Gemini-powered insights and chart suggestions
- **📱 Export Ready**: Generate professional PDF reports with branding
- **🔒 Privacy First**: All data processing happens locally

## 🚀 Quick Start

**One command to install and run:**

```bash
npm start
```

That's it! This command will:
1. ✅ Install all dependencies
2. 🔨 Build the application
3. 🚀 Launch DB Studio

## 🛠️ Development

For development with hot reload:

```bash
npm run dev
```

## 📋 Requirements

- **Node.js**: 16+ (tested with 24.7.0)
- **OS**: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space

## 🔑 AI Setup (Optional)

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Open Settings → Enter API key → Test connection
3. Enjoy AI-powered insights!

## 📊 Supported Data Formats

| Format | Support | Notes |
|--------|---------|-------|
| CSV    | ✅ Full | Automatic type detection |
| JSON   | ✅ Full | Arrays or objects |
| Excel  | ✅ Full | .xlsx, .xls (first sheet) |

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Desktop**: Electron 25
- **Charts**: D3.js + Chart.js
- **Data**: Papa Parse + SheetJS
- **AI**: Google Generative AI

## 📦 Build for Production

```bash
npm run package
```

Creates installers in `build/` directory.

## 🔧 Troubleshooting

### App Won't Start
```bash
# Try manual installation first
npm install
npm run build
npm run electron
```

### Charts Not Displaying
- ✅ Verify data import was successful
- ✅ Check column selections for axes
- ✅ Ensure compatible data types

### AI Features Not Working
- ✅ Verify API key in Settings
- ✅ Test connection
- ✅ Check internet connectivity

## 🏛️ Project Structure

```
src/
├── main/                 # Electron main process
│   ├── main.ts          # App entry point
│   └── preload.ts       # IPC bridge
└── renderer/            # React frontend
    ├── components/      # UI components
    ├── types/          # TypeScript definitions
    └── utils/          # Helper functions
```

## 🔐 Privacy & Security

- 🔒 **Local Processing**: All data stays on your device
- 🔑 **Secure Storage**: API keys stored in local app data
- 🚫 **No Tracking**: Zero data collection or transmission
- 💾 **Local Save**: Projects saved as JSON files locally

## 📄 License

MIT License - Feel free to use, modify, and distribute.

## 🎯 Key Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Install + Build + Run |
| `npm run dev` | Development mode |
| `npm run build` | Build only |
| `npm run package` | Create installer |
| `npm run clean` | Clean build files |

---

**Ready to visualize your data?** Run `npm start` and get started in seconds! 🚀