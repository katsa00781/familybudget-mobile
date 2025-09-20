// Összehasonlítás a BudgetScreen és a helyes értékek között

const BUDGET_SCREEN_KULCSOK = {
  SZOCIALIS_HOZZAJARULAS: 0.135, // 13.5% (munkáltatói teher) ✅
  TB_JARULÉK: 0.185, // 18.5% (munkavállalói járulék) ✅
  NYUGDIJJARULÉK: 0.10, // 10% (500.000 Ft felett) ✅
  SZJA_KULCS: 0.15, // 15% (egységes kulcs) ✅
  ÖNKÉNTES_NYUGDIJ: 0.015, // 1.5% ❌ HIBÁS! 2% kellene
  ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.007 // 0.7% ❌ HIBÁS! 0.5% kellene
};

const HELYES_KULCSOK = {
  SZOCIALIS_HOZZAJARULAS: 0.135, // 13.5%
  TB_JARULÉK: 0.185, // 18.5%
  NYUGDIJJARULÉK: 0.10, // 10% (500.000 Ft felett)
  SZJA_KULCS: 0.15, // 15%
  ÖNKÉNTES_NYUGDIJ: 0.02, // 2% ✅ HELYES
  ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.005, // 0.5% ✅ HELYES
  ALTALANOS_ADOKEDVEZMENY: 10000 // 10.000 Ft
};

console.log("❌ PROBLÉMÁK A BUDGETSCREEN-BEN:");
console.log("1. ÖNKÉNTES_NYUGDIJ: 1.5% helyett 2% kellene");
console.log("2. ERDEKKÉPVISELETI_TAGDIJ: 0.7% helyett 0.5% kellene");
console.log("3. Összetett számítás 174 óra alapon (helytelen)");
console.log("4. Műszakpótlék és túlóra komplex kezelés");

console.log("\n✅ SALARY CALCULATOR SCREEN helyes értékekkel");
console.log("- Egyszerű számítás munkanapok * 8 óra alapon");
console.log("- Helyes adózási kulcsok");
console.log("- Tiszta SZJA alap számítás");

// Tesztelés 500.000 Ft alapbérrel
function testBudgetScreenLogic() {
  const alapber = 500000;
  const oraber = alapber / 174; // BudgetScreen logika
  const ledolgozottOrak = 20 * 8.1; // 162.0 óra
  
  console.log(`\n=== BudgetScreen logika teszt ===`);
  console.log(`Alapbér: ${alapber.toLocaleString()} Ft`);
  console.log(`Órabér (174 óra alapon): ${Math.round(oraber).toLocaleString()} Ft`);
  console.log(`Ledolgozott órák: ${ledolgozottOrak} óra`);
  
  const haviberesIdober = Math.round(ledolgozottOrak * oraber);
  console.log(`Havi bér (${ledolgozottOrak} * ${Math.round(oraber)}): ${haviberesIdober.toLocaleString()} Ft`);
  
  // TB járulék
  const tbJarulék = Math.round(haviberesIdober * 0.185);
  console.log(`TB járulék: ${tbJarulék.toLocaleString()} Ft`);
  
  // Hibás önkéntes nyugdíj
  const onkentesNyugdij = Math.round(haviberesIdober * 0.015);
  console.log(`Önkéntes nyugdíj (HIBÁS 1.5%): ${onkentesNyugdij.toLocaleString()} Ft`);
  
  // Hibás érdekképviseleti tagdíj  
  const erdekKepvTagdij = Math.round(haviberesIdober * 0.007);
  console.log(`Érdekképviseleti tagdíj (HIBÁS 0.7%): ${erdekKepvTagdij.toLocaleString()} Ft`);
  
  return haviberesIdober;
}

function testCorrectLogic() {
  const alapber = 500000;
  const munkanapok = 20;
  const oraber = alapber / (munkanapok * 8);
  
  console.log(`\n=== Helyes logika teszt ===`);
  console.log(`Alapbér: ${alapber.toLocaleString()} Ft`);
  console.log(`Órabér (${munkanapok} nap * 8 óra): ${Math.round(oraber).toLocaleString()} Ft`);
  console.log(`Bruttó bér: ${alapber.toLocaleString()} Ft`);
  
  // TB járulék
  const tbJarulék = Math.round(alapber * 0.185);
  console.log(`TB járulék: ${tbJarulék.toLocaleString()} Ft`);
  
  // Helyes önkéntes nyugdíj
  const onkentesNyugdij = Math.round(alapber * 0.02);
  console.log(`Önkéntes nyugdíj (HELYES 2%): ${onkentesNyugdij.toLocaleString()} Ft`);
  
  // Helyes érdekképviseleti tagdíj
  const erdekKepvTagdij = Math.round(alapber * 0.005);
  console.log(`Érdekképviseleti tagdíj (HELYES 0.5%): ${erdekKepvTagdij.toLocaleString()} Ft`);
}

testBudgetScreenLogic();
testCorrectLogic();
