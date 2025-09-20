// Direkt számítás a TypeScript kalkulátor logikája alapján
// Frissített adatokkal: ÖNKÉNTES_NYUGDIJ: 2%, ERDEKKÉPVISELETI_TAGDIJ: 0.5%

const TAX_RATES = {
  SZJA: 0.15,
  TB_JARULEKOK: 0.185,
  NYUGDIJJARULÉK: 0.10,
  SZOCIÁLIS_HOZZÁJÁRULÁS: 0.135,
  ÖNKÉNTES_NYUGDIJ: 0.02,  // Korrigálva: 2%
  ERDEKKÉPVISELETI_TAGDIJ: 0.005  // Korrigálva: 0.5%
};

function calculateSalary(grossSalary) {
  console.log(`\n=== Bérszámítás: ${grossSalary.toLocaleString()} Ft ===`);
  
  // TB járulékok
  const tbJarulekok = grossSalary * TAX_RATES.TB_JARULEKOK;
  console.log(`TB járulékok (${TAX_RATES.TB_JARULEKOK * 100}%): ${tbJarulekok.toLocaleString()} Ft`);
  
  // Nyugdíjjárulék
  const nyugdijjarulék = grossSalary * TAX_RATES.NYUGDIJJARULÉK;
  console.log(`Nyugdíjjárulék (${TAX_RATES.NYUGDIJJARULÉK * 100}%): ${nyugdijjarulék.toLocaleString()} Ft`);
  
  // Önkéntes nyugdíj
  const onkentesNyugdij = grossSalary * TAX_RATES.ÖNKÉNTES_NYUGDIJ;
  console.log(`Önkéntes nyugdíj (${TAX_RATES.ÖNKÉNTES_NYUGDIJ * 100}%): ${onkentesNyugdij.toLocaleString()} Ft`);
  
  // Érdekképviseleti tagdíj
  const erdekképvisesetiTagdij = grossSalary * TAX_RATES.ERDEKKÉPVISELETI_TAGDIJ;
  console.log(`Érdekképviseleti tagdíj (${TAX_RATES.ERDEKKÉPVISELETI_TAGDIJ * 100}%): ${erdekképvisesetiTagdij.toLocaleString()} Ft`);
  
  // Adóalap
  const adoalap = grossSalary - tbJarulekok - nyugdijjarulék - onkentesNyugdij - erdekképvisesetiTagdij;
  console.log(`Adóalap: ${adoalap.toLocaleString()} Ft`);
  
  // SZJA
  const szja = adoalap * TAX_RATES.SZJA;
  console.log(`SZJA (${TAX_RATES.SZJA * 100}%): ${szja.toLocaleString()} Ft`);
  
  // Nettó bér
  const nettoSalary = adoalap - szja;
  console.log(`Nettó bér: ${nettoSalary.toLocaleString()} Ft`);
  
  return {
    grossSalary,
    tbJarulekok,
    nyugdijjarulék,
    onkentesNyugdij,
    erdekképvisesetiTagdij,
    adoalap,
    szja,
    nettoSalary
  };
}

// Tesztek
const result1 = calculateSalary(500000);
const result2 = calculateSalary(800000);

console.log(`\n=== Összehasonlítás a referenciaértékekkel ===`);
console.log(`500.000 Ft esetén:`);
console.log(`  TB járulékok: ${result1.tbJarulekok} (várható: 92.500)`);
console.log(`  Önkéntes nyugdíj: ${result1.onkentesNyugdij} (várható: 10.000)`);
console.log(`  Érdekképviseleti tagdíj: ${result1.erdekképvisesetiTagdij} (várható: 2.500)`);
console.log(`  SZJA: ${result1.szja} (várható: 49.625)`);
console.log(`  Nettó: ${result1.nettoSalary} (várható: 345.375)`);
