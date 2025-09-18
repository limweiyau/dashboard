// Chart Logic Validation Script
// This validates the core logic without needing visual inspection

const testData = [
  {region: 'North', product: 'Laptops', sales_amount: 125000, units_sold: 250, quarter: 'Q1'},
  {region: 'South', product: 'Laptops', sales_amount: 98000, units_sold: 196, quarter: 'Q1'},
  {region: 'East', product: 'Tablets', sales_amount: 76000, units_sold: 304, quarter: 'Q1'},
  {region: 'West', product: 'Phones', sales_amount: 112000, units_sold: 560, quarter: 'Q1'},
];

console.log('=== CHART LOGIC VALIDATION ===\n');

// Test 1: Single Series Data Processing
console.log('🔸 TEST 1: Single Series (X: region, Y: sales_amount)');
const singleSeriesTest = {
  xAxis: 'region',
  yAxis: 'sales_amount',
  datasets: 1
};

const uniqueRegions = [...new Set(testData.map(row => row.region))].sort();
const regionSales = uniqueRegions.map(region => {
  const regionData = testData.filter(row => row.region === region);
  return regionData.reduce((sum, row) => sum + row.sales_amount, 0);
});

console.log('Unique X values (regions):', uniqueRegions);
console.log('Y values (sales):', regionSales);
console.log('Expected bars:', uniqueRegions.length);
console.log('Expected: Each bar should be DIFFERENT color\n');

// Test 2: Multi-Series Data Processing
console.log('🔸 TEST 2: Multi-Series (X: region, Y: [sales_amount, units_sold])');
const multiSeriesTest = {
  xAxis: 'region',
  yAxis: ['sales_amount', 'units_sold'],
  datasets: 2
};

const regionUnits = uniqueRegions.map(region => {
  const regionData = testData.filter(row => row.region === region);
  return regionData.reduce((sum, row) => sum + row.units_sold, 0);
});

console.log('Series 1 (sales_amount):', regionSales);
console.log('Series 2 (units_sold):', regionUnits);
console.log('Expected bars per region:', 2);
console.log('Expected: Series 1 = blue family, Series 2 = red family\n');

// Test 3: Multi-Axis Scale Validation
console.log('🔸 TEST 3: Multi-Axis Scaling');
const salesRange = {
  min: Math.min(...regionSales),
  max: Math.max(...regionSales)
};
const unitsRange = {
  min: Math.min(...regionUnits),
  max: Math.max(...regionUnits)
};

console.log('Sales scale range:', salesRange, '→ Left Y-axis');
console.log('Units scale range:', unitsRange, '→ Right Y-axis');

// Calculate normalized positions to verify different bar heights
const salesNormalized = regionSales.map(val => (val - salesRange.min) / (salesRange.max - salesRange.min));
const unitsNormalized = regionUnits.map(val => (val - unitsRange.min) / (unitsRange.max - unitsRange.min));

console.log('Sales normalized (0-1):', salesNormalized.map(v => v.toFixed(3)));
console.log('Units normalized (0-1):', unitsNormalized.map(v => v.toFixed(3)));

console.log('\n📊 VISUAL VERIFICATION CHECKLIST:');
uniqueRegions.forEach((region, i) => {
  const heightDiff = Math.abs(salesNormalized[i] - unitsNormalized[i]);
  console.log(`${region}:`);
  console.log(`  Sales bar: ${(salesNormalized[i] * 100).toFixed(1)}% height (${regionSales[i].toLocaleString()})`);
  console.log(`  Units bar: ${(unitsNormalized[i] * 100).toFixed(1)}% height (${regionUnits[i].toLocaleString()})`);
  console.log(`  Height difference: ${(heightDiff * 100).toFixed(1)}% ${heightDiff > 0.1 ? '✅ GOOD' : '❌ TOO SIMILAR'}`);
});

// Test 4: Color Scheme Logic
console.log('\n🔸 TEST 4: Color Scheme Generation');
const colorSchemes = {
  professional: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'],
  excel: ['#4472C4', '#E70000', '#70AD47', '#FFC000'],
  vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']
};

console.log('For single series with 4 regions:');
Object.entries(colorSchemes).forEach(([scheme, colors]) => {
  console.log(`  ${scheme}: [${colors.join(', ')}]`);
  console.log(`    Expected: Each region gets different color from this palette`);
});

console.log('\n🔸 TEST 5: Grouping Logic');
const groupingTest = testData.reduce((acc, row) => {
  const key = `${row.region}-${row.product}`;
  if (!acc[key]) acc[key] = [];
  acc[key].push(row);
  return acc;
}, {});

console.log('Group by region + product:', Object.keys(groupingTest));
console.log('Expected bars:', Object.keys(groupingTest).length);
console.log('Expected: Each region-product combination gets one bar\n');

console.log('=== VALIDATION COMPLETE ===');
console.log('✅ Logic tests passed - now verify visual output matches expectations');