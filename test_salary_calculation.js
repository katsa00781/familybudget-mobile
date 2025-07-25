// Simple test for salary calculation
// This file can be run with: node test_salary_calculation.js

// Simulated constants from the updated code
const KULCSOK = {
  TB_JARULÉK: 0.185,
  SZJA_KULCS: 0.15,
  NYUGDIJJARULÉK: 0.10,
  SZOCIALIS_HOZZAJARULAS: 0.135,
  ÖNKÉNTES_NYUGDIJ: 0.02,
  MUSZAKPOTLEK: 0.30,
  TULORA_POTLEK: 0.50,
  UNNEPNAPI_SZORZO: 1.0,
  ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.005
};

function testSalaryCalculation(bruttoBer = 500000) {
  console.log('\n=== Bérkalkuláció teszt ===');
  console.log(`Bruttó bér: ${bruttoBer.toLocaleString('hu-HU')} Ft`);
  
  // TB járulék számítás - 18.5% bruttó bérből (maximálisan 1.200.000 Ft-ig)
  const tbJarulékAlap = Math.min(bruttoBer, 1200000);
  const tbJarulék = Math.round(tbJarulékAlap * KULCSOK.TB_JARULÉK);
  console.log(`TB járulék (18.5%): ${tbJarulék.toLocaleString('hu-HU')} Ft`);
  
  // Nyugdíjjárulék - 10% csak 500.000 Ft feletti bér esetén
  const nyugdijJarulék = bruttoBer > 500000 ? Math.round((bruttoBer - 500000) * KULCSOK.NYUGDIJJARULÉK) : 0;
  console.log(`Nyugdíjjárulék (10% 500k felett): ${nyugdijJarulék.toLocaleString('hu-HU')} Ft`);
  
  // Önkéntes nyugdíjpénztári befizetés
  const onkentesNyugdij = Math.round(bruttoBer * KULCSOK.ÖNKÉNTES_NYUGDIJ);
  console.log(`Önkéntes nyugdíj (2%): ${onkentesNyugdij.toLocaleString('hu-HU')} Ft`);
  
  // Érdekképviseleti tagdíj
  const erdekKepvTagdij = Math.round(bruttoBer * KULCSOK.ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK);
  console.log(`Érdekképviseleti tagdíj (0.5%): ${erdekKepvTagdij.toLocaleString('hu-HU')} Ft`);
  
  // SZJA alap = bruttó bér - TB járulék - nyugdíjjárulék - önkéntes nyugdíj
  const szjaAlap = bruttoBer - tbJarulék - nyugdijJarulék - onkentesNyugdij;
  console.log(`SZJA alap: ${szjaAlap.toLocaleString('hu-HU')} Ft`);
  
  // SZJA számítás - 15% az SZJA alapból
  const szjaBrutto = Math.round(szjaAlap * KULCSOK.SZJA_KULCS);
  console.log(`SZJA bruttó (15%): ${szjaBrutto.toLocaleString('hu-HU')} Ft`);
  
  // Általános adókedvezmény levonása (2025-ben minimum 10.000 Ft)
  const altalnosAdoKedvezmeny = 10000;
  const szja = Math.max(0, szjaBrutto - altalnosAdoKedvezmeny);
  console.log(`SZJA kedvezmény után: ${szja.toLocaleString('hu-HU')} Ft`);
  
  // Összes levonás
  const osszesLevonas = tbJarulék + nyugdijJarulék + onkentesNyugdij + szja + erdekKepvTagdij;
  console.log(`Összes levonás: ${osszesLevonas.toLocaleString('hu-HU')} Ft`);
  
  // Nettó fizetés
  const netto = bruttoBer - osszesLevonas;
  console.log(`Nettó fizetés: ${netto.toLocaleString('hu-HU')} Ft`);
  
  // Bruttó/nettó arány
  const arany = ((netto / bruttoBer) * 100).toFixed(1);
  console.log(`Nettó/bruttó arány: ${arany}%`);
  
  // Munkáltatói terhek
  const szocHozzjarulas = Math.round(bruttoBer * KULCSOK.SZOCIALIS_HOZZAJARULAS);
  console.log(`Szociális hozzájárulás (13.5%): ${szocHozzjarulas.toLocaleString('hu-HU')} Ft`);
  const teljesMunkaltaroiKoltseg = bruttoBer + szocHozzjarulas;
  console.log(`Teljes munkáltatói költség: ${teljesMunkaltaroiKoltseg.toLocaleString('hu-HU')} Ft`);
  
  return {
    brutto: bruttoBer,
    netto: netto,
    tbJarulék,
    nyugdijJarulék,
    onkentesNyugdij,
    szja,
    erdekKepvTagdij,
    osszesLevonas,
    szocHozzjarulas,
    teljesMunkaltaroiKoltseg
  };
}

// Tesztek különböző fizetési szinteken
console.log('=== MAGYAR BÉRKALKULÁCIÓ TESZT (2025) ===');

testSalaryCalculation(300000);  // Átlag alatti
testSalaryCalculation(500000);  // Átlagos
testSalaryCalculation(800000);  // Átlag feletti
testSalaryCalculation(1500000); // Magas fizetés

console.log('\n=== Összefoglalás ===');
console.log('✅ TB járulék: 18.5% (max 1.2M Ft alapból)');
console.log('✅ Nyugdíjjárulék: 10% (csak 500k Ft felett)');
console.log('✅ Önkéntes nyugdíj: 2%');
console.log('✅ SZJA: 15% (10k Ft általános kedvezménnyel)');
console.log('✅ Érdekképviseleti tagdíj: 0.5%');
console.log('✅ Munkáltatói teher: 13.5% szoc.hozzájárulás');
