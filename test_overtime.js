// Túlóra + műszakpótlék teszt (100% + 45%)
const KULCSOK = {
  TB_JARULÉK: 0.185,
  SZJA_KULCS: 0.15,
  NYUGDIJJARULÉK: 0.10,
  SZOCIALIS_HOZZAJARULAS: 0.135,
  ÖNKÉNTES_NYUGDIJ: 0.015,
  MUSZAKPOTLEK: 0.45, // 45% műszakpótlék
  TULORA_POTLEK: 0.00, // 0% túlórapótlék
  ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.007
};

function testOvertimeCalculation() {
  console.log('\n=== TÚLÓRA + MŰSZAKPÓTLÉK TESZT ===');
  
  // Példa: 500.000 Ft alapbér, 176 óra/hó, 8 óra túlóra műszakban
  const alapber = 500000;
  const ledolgozottOrak = 176;
  const tuloraOrak = 8;
  const oraber = alapber / ledolgozottOrak;
  
  console.log(`Alapbér: ${alapber.toLocaleString('hu-HU')} Ft`);
  console.log(`Ledolgozott órák: ${ledolgozottOrak} óra`);
  console.log(`Túlóra órák: ${tuloraOrak} óra`);
  console.log(`Órabér: ${Math.round(oraber).toLocaleString('hu-HU')} Ft/óra`);
  
  // Régi rendszer (hibás):
  console.log('\n--- RÉGI RENDSZER (hibás) ---');
  const regiTuloraAlap = Math.round(tuloraOrak * oraber);
  const regiTuloraPotlek = Math.round(tuloraOrak * oraber * 0.50); // 50% pótlék
  const regiTuloraMuszak = Math.round(tuloraOrak * oraber * 0.30); // 30% műszakpótlék
  const regiOsszesen = regiTuloraAlap + regiTuloraPotlek + regiTuloraMuszak;
  console.log(`Túlóra alapösszeg: ${regiTuloraAlap.toLocaleString('hu-HU')} Ft`);
  console.log(`Túlórapótlék (50%): ${regiTuloraPotlek.toLocaleString('hu-HU')} Ft`);
  console.log(`Műszakpótlék (30%): ${regiTuloraMuszak.toLocaleString('hu-HU')} Ft`);
  console.log(`Összesen: ${regiOsszesen.toLocaleString('hu-HU')} Ft (${(regiOsszesen / regiTuloraAlap * 100).toFixed(0)}%)`);
  
  // Új rendszer (helyes):
  console.log('\n--- ÚJ RENDSZER (helyes) ---');
  const ujTuloraAlap = Math.round(tuloraOrak * oraber);
  const ujTuloraPotlek = Math.round(tuloraOrak * oraber * KULCSOK.TULORA_POTLEK); // 0% pótlék
  const ujTuloraMuszak = Math.round(tuloraOrak * oraber * KULCSOK.MUSZAKPOTLEK); // 45% műszakpótlék
  const ujOsszesen = ujTuloraAlap + ujTuloraPotlek + ujTuloraMuszak;
  console.log(`Túlóra alapösszeg: ${ujTuloraAlap.toLocaleString('hu-HU')} Ft (100%)`);
  console.log(`Túlórapótlék (0%): ${ujTuloraPotlek.toLocaleString('hu-HU')} Ft`);
  console.log(`Műszakpótlék (45%): ${ujTuloraMuszak.toLocaleString('hu-HU')} Ft`);
  console.log(`Összesen: ${ujOsszesen.toLocaleString('hu-HU')} Ft (145%)`);
  
  console.log('\n--- ÖSSZEHASONLÍTÁS ---');
  const kulonbseg = ujOsszesen - regiOsszesen;
  console.log(`Különbség: ${kulonbseg > 0 ? '+' : ''}${kulonbseg.toLocaleString('hu-HU')} Ft`);
  
  return { regi: regiOsszesen, uj: ujOsszesen, kulonbseg };
}

testOvertimeCalculation();
