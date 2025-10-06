# BUG REPORT: Trend Line Configuration Not Persisting

## SEVERITY: HIGH

## ISSUE DESCRIPTION
When editing a saved scatter plot chart that has trend line enabled, the "Show Trend Line" checkbox and all related trend line settings (color, width, style, statistics) are automatically unchecked/reset to defaults, despite being properly saved in the chart configuration.

## ROOT CAUSE
**File:** `/Users/wy/Desktop/dashboard/src/renderer/components/charts/ChartBuilder.tsx`
**Location:** Lines 230-363 (useEffect hook that loads chart configuration for editing)

The `useEffect` hook that loads an existing chart's configuration when editing is **MISSING ALL TREND LINE PROPERTIES**.

The configuration loading code stops at line 343 with basic axis configuration:
```typescript
yAxisMax: config.yAxisMax
```

And then immediately closes the object at line 344, completely omitting the following trend line properties:
- `showTrendLine`
- `trendLineColor`
- `trendLineWidth`
- `trendLineStyle`
- `showTrendLineStats`
- `trendLineStatsOffsetX`
- `trendLineStatsOffsetY`
- `trendLineStatsFontSize`

## EXPECTED BEHAVIOR
When clicking "Edit" on a chart with trend line enabled:
1. The "Show Trend Line" checkbox should be checked
2. The trend line should be visible in the preview
3. All trend line configuration (color, width, style, statistics) should be preserved
4. The statistics box position and appearance settings should be maintained

## ACTUAL BEHAVIOR
When clicking "Edit" on a chart with trend line enabled:
1. The "Show Trend Line" checkbox is UNCHECKED
2. No trend line appears in the preview
3. All trend line settings are reset to defaults
4. User must manually re-enable and reconfigure the entire trend line

## DATA VERIFICATION
The trend line configuration IS being saved correctly to the chart object:
- **Save function:** Lines 881-899 in ChartBuilder.tsx properly spreads `...chartConfig` which includes all trend line properties
- **Render function:** ChartRenderer.tsx correctly renders trend lines when `config.showTrendLine` is truthy
- The bug ONLY affects the loading/editing flow, not the save or display flow

## FIX REQUIRED
Add the missing trend line properties to the `setChartConfig` call in the useEffect hook (after line 343):

```typescript
// Trend line configuration (for scatter plots)
showTrendLine: config.showTrendLine,
trendLineColor: config.trendLineColor,
trendLineWidth: config.trendLineWidth,
trendLineStyle: config.trendLineStyle,
showTrendLineStats: config.showTrendLineStats,
trendLineStatsOffsetX: config.trendLineStatsOffsetX,
trendLineStatsOffsetY: config.trendLineStatsOffsetY,
trendLineStatsFontSize: config.trendLineStatsFontSize,
```

## ADDITIONAL NOTES
- This affects ALL scatter plot charts with trend lines
- The checkbox logic has been correctly fixed to use `!!chartConfig.showTrendLine` (line 3135)
- The renderer has been correctly fixed to check `config.showTrendLine` (line 2103 in ChartRenderer.tsx)
- The ONLY remaining issue is the missing properties in the config loading code

## FILES AFFECTED
1. `/Users/wy/Desktop/dashboard/src/renderer/components/charts/ChartBuilder.tsx` (NEEDS FIX - lines 230-363)
2. `/Users/wy/Desktop/dashboard/src/renderer/components/charts/ChartRenderer.tsx` (Already correct)
3. `/Users/wy/Desktop/dashboard/src/renderer/types/charts.ts` (Already defines all types correctly)

## IMPACT
- **User Experience:** Critical - Users lose all trend line configuration every time they edit a chart
- **Data Loss:** Configuration is saved but not loaded, creating user confusion
- **Workaround:** None - Users must manually reconfigure trend line every edit session
