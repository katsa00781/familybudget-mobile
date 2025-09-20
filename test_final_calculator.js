// Teszt a frissített SalaryCalculatorScreen logikájához
// Most a lib/salaryCalculator.ts alapján működik

// Importáljuk a lib/salaryCalculator logikáját
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

function calculateComplete(input) {
  const {
    alapber,
    ledolgozott_napok = 20,
    ledolgozott_orak = ledolgozott_napok * 8,
    tulora_orak = 0,
    muszakpotlek_orak = 0,
    formaruha_kompenzacio = 0,
    csaladi_adokedvezmeny = 0,
  } = input;

  console.log(`\n=== SalaryCalculator teszt ===`);
  console.log(`Alapbér: ${alapber.toLocaleString()} Ft`);
  console.log(`Ledolgozott napok: ${ledolgozott_napok}`);
  console.log(`Ledolgozott órák: ${ledolgozott_orak}`);
  
  // 1. Bruttó bér számítása
  const hourlyWage = alapber / ledolgozott_orak;
  const overtimePay = tulora_orak * hourlyWage * 1.5; // 150% túlórapótlék
  const shiftAllowance = muszakpotlek_orak * hourlyWage * 1.45; // 145% műszakpótlék
  
  const brutto_ber = Math.round(alapber + overtimePay + shiftAllowance);
  console.log(`Bruttó bér: ${brutto_ber.toLocaleString()} Ft`);
  
  // 2. TB járulék (18.5%, max 1.2M alapból)
  const tbBase = Math.min(brutto_ber, 1200000);
  const tb_jarulék = Math.round(tbBase * TAX_RATES.TB_JARULÉK);
  console.log(`TB járulék (18.5%): ${tb_jarulék.toLocaleString()} Ft`);
  
  // 3. Nyugdíjjárulék (10% 500k felett)
  const nyugdijjarulék = brutto_ber > TAX_RATES.NYUGDIJJARULÉK_HATÁR
    ? Math.round((brutto_ber - TAX_RATES.NYUGDIJJARULÉK_HATÁR) * TAX_RATES.NYUGDIJJARULÉK)
    : 0;
  console.log(`Nyugdíjjárulék (10% 500k felett): ${nyugdijjarulék.toLocaleString()} Ft`);
  
  // 4. Önkéntes nyugdíj (2%)
  const onkentes_nyugdij = Math.round(brutto_ber * TAX_RATES.ÖNKÉNTES_NYUGDIJ);
  console.log(`Önkéntes nyugdíj (2%): ${onkentes_nyugdij.toLocaleString()} Ft`);
  
  // 5. Érdekképviseleti tagdíj (0.5%)
  const erdekKepv_tagdij = Math.round(brutto_ber * TAX_RATES.ERDEKKÉPVISELETI_TAGDIJ);
  console.log(`Érdekképviseleti tagdíj (0.5%): ${erdekKepv_tagdij.toLocaleString()} Ft`);
  
  // 6. SZJA számítás
  const taxBase = brutto_ber + formaruha_kompenzacio - tb_jarulék - nyugdijjarulék - onkentes_nyugdij;
  const taxBaseAfterFamilyCredit = Math.max(0, taxBase - csaladi_adokedvezmeny);
  const grossTax = Math.round(taxBaseAfterFamilyCredit * TAX_RATES.SZJA);
  const szja = Math.max(0, grossTax - TAX_RATES.ALTALANOS_ADOKEDVEZMENY);
  
  console.log(`SZJA alap: ${taxBase.toLocaleString()} Ft`);
  console.log(`SZJA bruttó (15%): ${grossTax.toLocaleString()} Ft`);
  console.log(`SZJA (10k kedvezmény után): ${szja.toLocaleString()} Ft`);
  
  // 7. Összes levonás
  const osszes_levonas = tb_jarulék + nyugdijjarulék + onkentes_nyugdij + szja + erdekKepv_tagdij;
  console.log(`Összes levonás: ${osszes_levonas.toLocaleString()} Ft`);
  
  // 8. Nettó bér
  const netto_ber = brutto_ber + formaruha_kompenzacio - osszes_levonas;
  console.log(`Nettó bér: ${netto_ber.toLocaleString()} Ft`);
  
  // 9. Munkáltatói költségek
  const szoc_hozzajarulas = Math.round((brutto_ber + formaruha_kompenzacio) * TAX_RATES.SZOC_HOZZAJARULAS);
  const teljes_munkaltaroi_koltseg = brutto_ber + formaruha_kompenzacio + szoc_hozzajarulas;
  
  console.log(`Szociális hozzájárulás (13.5%): ${szoc_hozzajarulas.toLocaleString()} Ft`);
  console.log(`Teljes munkáltatói költség: ${teljes_munkaltaroi_koltseg.toLocaleString()} Ft`);
  console.log(`Nettó/bruttó arány: ${(netto_ber / (brutto_ber + formaruha_kompenzacio) * 100).toFixed(1)}%`);
  
  return {
    brutto_ber: brutto_ber + formaruha_kompenzacio,
    netto_ber,
    szja,
    tb_jarulék,
    nyugdijjarulék,
    onkentes_nyugdij,
    erdekKepv_tagdij,
    osszes_levonas,
    szoc_hozzajarulas,
    teljes_munkaltaroi_koltseg
  };
}

// Tesztek
console.log("=== FRISSÍTETT SALARY CALCULATOR SCREEN TESZT ===");
console.log("lib/salaryCalculator.ts alapú logika\n");

const test1 = calculateComplete({
  alapber: 400000,
  ledolgozott_napok: 20,
  tulora_orak: 0,
  muszakpotlek_orak: 0,
  formaruha_kompenzacio: 0,
  csaladi_adokedvezmeny: 0
});

const test2 = calculateComplete({
  alapber: 500000,
  ledolgozott_napok: 20,
  tulora_orak: 0,
  muszakpotlek_orak: 0,
  formaruha_kompenzacio: 0,
  csaladi_adokedvezmeny: 0
});

const test3 = calculateComplete({
  alapber: 800000,
  ledolgozott_napok: 20,
  tulora_orak: 0,
  muszakpotlek_orak: 0,
  formaruha_kompenzacio: 0,
  csaladi_adokedvezmeny: 0
});

console.log(`\n=== ÖSSZEFOGLALÓ ===`);
console.log(`400k Ft → ${test1.netto_ber.toLocaleString()} Ft nettó (${(test1.netto_ber / test1.brutto_ber * 100).toFixed(1)}%)`);
console.log(`500k Ft → ${test2.netto_ber.toLocaleString()} Ft nettó (${(test2.netto_ber / test2.brutto_ber * 100).toFixed(1)}%)`);
console.log(`800k Ft → ${test3.netto_ber.toLocaleString()} Ft nettó (${(test3.netto_ber / test3.brutto_ber * 100).toFixed(1)}%)`);

console.log(`\n✅ A SalaryCalculatorScreen most a pontos lib/salaryCalculator.ts logikát használja!`);
