// Teszt a frissített SalaryCalculatorScreen logikájához
// 20 munkanap alapú számítás

function calculateSalary(alapber, munkanapok = 20, tulora = 0, muszakpotlek = 0, csaladi_kedv = 0, egyeb_jovedelem = 0) {
    console.log(`\n=== Bérszámítás teszt ===`);
    console.log(`Alapbér: ${alapber.toLocaleString()} Ft`);
    console.log(`Munkanapok: ${munkanapok}`);
    
    // Órabér számítása (alapbér / munkanapok / 8 óra)
    const oraber = alapber / (munkanapok * 8);
    console.log(`Órabér: ${Math.round(oraber).toLocaleString()} Ft`);
    
    // Bruttó bér számítása
    const brutto_ber = munkanapok * 8 * oraber;
    console.log(`Bruttó bér (${munkanapok} nap * 8 óra): ${Math.round(brutto_ber).toLocaleString()} Ft`);

    // Túlórapótlék számítása
    const tulora_potlek = tulora * oraber * 1.5;
    
    // Műszakpótlék számítása  
    const muszakpotlek_osszeg = muszakpotlek * oraber * 1.3;
    
    // Teljes bruttó bér
    const teljes_brutto = brutto_ber + tulora_potlek + muszakpotlek_osszeg;
    console.log(`Teljes bruttó bér: ${Math.round(teljes_brutto).toLocaleString()} Ft`);

    // Konstansok
    const TB_JARULÉK_SZAZALEK = 0.185;
    const NYUGDIJJARULÉK_SZAZALEK = 0.10;
    const NYUGDIJJARULÉK_HATAR = 500000;
    const ÖNKÉNTES_NYUGDIJ = 0.015;
    const ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK = 0.007;
    const SZJA_SZAZALEK = 0.15;
    const ALTALANOS_ADOKEDVEZMENY = 10000;

    // TB járulék számítása (max 1.2M alapból)
    const tb_jarulék_alap = Math.min(teljes_brutto, 1200000);
    const tb_jarulék = Math.round(tb_jarulék_alap * TB_JARULÉK_SZAZALEK);
    console.log(`TB járulék (18.5%): ${tb_jarulék.toLocaleString()} Ft`);

    // Nyugdíjjárulék számítása (10% 500k felett)
    const nyugdijjarulék = teljes_brutto > NYUGDIJJARULÉK_HATAR 
      ? Math.round((teljes_brutto - NYUGDIJJARULÉK_HATAR) * NYUGDIJJARULÉK_SZAZALEK)
      : 0;
    console.log(`Nyugdíjjárulék (10% 500k felett): ${nyugdijjarulék.toLocaleString()} Ft`);

    // Önkéntes nyugdíjpénztár
    const onkentes_nyugdij = Math.round(teljes_brutto * ÖNKÉNTES_NYUGDIJ);
    console.log(`Önkéntes nyugdíj (1.5%): ${onkentes_nyugdij.toLocaleString()} Ft`);

    // Érdekképviseleti tagdíj
    const erdekképviseleti_tagdij = Math.round(teljes_brutto * ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK);
    console.log(`Érdekképviseleti tagdíj (0.7%): ${erdekképviseleti_tagdij.toLocaleString()} Ft`);

    // SZJA alap
    const szja_alap = teljes_brutto - tb_jarulék - nyugdijjarulék - onkentes_nyugdij - erdekképviseleti_tagdij - csaladi_kedv;
    console.log(`SZJA alap: ${Math.round(szja_alap).toLocaleString()} Ft`);

    // SZJA számítása
    const szja_brutto = Math.max(0, szja_alap) * SZJA_SZAZALEK;
    const szja = Math.max(0, szja_brutto - ALTALANOS_ADOKEDVEZMENY);
    console.log(`SZJA bruttó (15%): ${Math.round(szja_brutto).toLocaleString()} Ft`);
    console.log(`SZJA kedvezmény után: ${Math.round(szja).toLocaleString()} Ft`);

    // Összes levonás
    const osszes_levonas = tb_jarulék + nyugdijjarulék + onkentes_nyugdij + erdekképviseleti_tagdij + szja;
    console.log(`Összes levonás: ${Math.round(osszes_levonas).toLocaleString()} Ft`);

    // Nettó bér
    const netto_ber = teljes_brutto - osszes_levonas + egyeb_jovedelem;
    console.log(`Nettó bér: ${Math.round(netto_ber).toLocaleString()} Ft`);
    
    return Math.round(netto_ber);
}

// Tesztek
console.log("=== SALARY CALCULATOR SCREEN TESZT ===");
console.log("20 munkanap alapú számítás\n");

const netto1 = calculateSalary(400000, 20); // 400k alapbér, 20 nap
const netto2 = calculateSalary(500000, 20); // 500k alapbér, 20 nap
const netto3 = calculateSalary(800000, 20); // 800k alapbér, 20 nap

console.log(`\n=== Összefoglaló ===`);
console.log(`400k Ft (20 nap) → ${netto1.toLocaleString()} Ft nettó`);
console.log(`500k Ft (20 nap) → ${netto2.toLocaleString()} Ft nettó`);
console.log(`800k Ft (20 nap) → ${netto3.toLocaleString()} Ft nettó`);
