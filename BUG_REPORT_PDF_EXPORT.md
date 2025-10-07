# Bug Report: PDF Export Quality and Formatting Issues

**Date:** 2025-10-07
**Component:** PDF Export Generation
**File:** `/src/renderer/components/SimpleDashboard.tsx` (handleExportGenerate function)
**Severity:** High - Affects user-facing report quality

---

## Summary

The PDF export functionality has multiple quality and formatting issues that make reports appear unprofessional and difficult to read. Charts appear blurry/foggy, text spacing is incorrect, and layout elements are misaligned.

---

## Bug #1: Charts Appear Blurry/Foggy with Whitish Semi-Transparent Filter

### Description
When a PDF report is generated, all charts appear with a whitish, semi-transparent overlay that makes them look foggy or blurry, as if viewing through frosted glass. The charts lose vibrancy and appear washed out.

### Steps to Reproduce
1. Create a dashboard with multiple charts
2. Go to Export flow
3. Configure report settings
4. Click "Generate Report"
5. Open the generated PDF
6. Observe charts appear with a whitish filter/overlay

### Expected Behavior
- Charts should render crisp and clear in the PDF
- Colors should be vibrant and match the preview exactly
- No whitish overlay or foggy appearance

### Actual Behavior
- Charts have a semi-transparent whitish filter over them
- Colors appear washed out and desaturated
- Overall appearance is blurry/foggy

### Root Cause Analysis
The issue stems from the PDF generation process in `SimpleDashboard.tsx` lines 1629-1678:

1. **Image Format Choice**: Currently using PNG format with high quality (1.0), but the issue may be:
   - html2canvas rendering quality
   - Canvas to image conversion
   - PDF compression settings

2. **Possible Causes**:
   ```typescript
   // Line 1632: Capture scale might not be high enough
   const captureScale = Math.max(3, Math.ceil(deviceScale * 2));

   // Lines 1650-1660: html2canvas options might need adjustment
   canvas = await html2canvas(clone, {
     backgroundColor: '#ffffff',
     scale: captureScale,
     useCORS: true,
     logging: false,
     allowTaint: false,
     removeContainer: false,
     imageTimeout: 0,
     width: clone.offsetWidth,
     height: clone.offsetHeight
   });

   // Line 1665: Image encoding quality
   const imageData = canvas.toDataURL('image/png', 1.0);

   // Line 1678: PDF compression setting
   pdf.addImage(imageData, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'NONE');
   ```

3. **Potential Issues**:
   - The chart rendering in the preview might have CSS transforms or filters that don't translate well to canvas
   - Background colors or opacity settings on chart containers
   - SVG rendering if charts use SVG elements
   - Canvas pixel ratio mismatch

### Technical Details
- The charts in the preview look perfect, so the issue is in the html2canvas → PDF pipeline
- The whitish overlay suggests either:
  - An opacity/alpha channel issue
  - A background color bleeding through
  - Anti-aliasing problems
  - DPI/resolution mismatch causing color interpolation

### Suggested Fixes to Try
1. **Increase capture scale even more**:
   ```typescript
   const captureScale = Math.max(4, Math.ceil(deviceScale * 3));
   ```

2. **Add explicit background handling**:
   ```typescript
   clone.querySelectorAll('*').forEach((el: any) => {
     if (window.getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)') {
       el.style.backgroundColor = 'transparent';
     }
   });
   ```

3. **Try different html2canvas options**:
   ```typescript
   canvas = await html2canvas(clone, {
     backgroundColor: '#ffffff',
     scale: 5,
     useCORS: true,
     logging: true, // Enable to see warnings
     allowTaint: true,
     foreignObjectRendering: true, // Try this
     imageTimeout: 0,
     width: clone.offsetWidth,
     height: clone.offsetHeight,
     onclone: (clonedDoc) => {
       // Remove any filters or transforms
       const charts = clonedDoc.querySelectorAll('[data-chart]');
       charts.forEach(chart => {
         chart.style.filter = 'none';
         chart.style.transform = 'none';
       });
     }
   });
   ```

4. **Investigate chart renderer directly** - Check if charts use Canvas, SVG, or DOM elements
   - Canvas elements: Should render well
   - SVG elements: Might need special handling
   - DOM with CSS: Could have transform/filter issues

---

## Bug #2: Text Spacing Issues ("TableofContents", "ReportOverview")

### Description
In the generated PDF, text that should have spaces appears concatenated:
- "Table of Contents" appears as "TableofContents"
- "Report Overview" appears as "ReportOverview"

### Steps to Reproduce
1. Generate a PDF report
2. Open the PDF
3. Look at the Table of Contents page
4. Look at the Executive Summary page
5. Observe missing spaces in headings

### Expected Behavior
- "Table of Contents" should display with proper spacing
- "Report Overview" should display with proper spacing
- All text should preserve spacing from the preview

### Actual Behavior
- Spaces are missing, text appears concatenated
- "TableofContents"
- "ReportOverview"

### Root Cause
The source code in `ExportConfigurationModal.tsx` has correct spacing:
- Line 554: `Table of Contents` ✓ (correct in code)
- Line 618: `Report Overview` ✓ (correct in code)

This suggests the issue is in PDF rendering, not the source. Possible causes:
1. **Font loading issue** - Font might not be fully loaded when html2canvas captures
2. **Letter-spacing CSS** - Line 550 has `letterSpacing: '0.28em'` which might cause issues
3. **Text rendering in canvas** - Spaces might not render properly in canvas conversion
4. **PDF text encoding** - The PDF library might be stripping spaces

### Technical Investigation Needed
```typescript
// Line 550-555 in ExportConfigurationModal.tsx
<div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.28em', color: primaryColor, fontWeight: 600 }}>
  Contents
</div>
<div style={{ fontSize: '36px', fontWeight: 700, color: '#0f172a', marginTop: '14px' }}>
  Table of Contents  {/* <- Has space in code */}
</div>
```

### Suggested Fixes
1. **Ensure fonts are loaded before capture**:
   ```typescript
   await document.fonts.ready;
   ```

2. **Remove letter-spacing temporarily for capture** or reduce it

3. **Use non-breaking spaces**:
   ```typescript
   Table&nbsp;of&nbsp;Contents
   ```

4. **Add whitespace preservation**:
   ```typescript
   style={{ whiteSpace: 'pre-wrap' }}
   ```

---

## Bug #3: Chart Type Label Misalignment

### Description
The chart type label (e.g., "Bar", "Line", "Pie") below the chart name appears:
- Horizontally off-center
- Vertically misaligned with surrounding elements

### Steps to Reproduce
1. Generate a PDF with charts
2. Look at chart headers
3. Observe the chart type badge/label positioning

### Expected Behavior
- Chart type label should be perfectly centered vertically within its container
- Should align properly with the chart name above it

### Actual Behavior
- Label appears slightly off-center horizontally
- Vertical alignment is inconsistent

### Current Code (Line 773-787)
```typescript
<div style={{
  marginTop: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '10px',
  fontWeight: 600,
  color: '#0f172a',
  background: 'rgba(59, 130, 246, 0.14)',
  borderRadius: '999px',
  padding: '4px 12px'
}}>
  <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: primaryColor }}></span>
  {chart.type || 'Custom Visualization'}
</div>
```

### Potential Issues
- `inline-flex` might not center properly after html2canvas conversion
- The 6px dot indicator might be causing alignment issues
- Padding might render differently in canvas vs browser

### Suggested Fix
```typescript
<div style={{
  marginTop: '6px',
  display: 'flex', // Change from inline-flex
  alignItems: 'center',
  justifyContent: 'flex-start', // Explicit alignment
  gap: '6px', // Increase gap
  fontSize: '10px',
  fontWeight: 600,
  color: '#0f172a',
  background: 'rgba(59, 130, 246, 0.14)',
  borderRadius: '999px',
  padding: '5px 12px', // Adjust padding
  lineHeight: 1, // Force line height
  width: 'fit-content'
}}>
  <span style={{
    width: '6px',
    height: '6px',
    borderRadius: '999px',
    background: primaryColor,
    flexShrink: 0, // Prevent dot from shrinking
    display: 'block'
  }}></span>
  <span>{chart.type || 'Custom Visualization'}</span>
</div>
```

---

## Additional Context

### Environment
- Electron app with webpack
- html2canvas library for DOM → Canvas conversion
- jsPDF library for PDF generation
- Charts rendered using custom ChartRenderer component

### Current PDF Generation Flow
1. Query all `[data-report-page="true"]` elements
2. Clone each page DOM node
3. Use html2canvas to convert to canvas
4. Convert canvas to PNG data URL
5. Add PNG to PDF using jsPDF
6. Save PDF file

### Performance Notes
- Current scale: minimum 3x device pixel ratio
- Canvas capture takes several seconds for multi-page reports
- File sizes can be large with PNG format

---

## Priority Recommendations

1. **CRITICAL**: Fix chart blurriness/whitish filter - this is the most noticeable quality issue
2. **HIGH**: Fix text spacing - makes the report look broken
3. **MEDIUM**: Fix chart type alignment - polish issue but affects professionalism

---

## Files Affected

- `/src/renderer/components/SimpleDashboard.tsx` - PDF generation logic
- `/src/renderer/components/export/ExportConfigurationModal.tsx` - Preview rendering
- Potentially `/src/renderer/components/charts/ChartRenderer.tsx` - Chart rendering

---

## Testing Checklist

After implementing fixes, test:
- [ ] Charts appear clear and vibrant in PDF (no fog/whitish overlay)
- [ ] Text spacing is preserved ("Table of Contents", "Report Overview")
- [ ] Chart type labels are properly aligned
- [ ] Multi-page reports render consistently
- [ ] Different chart types (Bar, Line, Pie) all render well
- [ ] Executive summary renders correctly
- [ ] Both portrait and landscape orientation work
- [ ] Both A4 and Letter page sizes work
- [ ] Large reports don't timeout or crash
- [ ] File sizes are reasonable

---

**Generated:** 2025-10-07
**Status:** Open - Needs Investigation
