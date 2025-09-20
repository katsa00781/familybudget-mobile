// Test a specific salary calculation scenario using the updated calculator
const { SalaryCalculator } = require('./lib/salaryCalculator');

// Test with 500,000 HUF base salary
const testInput = {
  alapber: 500000,
  ledolgozott_napok: 22,
  ledolgozott_orak: 176,
  tulora_orak: 0,
  muszakpotlek_orak: 0,
  unnepnapi_orak: 0,
  formaruha_kompenzacio: 0,
  csaladi_adokedvezmeny: 0
};

console.log('\n=== TypeScript Kalkulátor Teszt ===');
console.log('Input:', testInput);

try {
  const result = SalaryCalculator.calculateComplete(testInput);
  console.log('\nEredmény:');
  console.log(`Bruttó bér: ${result.brutto_ber.toLocaleString('hu-HU')} Ft`);
  console.log(`TB járulék: ${result.tb_jarulék.toLocaleString('hu-HU')} Ft`);
  console.log(`Nyugdíjjárulék: ${result.nyugdijjarulék.toLocaleString('hu-HU')} Ft`);
  console.log(`Önkéntes nyugdíj: ${result.onkentes_nyugdij.toLocaleString('hu-HU')} Ft`);
  console.log(`Érdekképviseleti tagdíj: ${result.erdekKepv_tagdij.toLocaleString('hu-HU')} Ft`);
  console.log(`SZJA: ${result.szja.toLocaleString('hu-HU')} Ft`);
  console.log(`Nettó bér: ${result.netto_ber.toLocaleString('hu-HU')} Ft`);
  
  // Compare with expected results
  const expected = {
    brutto_ber: 500000,
    tb_jarulék: 92500,
    nyugdijjarulék: 0,
    onkentes_nyugdij: 10000,
    erdekKepv_tagdij: 2500,
    szja: 49625,
    netto_ber: 345375
  };
  
  console.log('\n=== Összehasonlítás ===');
  Object.keys(expected).forEach(key => {
    const calculated = result[key];
    const expectedValue = expected[key];
    const match = calculated === expectedValue ? '✅' : '❌';
    console.log(`${key}: ${match} Számított: ${calculated}, Várt: ${expectedValue}`);
  });
  
} catch (error) {
  console.error('Hiba a számítás során:', error);
}
