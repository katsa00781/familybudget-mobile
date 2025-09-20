// Test the corrected salary calculation
import { SalaryCalculator } from './lib/salaryCalculator.js';
import { SalaryCalculationInput } from './types/salary.js';

function testCorrectedCalculation() {
  console.log('\n=== JAVÍTOTT BÉRKALKULÁCIÓ TESZT ===');
  
  const testCases = [300000, 500000, 800000, 1500000];
  
  testCases.forEach(alapber => {
    console.log(`\n=== Bérkalkuláció teszt: ${alapber.toLocaleString('hu-HU')} Ft ===`);
    
    const input = {
      alapber,
      ledolgozott_napok: 22,
      ledolgozott_orak: 176
    };
    
    const result = SalaryCalculator.calculateComplete(input);
    
    console.log(`Bruttó bér: ${result.brutto_ber.toLocaleString('hu-HU')} Ft`);
    console.log(`TB járulék: ${result.tb_jarulék.toLocaleString('hu-HU')} Ft`);
    console.log(`Nyugdíjjárulék: ${result.nyugdijjarulék.toLocaleString('hu-HU')} Ft`);
    console.log(`Önkéntes nyugdíj: ${result.onkentes_nyugdij.toLocaleString('hu-HU')} Ft`);
    console.log(`Érdekképviseleti tagdíj: ${result.erdekKepv_tagdij.toLocaleString('hu-HU')} Ft`);
    console.log(`SZJA: ${result.szja.toLocaleString('hu-HU')} Ft`);
    console.log(`Nettó bér: ${result.netto_ber.toLocaleString('hu-HU')} Ft`);
    console.log(`Nettó/bruttó arány: ${((result.netto_ber / result.brutto_ber) * 100).toFixed(1)}%`);
    console.log(`Munkáltatói költség: ${result.teljes_munkaltaroi_koltseg.toLocaleString('hu-HU')} Ft`);
  });
}

testCorrectedCalculation();
