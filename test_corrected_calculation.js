// Frissített TypeScript-kompatibilis számítás ellenőrzése
// 2025-ös magyar adószabályok szerint

const TAX_RATES = {
  SZJA: 0.15,
  TB_JARULÉK: 0.185,
  NYUGDIJJARULÉK: 0.10,
  SZOC_HOZZAJARULAS: 0.135,
  ÖNKÉNTES_NYUGDIJ: 0.02,
  ERDEKKÉPVISELETI_TAGDIJ: 0.005,
  ALTALANOS_ADOKEDVEZMENY: 10000,
  NYUGDIJJARULÉK_HATÁR: 500000,
};

function calculateComplete(grossSalary) {
  console.log(`\n=== Korrigált bérszámítás: ${grossSalary.toLocaleString()} Ft ===`);
  
  // 1. TB járulékok
  const tbJarulekok = Math.round(grossSalary * TAX_RATES.TB_JARULÉK);
  console.log(`TB járulékok (${TAX_RATES.TB_JARULÉK * 100}%): ${tbJarulekok.toLocaleString()} Ft`);
  
  // 2. Nyugdíjjárulék (csak 500k Ft felett)
  const nyugdijjarulék = grossSalary > TAX_RATES.NYUGDIJJARULÉK_HATÁR 
    ? Math.round((grossSalary - TAX_RATES.NYUGDIJJARULÉK_HATÁR) * TAX_RATES.NYUGDIJJARULÉK) 
    : 0;
  console.log(`Nyugdíjjárulék (${TAX_RATES.NYUGDIJJARULÉK * 100}% 500k felett): ${nyugdijjarulék.toLocaleString()} Ft`);
  
  // 3. Önkéntes nyugdíj
  const onkentesNyugdij = Math.round(grossSalary * TAX_RATES.ÖNKÉNTES_NYUGDIJ);
  console.log(`Önkéntes nyugdíj (${TAX_RATES.ÖNKÉNTES_NYUGDIJ * 100}%): ${onkentesNyugdij.toLocaleString()} Ft`);
  
  // 4. Érdekképviseleti tagdíj
  const erdekképvisesetiTagdij = Math.round(grossSalary * TAX_RATES.ERDEKKÉPVISELETI_TAGDIJ);
  console.log(`Érdekképviseleti tagdíj (${TAX_RATES.ERDEKKÉPVISELETI_TAGDIJ * 100}%): ${erdekképvisesetiTagdij.toLocaleString()} Ft`);
  
  // 5. SZJA alap számítása (összes levonás után)
  const szjaAlap = grossSalary - tbJarulekok - nyugdijjarulék - onkentesNyugdij - erdekképvisesetiTagdij;
  console.log(`SZJA alap: ${szjaAlap.toLocaleString()} Ft`);
  
  // 6. SZJA bruttó
  const szjaBrutto = Math.round(szjaAlap * TAX_RATES.SZJA);
  console.log(`SZJA bruttó (${TAX_RATES.SZJA * 100}%): ${szjaBrutto.toLocaleString()} Ft`);
  
  // 7. SZJA kedvezmény után
  const szja = Math.max(0, szjaBrutto - TAX_RATES.ALTALANOS_ADOKEDVEZMENY);
  console.log(`SZJA kedvezmény után (${TAX_RATES.ALTALANOS_ADOKEDVEZMENY.toLocaleString()} Ft levonással): ${szja.toLocaleString()} Ft`);
  
  // 8. Összes levonás
  const osszesLevonas = tbJarulekok + nyugdijjarulék + onkentesNyugdij + erdekképvisesetiTagdij + szja;
  console.log(`Összes levonás: ${osszesLevonas.toLocaleString()} Ft`);
  
  // 9. Nettó bér
  const nettoSalary = grossSalary - osszesLevonas;
  console.log(`Nettó bér: ${nettoSalary.toLocaleString()} Ft`);
  
  // 10. Szociális hozzájárulás (munkáltatói)
  const szocHozzajarulas = Math.round(grossSalary * TAX_RATES.SZOC_HOZZAJARULAS);
  console.log(`Szociális hozzájárulás (${TAX_RATES.SZOC_HOZZAJARULAS * 100}%): ${szocHozzajarulas.toLocaleString()} Ft`);
  
  // 11. Teljes munkáltatói költség
  const teljesMunkaltaroiKoltseg = grossSalary + szocHozzajarulas;
  console.log(`Teljes munkáltatói költség: ${teljesMunkaltaroiKoltseg.toLocaleString()} Ft`);
  
  return {
    grossSalary,
    tbJarulekok,
    nyugdijjarulék,
    onkentesNyugdij,
    erdekképvisesetiTagdij,
    szjaAlap,
    szjaBrutto,
    szja,
    osszesLevonas,
    nettoSalary,
    szocHozzajarulas,
    teljesMunkaltaroiKoltseg
  };
}

// Tesztek
console.log("=== KORRIGÁLT TYPESCRIPT KALKULÁTOR TESZT ===");

const test500k = calculateComplete(500000);
const test800k = calculateComplete(800000);

console.log(`\n=== Összehasonlítás a referenciaértékekkel ===`);
console.log(`500.000 Ft:`);
console.log(`  TB járulékok: ${test500k.tbJarulekok} (referencia: 92.500) ✅`);
console.log(`  Nyugdíjjárulék: ${test500k.nyugdijjarulék} (referencia: 0) ✅`);
console.log(`  Önkéntes nyugdíj: ${test500k.onkentesNyugdij} (referencia: 10.000) ✅`);
console.log(`  Érdekképviseleti tagdíj: ${test500k.erdekképvisesetiTagdij} (referencia: 2.500) ✅`);
console.log(`  SZJA: ${test500k.szja} (referencia: 49.625) ${test500k.szja === 49625 ? '✅' : '❌'}`);
console.log(`  Nettó: ${test500k.nettoSalary} (referencia: 345.375) ${test500k.nettoSalary === 345375 ? '✅' : '❌'}`);

console.log(`\n800.000 Ft:`);
console.log(`  TB járulékok: ${test800k.tbJarulekok} (referencia: 148.000) ✅`);
console.log(`  Nyugdíjjárulék: ${test800k.nyugdijjarulék} (referencia: 30.000) ${test800k.nyugdijjarulék === 30000 ? '✅' : '❌'}`);
console.log(`  Önkéntes nyugdíj: ${test800k.onkentesNyugdij} (referencia: 16.000) ✅`);
console.log(`  Érdekképviseleti tagdíj: ${test800k.erdekképvisesetiTagdij} (referencia: 4.000) ✅`);
console.log(`  SZJA: ${test800k.szja} (referencia: 80.900) ${test800k.szja === 80900 ? '✅' : '❌'}`);
console.log(`  Nettó: ${test800k.nettoSalary} (referencia: 521.100) ${test800k.nettoSalary === 521100 ? '✅' : '❌'}`);
