// Gyors teszt a BudgetScreen-ből átmásolt kalkulátornak
const KULCSOK = {
  SZOCIALIS_HOZZAJARULAS: 0.135, // 13.5% (munkáltatói teher)
  TB_JARULÉK: 0.185, // 18.5% (munkavállalói járulék)
  NYUGDIJJARULÉK: 0.10, // 10% (500.000 Ft felett)
  SZJA_KULCS: 0.15, // 15% (egységes kulcs)
  ÖNKÉNTES_NYUGDIJ: 0.015, // 1.5% (dolgozói befizetés, adóalapot csökkenti)
  MUSZAKPOTLEK: 0.45, // 45% (műszakpótlék - túlórára is vonatkozik)
  TULORA_POTLEK: 0.00, // 0% (túlóra = 100% alapbér, pótlék csak műszakban)
  UNNEPNAPI_SZORZO: 1.0, // 100% (200%-hoz 100% hozzáadás)
  BETEGSZABADSAG_SZAZALEK: 0.70, // 70%
  GYED_NAPI: 13570, // GYED napi összeg 2025
  KIKULDETESI_POTLEK: 6710, // Kiküldetési pótlék
  ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.007 // 0.7% (adóalapot csökkenti)
};

function testBudgetCalculator(gross) {
  console.log(`\n=== BudgetScreen kalkulátor teszt: ${gross.toLocaleString()} Ft ===`);
  
  const oraber = gross / 174;
  const workDays = 22;
  const overtime = 0;
  const nightShift = 0;
  const other = 0; // formaruha kompenzáció
  
  // Járandóságok számítása
  const haviberesIdober = Math.round(workDays * 8 * oraber);
  const fizetettSzabadsag = 0;
  
  // Túlóra számítás - 100% alapbér
  const tuloraAlapossszeg = Math.round(overtime * oraber);
  const tuloraPotlek = Math.round(overtime * oraber * KULCSOK.TULORA_POTLEK);
  
  const muszakpotlek = Math.round(nightShift * oraber * KULCSOK.MUSZAKPOTLEK);
  const tuloraMuszakpotlek = Math.round(overtime * oraber * KULCSOK.MUSZAKPOTLEK);
  const unnepnapiMunka = 0;
  const betegszabadsag = 0;
  const kikuldetesTobblet = 0;
  const gyedMunkavMellett = 0;
  
  // Bruttó bér összesen
  const bruttoBer = haviberesIdober + fizetettSzabadsag + tuloraAlapossszeg + tuloraPotlek +
                   muszakpotlek + tuloraMuszakpotlek + unnepnapiMunka + 
                   betegszabadsag + kikuldetesTobblet;
  
  // Összes járandóság
  const osszesJarandsag = bruttoBer + gyedMunkavMellett + other;
  
  // TB járulék számítás - 18.5% bruttó bérből (maximálisan 1.200.000 Ft-ig)
  const tbJarulékAlap = Math.min(bruttoBer, 1200000);
  const tbJarulék = Math.round(tbJarulékAlap * KULCSOK.TB_JARULÉK);
  
  // Nyugdíjjárulék - 10% csak 500.000 Ft feletti bér esetén
  const nyugdijJarulék = bruttoBer > 500000 ? Math.round((bruttoBer - 500000) * KULCSOK.NYUGDIJJARULÉK) : 0;
  
  // Önkéntes nyugdíjpénztári befizetés - 1.5% (adóalapot csökkenti)
  const onkentesNyugdij = Math.round(bruttoBer * KULCSOK.ÖNKÉNTES_NYUGDIJ);
  
  // Érdekképviseleti tagdíj - 0.7% (adóalapot csökkenti)
  const erdekKepvTagdij = Math.round(bruttoBer * KULCSOK.ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK);
  
  // SZJA alap = bruttó bér + formaruhakomp. - TB járulék - nyugdíjjárulék - önkéntes nyugdíj
  const szjaAlap = bruttoBer + other - tbJarulék - nyugdijJarulék - onkentesNyugdij;
  
  // Családi adókedvezmény alkalmazása
  const kedvezményesAlap = Math.max(0, szjaAlap - 0);
  
  // SZJA számítás - 15% az SZJA alapból
  const szjaBrutto = Math.round(kedvezményesAlap * KULCSOK.SZJA_KULCS);
  
  // Általános adókedvezmény levonása (2025-ben minimum 10.000 Ft)
  const altalnosAdoKedvezmeny = 10000;
  const szja = Math.max(0, szjaBrutto - altalnosAdoKedvezmeny);
  
  // Összes levonás
  const osszesLevonas = tbJarulék + nyugdijJarulék + onkentesNyugdij + szja + erdekKepvTagdij;
  
  // Nettó fizetés
  const netto = osszesJarandsag - osszesLevonas;
  
  console.log(`Bruttó bér: ${bruttoBer.toLocaleString()} Ft`);
  console.log(`TB járulék: ${tbJarulék.toLocaleString()} Ft`);
  console.log(`Nyugdíjjárulék: ${nyugdijJarulék.toLocaleString()} Ft`);
  console.log(`Önkéntes nyugdíj: ${onkentesNyugdij.toLocaleString()} Ft`);
  console.log(`Érdekképviseleti tagdíj: ${erdekKepvTagdij.toLocaleString()} Ft`);
  console.log(`SZJA alap: ${szjaAlap.toLocaleString()} Ft`);
  console.log(`SZJA bruttó: ${szjaBrutto.toLocaleString()} Ft`);
  console.log(`SZJA: ${szja.toLocaleString()} Ft`);
  console.log(`Összes levonás: ${osszesLevonas.toLocaleString()} Ft`);
  console.log(`Nettó: ${netto.toLocaleString()} Ft`);
  
  return { bruttoBer, tbJarulék, nyugdijJarulék, onkentesNyugdij, erdekKepvTagdij, szja, netto };
}

// Tesztelés
const test500k = testBudgetCalculator(500000);
const test800k = testBudgetCalculator(800000);

console.log('\n=== EREDMÉNYEK ===');
console.log(`500k: TB=${test500k.tbJarulék}, Nyugdíj=${test500k.nyugdijJarulék}, SZJA=${test500k.szja}, Nettó=${test500k.netto}`);
console.log(`800k: TB=${test800k.tbJarulék}, Nyugdíj=${test800k.nyugdijJarulék}, SZJA=${test800k.szja}, Nettó=${test800k.netto}`);
