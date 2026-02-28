// Test to verify viewAll parameter handling

const testCases = [
  { viewAll: 'true', userRole: 'citizen', expected: 'no filter' },
  { viewAll: 'false', userRole: 'citizen', expected: 'add filter' },
  { viewAll: undefined, userRole: 'citizen', expected: 'add filter' },
  { viewAll: null, userRole: 'citizen', expected: 'add filter' },
  { viewAll: true, userRole: 'citizen', expected: 'add filter' }, // boolean true, not string
];

testCases.forEach(({ viewAll, userRole, expected }) => {
  const shouldFilter = userRole === 'citizen' && viewAll !== 'true';
  const result = shouldFilter ? 'add filter' : 'no filter';
  const pass = result === expected ? '✓' : '✗';
  console.log(`${pass} viewAll=${JSON.stringify(viewAll)}, role=${userRole} => ${result} (expected: ${expected})`);
});
