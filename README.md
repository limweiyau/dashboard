# DB Studio

A powerful native desktop application for data visualization and dashboard creation with AI-powered insights.

## Features

- **Project Management**: Create and manage multiple data visualization projects
- **Data Import**: Support for CSV, JSON, Excel (.xlsx, .xls) files with automatic type detection
- **Industry-Standard Charts**: Bar, line, pie, scatter, and area charts with full customization
- **Interactive Dashboards**: Drag-and-drop dashboard builder with resizable charts
- **AI Integration**: Powered by Google Gemini API for data insights and chart suggestions
- **Native Performance**: Built with Electron for cross-platform desktop experience

## Quick Start

To download dependencies and run the application, simply use:

```bash
npm start
```

This single command will:
1. Install all dependencies (`npm install`)
2. Build the application (`npm run build`)
3. Launch DB Studio (`npm run electron`)

## Development

For development with hot reload:

```bash
npm run dev
```

## Supported Data Formats

- **CSV**: Comma-separated values with automatic type detection
- **JSON**: JavaScript Object Notation (arrays or objects)
- **Excel**: .xlsx and .xls files (first sheet will be imported)

## AI Features

DB Studio integrates with Google Gemini API to provide:
- Intelligent chart type suggestions based on your data
- Automated data insights and trend analysis
- Data quality observations
- Visualization recommendations

### Setting up Gemini API

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Open Settings in DB Studio
3. Enter your API key and test the connection
4. Enjoy AI-powered insights!

## System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB free space
- **Internet**: Required for AI features only

## Architecture

- **Frontend**: React 18 with TypeScript
- **Backend**: Electron with Node.js
- **Charts**: Chart.js with react-chartjs-2
- **Data Processing**: Papa Parse, SheetJS
- **AI Integration**: Google Generative AI SDK

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── main.ts        # Application entry point
│   └── preload.ts     # IPC bridge
└── renderer/          # React renderer process
    ├── components/    # React components
    ├── types/         # TypeScript definitions
    └── utils/         # Utility functions
```

## Build for Production

```bash
npm run package
```

This will create platform-specific installers in the `build/` directory.

## Data Privacy

- All data processing happens locally on your device
- API keys are stored securely in your local application data
- No user data is transmitted to our servers
- Charts and dashboards are saved locally in JSON format

## Troubleshooting

### Application Won't Start
- Ensure Node.js 16+ is installed
- Try running `npm install` manually first
- Check for port conflicts if running development mode

### Charts Not Displaying
- Verify your data has been imported correctly
- Check that required columns are selected for chart axes
- Ensure data types are compatible with selected chart type

### AI Features Not Working
- Verify your Gemini API key is correct
- Test the API connection in Settings
- Check your internet connection
- Ensure you have API quota remaining

## License

MIT License - see LICENSE file for details

## Contributing

This is a demonstration project. For production use, consider:
- Adding comprehensive error handling
- Implementing data validation
- Adding more chart types and customization options
- Creating automated tests
- Adding export functionality for charts and dashboards