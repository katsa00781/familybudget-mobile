// Bruttó bér tételenkénti teszt - túl magas bér ellenőrzése
console.log('🧮 BRUTTÓ BÉR RÉSZLETEZÉS');
console.log('========================');
console.log('');

// Teszt adatok
const testInput = {
  alapber: 500000, // 500.000 Ft alapbér
  ledolgozott_orak: 162.0, // 20 nap × 8,1 óra = 162 óra
  tulora_orak: 20, // 20 óra túlóra
  muszakpotlek_orak: 10, // 10 óra műszakpótlék
  unnepnapi_orak: 8, // 8 óra ünnepnapi munka
  formaruha_kompenzacio: 5000 // 5.000 Ft formaruha
};

console.log('📋 BEMENET:');
console.log(`• Alapbér: ${testInput.alapber.toLocaleString('hu-HU')} Ft`);
console.log(`• Ledolgozott órák: ${testInput.ledolgozott_orak} óra (20 nap × 8,1 óra)`);
console.log(`• Túlóra órák: ${testInput.tulora_orak} óra`);
console.log(`• Műszakpótlék órák: ${testInput.muszakpotlek_orak} óra`);
console.log(`• Ünnepnapi órák: ${testInput.unnepnapi_orak} óra`);
console.log(`• Formaruha kompenzáció: ${testInput.formaruha_kompenzacio.toLocaleString('hu-HU')} Ft`);
console.log('');

// Órabér számítása
const hourlyWage = testInput.alapber / testInput.ledolgozott_orak;
console.log('💰 SZÁMÍTOTT TÉTELEK:');
console.log(`• Órabér: ${hourlyWage.toLocaleString('hu-HU')} Ft/óra`);

// Túlóra számítás (BudgetScreen logikája szerint)
const overtimeBasePay = testInput.tulora_orak * hourlyWage * 1.0; // 100% alapbér
const overtimeAllowance = testInput.tulora_orak * hourlyWage * 0.0; // 0% pótlék
const overtimeShiftAllowance = testInput.tulora_orak * hourlyWage * 0.45; // 45% műszakpótlék túlórára
const totalOvertimePay = overtimeBasePay + overtimeAllowance + overtimeShiftAllowance;

console.log(`• Túlóra alapbér (${testInput.tulora_orak} óra × ${hourlyWage.toLocaleString('hu-HU')} × 1.0): ${overtimeBasePay.toLocaleString('hu-HU')} Ft`);
console.log(`• Túlóra pótlék (${testInput.tulora_orak} óra × ${hourlyWage.toLocaleString('hu-HU')} × 0.0): ${overtimeAllowance.toLocaleString('hu-HU')} Ft`);
console.log(`• Túlórára műszakpótlék (${testInput.tulora_orak} óra × ${hourlyWage.toLocaleString('hu-HU')} × 0.45): ${overtimeShiftAllowance.toLocaleString('hu-HU')} Ft`);
console.log(`• Túlóra összesen: ${totalOvertimePay.toLocaleString('hu-HU')} Ft`);

// Műszakpótlék (45%)
const shiftAllowance = testInput.muszakpotlek_orak * hourlyWage * 0.45;
console.log(`• Műszakpótlék (${testInput.muszakpotlek_orak} óra × ${hourlyWage.toLocaleString('hu-HU')} × 0.45): ${shiftAllowance.toLocaleString('hu-HU')} Ft`);

// Ünnepnapi pótlék (200%)
const holidayPay = testInput.unnepnapi_orak * hourlyWage * 2.0;
console.log(`• Ünnepnapi pótlék (${testInput.unnepnapi_orak} óra × ${hourlyWage.toLocaleString('hu-HU')} × 2.0): ${holidayPay.toLocaleString('hu-HU')} Ft`);

console.log(`• Formaruha kompenzáció: ${testInput.formaruha_kompenzacio.toLocaleString('hu-HU')} Ft`);
console.log('');

// Bruttó bér összesítés
const grossSalary = Math.round(
  testInput.alapber + 
  overtimeBasePay + 
  overtimeAllowance +
  overtimeShiftAllowance +
  shiftAllowance + 
  holidayPay + 
  testInput.formaruha_kompenzacio
);

console.log('📊 BRUTTÓ BÉR ÖSSZESÍTÉS:');
console.log(`• Alapbér: ${testInput.alapber.toLocaleString('hu-HU')} Ft`);
console.log(`• Túlóra alapbér: ${overtimeBasePay.toLocaleString('hu-HU')} Ft`);
console.log(`• Túlóra pótlék: ${overtimeAllowance.toLocaleString('hu-HU')} Ft`);
console.log(`• Túlórára műszakpótlék: ${overtimeShiftAllowance.toLocaleString('hu-HU')} Ft`);
console.log(`• Műszakpótlék: ${shiftAllowance.toLocaleString('hu-HU')} Ft`);
console.log(`• Ünnepnapi pótlék: ${holidayPay.toLocaleString('hu-HU')} Ft`);
console.log(`• Formaruha: ${testInput.formaruha_kompenzacio.toLocaleString('hu-HU')} Ft`);
console.log('─'.repeat(50));
console.log(`🎯 ÖSSZES BRUTTÓ: ${grossSalary.toLocaleString('hu-HU')} Ft`);
console.log('');

// Hagyományos számítás összehasonlításhoz
console.log('🔍 ÖSSZEHASONLÍTÁS:');

// 150% túlóra
const traditional150 = testInput.tulora_orak * hourlyWage * 1.5;
const gross150 = Math.round(testInput.alapber + traditional150 + shiftAllowance + holidayPay + testInput.formaruha_kompenzacio);
console.log(`• Túlóra 150%-kal: ${gross150.toLocaleString('hu-HU')} Ft (különbség: ${(grossSalary - gross150).toLocaleString('hu-HU')} Ft)`);

// 125% túlóra
const traditional125 = testInput.tulora_orak * hourlyWage * 1.25;
const gross125 = Math.round(testInput.alapber + traditional125 + shiftAllowance + holidayPay + testInput.formaruha_kompenzacio);
console.log(`• Túlóra 125%-kal: ${gross125.toLocaleString('hu-HU')} Ft (különbség: ${(grossSalary - gross125).toLocaleString('hu-HU')} Ft)`);

// Csak alapbér + pótlékok
const grossNoOvertime = Math.round(testInput.alapber + shiftAllowance + holidayPay + testInput.formaruha_kompenzacio);
console.log(`• Túlóra nélkül: ${grossNoOvertime.toLocaleString('hu-HU')} Ft (különbség: ${(grossSalary - grossNoOvertime).toLocaleString('hu-HU')} Ft)`);

console.log('');
console.log('✅ HELYES LOGIKA: Túlóra = 100% alapbér + 45% műszakpótlék = 145% összesen');
console.log('� Ez megfelel a BudgetScreen eredeti logikájának!');
