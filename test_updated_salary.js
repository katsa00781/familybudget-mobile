// Frissített bérkalkuláció teszt - helyes értékekkel
const KULCSOK = {
  TB_JARULÉK: 0.185,
  SZJA_KULCS: 0.15,
  NYUGDIJJARULÉK: 0.10,
  SZOCIALIS_HOZZAJARULAS: 0.135,
  ÖNKÉNTES_NYUGDIJ: 0.015, // 1.5% (helyes érték)
  ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.007 // 0.7% (helyes érték)
};

function testUpdatedSalaryCalculation(bruttoBer = 500000) {
  console.log('\n=== FRISSÍTETT Bérkalkuláció teszt ===');
  console.log(`Bruttó bér: ${bruttoBer.toLocaleString('hu-HU')} Ft`);
  
  // TB járulék számítás - 18.5% bruttó bérből (maximálisan 1.200.000 Ft-ig)
  const tbJarulékAlap = Math.min(bruttoBer, 1200000);
  const tbJarulék = Math.round(tbJarulékAlap * KULCSOK.TB_JARULÉK);
  console.log(`TB járulék (18.5%): ${tbJarulék.toLocaleString('hu-HU')} Ft`);
  
  // Nyugdíjjárulék - 10% csak 500.000 Ft feletti bér esetén
  const nyugdijJarulék = bruttoBer > 500000 ? Math.round((bruttoBer - 500000) * KULCSOK.NYUGDIJJARULÉK) : 0;
  console.log(`Nyugdíjjárulék (10% 500k felett): ${nyugdijJarulék.toLocaleString('hu-HU')} Ft`);
  
  // Önkéntes nyugdíjpénztári befizetés - 1.5% (adóalapot csökkenti)
  const onkentesNyugdij = Math.round(bruttoBer * KULCSOK.ÖNKÉNTES_NYUGDIJ);
  console.log(`Önkéntes nyugdíj (1.5%): ${onkentesNyugdij.toLocaleString('hu-HU')} Ft`);
  
  // Érdekképviseleti tagdíj - 0.7% (adóalapot csökkenti)
  const erdekKepvTagdij = Math.round(bruttoBer * KULCSOK.ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK);
  console.log(`Érdekképviseleti tagdíj (0.7%): ${erdekKepvTagdij.toLocaleString('hu-HU')} Ft`);
  
  // SZJA alap = bruttó bér - TB járulék - nyugdíjjárulék - önkéntes nyugdíj - érdekképviseleti tagdíj
  const szjaAlap = bruttoBer - tbJarulék - nyugdijJarulék - onkentesNyugdij - erdekKepvTagdij;
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
  
  return { brutto: bruttoBer, netto: netto, arany: parseFloat(arany) };
}

// Tesztek különböző fizetési szinteken
console.log('=== FRISSÍTETT MAGYAR BÉRKALKULÁCIÓ TESZT (2025) ===');
console.log('✅ Önkéntes nyugdíj: 1.5% (volt 2.0%)');
console.log('✅ Érdekképviseleti tagdíj: 0.7% (volt 0.5%)');
console.log('✅ Mindkettő adóalapot csökkenti!');

const results = [];
results.push(testUpdatedSalaryCalculation(300000));  // Átlag alatti
results.push(testUpdatedSalaryCalculation(500000));  // Átlagos
results.push(testUpdatedSalaryCalculation(800000));  // Átlag feletti

console.log('\n=== ÖSSZEHASONLÍTÁS ===');
results.forEach((result, index) => {
  const levels = ['Átlag alatti (300k)', 'Átlagos (500k)', 'Átlag feletti (800k)'];
  console.log(`${levels[index]}: ${result.netto.toLocaleString('hu-HU')} Ft (${result.arany}%)`);
});
