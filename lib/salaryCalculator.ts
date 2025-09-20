import { SalaryCalculationInput, TAX_RATES } from '../types/salary';

// Magyar bérkalkulációs logika
export class SalaryCalculator {
  // Havi munkanarok (átlagosan) - 8,1 óra/nap
  static readonly AVERAGE_WORK_DAYS_PER_MONTH = 21.67; // ~21,67 nap havonta (260 nap/12 hónap)
  static readonly AVERAGE_WORK_HOURS_PER_MONTH = 175.42; // ~175,42 óra (260 nap × 8,1 óra / 12)
  static readonly DAILY_WORK_HOURS = 8.1; // 8,1 óra/nap
  
  // Túlórapótlékok (eredeti repo logikája alapján)
  static readonly OVERTIME_MULTIPLIER = 1.0; // 100% (túlóra = alapbér)
  static readonly OVERTIME_ALLOWANCE = 0.0; // 0% (nincs extra túlórapótlék)
  static readonly SHIFT_ALLOWANCE = 0.45; // 45% (műszakpótlék - túlórára is vonatkozik)
  static readonly HOLIDAY_MULTIPLIER = 2.0; // 200% (100% pótlék)

  // Minimálbér 2025 (frissítendő aktuális értékkel)
  static readonly MIN_WAGE = 290000; // 2025-ös minimálbér (290.000 Ft)

  /**
   * Bruttó bér számítása
   */
  static calculateGrossSalary(input: SalaryCalculationInput): number {
    const {
      alapber,
      ledolgozott_orak = this.AVERAGE_WORK_HOURS_PER_MONTH,
      tulora_orak = 0,
      muszakpotlek_orak = 0,
      unnepnapi_orak = 0,
      formaruha_kompenzacio = 0,
    } = input;

    // Órabér számítása
    const hourlyWage = alapber / ledolgozott_orak;

    // Túlóra alapösszeg (100% alapbér)
    const overtimeBasePay = tulora_orak * hourlyWage * this.OVERTIME_MULTIPLIER;
    
    // Túlóra pótlék (0% - nincs extra pótlék)
    const overtimeAllowance = tulora_orak * hourlyWage * this.OVERTIME_ALLOWANCE;
    
    // Túlórára műszakpótlék (45% - ha a túlóra műszakban történik)
    // Ezt külön paraméterként kellene kezelni, most feltételezzük hogy a muszakpotlek_orak tartalmazza
    const overtimeShiftAllowance = tulora_orak * hourlyWage * this.SHIFT_ALLOWANCE;

    // Műszakpótlék (45% extra a normál műszakban dolgozott órákra)
    const shiftAllowance = muszakpotlek_orak * hourlyWage * this.SHIFT_ALLOWANCE;

    // Ünnepnapi pótlék
    const holidayPay = unnepnapi_orak * hourlyWage * this.HOLIDAY_MULTIPLIER;

    return Math.round(
      alapber + 
      overtimeBasePay + 
      overtimeAllowance +
      overtimeShiftAllowance +
      shiftAllowance + 
      holidayPay + 
      formaruha_kompenzacio
    );
  }

  /**
   * TB járulék számítása (18.5%, maximum 1.200.000 Ft alapból)
   */
  static calculateSocialSecurityContribution(grossSalary: number): number {
    const tbBase = Math.min(grossSalary, 1200000);
    return Math.round(tbBase * TAX_RATES.TB_JARULÉK);
  }

  /**
   * Nyugdíjjárulék számítása (10% - csak 500.000 Ft feletti bér esetén)
   */
  static calculatePensionContribution(grossSalary: number): number {
    return grossSalary > 500000 ? Math.round((grossSalary - 500000) * TAX_RATES.NYUGDIJJARULÉK) : 0;
  }

  /**
   * Önkéntes nyugdíjpénztári befizetés (2% - adóalapot csökkenti)
   */
  static calculateVoluntaryPensionContribution(grossSalary: number): number {
    return Math.round(grossSalary * TAX_RATES.ÖNKÉNTES_NYUGDIJ);
  }

  /**
   * Érdekképviseleti tagdíj (0.5% - adóalapot csökkenti)
   */
  static calculateUnionFee(grossSalary: number): number {
    return Math.round(grossSalary * TAX_RATES.ERDEKKÉPVISELETI_TAGDIJ);
  }

  /**
   * SZJA számítása (15% - általános adókedvezménnyel)
   * Megjegyzés: érdekképviseleti tagdíj NEM csökkenti az SZJA alapot a 2025-ös szabályok szerint
   */
  static calculateIncomeTax(
    grossSalary: number, 
    socialSecurity: number, 
    pensionContribution: number,
    voluntaryPension: number,
    familyTaxCredit: number = 0
  ): number {
    // SZJA alap számítása (érdekképviseleti tagdíj NÉLKÜL)
    const taxBase = grossSalary - socialSecurity - pensionContribution - voluntaryPension;
    const taxBaseAfterFamilyCredit = Math.max(0, taxBase - familyTaxCredit);
    
    // SZJA bruttó
    const grossTax = Math.round(taxBaseAfterFamilyCredit * TAX_RATES.SZJA);
    
    // Általános adókedvezmény levonása (2025-ben minimum 10.000 Ft)
    const generalTaxCredit = TAX_RATES.ALTALANOS_ADOKEDVEZMENY;
    return Math.max(0, grossTax - generalTaxCredit);
  }

  /**
   * Nettó bér számítása
   */
  static calculateNetSalary(grossSalary: number, socialSecurity: number, incomeTax: number): number {
    return grossSalary - socialSecurity - incomeTax;
  }

  /**
   * Szociális hozzájárulási adó (munkáltatói, 13.5%)
   */
  static calculateSocialContributionTax(grossSalary: number): number {
    return Math.round(grossSalary * TAX_RATES.SZOC_HOZZAJARULAS);
  }

  /**
   * Teljes munkáltatói költség
   */
  static calculateTotalEmployerCost(grossSalary: number, socialContributionTax: number): number {
    return grossSalary + socialContributionTax;
  }

  /**
   * Komplett bérkalkuláció
   */
  static calculateComplete(input: SalaryCalculationInput) {
    const {
      csaladi_adokedvezmeny = 0,
      formaruha_kompenzacio = 0,
    } = input;

    // 1. Bruttó bér
    const brutto_ber = this.calculateGrossSalary(input);

    // 2. TB járulék
    const tb_jarulék = this.calculateSocialSecurityContribution(brutto_ber);

    // 3. Nyugdíjjárulék
    const nyugdijjarulék = this.calculatePensionContribution(brutto_ber);

    // 4. Önkéntes nyugdíjpénztári befizetés
    const onkentes_nyugdij = this.calculateVoluntaryPensionContribution(brutto_ber);

    // 5. Érdekképviseleti tagdíj
    const erdekKepv_tagdij = this.calculateUnionFee(brutto_ber);

    // 6. SZJA
    const szja = this.calculateIncomeTax(
      brutto_ber + formaruha_kompenzacio, 
      tb_jarulék, 
      nyugdijjarulék, 
      onkentes_nyugdij,
      csaladi_adokedvezmeny
    );

    // 7. Összes levonás
    const osszes_levonas = tb_jarulék + nyugdijjarulék + onkentes_nyugdij + szja + erdekKepv_tagdij;

    // 8. Nettó bér
    const netto_ber = brutto_ber + formaruha_kompenzacio - osszes_levonas;

    // 9. Munkáltatói költségek
    const szoc_hozzajarulas = this.calculateSocialContributionTax(brutto_ber + formaruha_kompenzacio);
    const teljes_munkaltaroi_koltseg = brutto_ber + formaruha_kompenzacio + szoc_hozzajarulas;

    return {
      brutto_ber,
      formaruha_kompenzacio,
      netto_ber,
      szja,
      tb_jarulék,
      nyugdijjarulék,
      onkentes_nyugdij,
      erdekKepv_tagdij,
      osszes_levonas,
      szoc_hozzajarulas,
      teljes_munkaltaroi_koltseg,
    };
  }

  /**
   * Órabér számítása
   */
  static calculateHourlyWage(alapber: number, ledolgozott_orak: number = this.AVERAGE_WORK_HOURS_PER_MONTH): number {
    return Math.round(alapber / ledolgozott_orak);
  }

  /**
   * Havi szükséges óraszám számítása adott nettó bérhez
   */
  static calculateRequiredHoursForNetSalary(
    targetNetSalary: number, 
    hourlyGrossWage: number,
    familyTaxCredit: number = 0
  ): number {
    // Iteratív megközelítés, mivel a számítás nem lineáris
    let estimatedHours = targetNetSalary / (hourlyGrossWage * 0.65); // Durva becslés
    
    for (let i = 0; i < 10; i++) {
      const testInput: SalaryCalculationInput = {
        alapber: Math.round(hourlyGrossWage * estimatedHours),
        ledolgozott_napok: this.AVERAGE_WORK_DAYS_PER_MONTH,
        ledolgozott_orak: estimatedHours,
        csaladi_adokedvezmeny: familyTaxCredit,
      };
      
      const result = this.calculateComplete(testInput);
      const difference = result.netto_ber - targetNetSalary;
      
      if (Math.abs(difference) < 1000) break; // 1000 Ft pontosság
      
      // Korrekció
      estimatedHours += difference / (hourlyGrossWage * 0.65);
    }
    
    return Math.round(estimatedHours * 100) / 100; // 2 tizedesjegy
  }

  /**
   * Bérkalkuláció validálása
   */
  static validateInput(input: SalaryCalculationInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.alapber || input.alapber < this.MIN_WAGE) {
      errors.push(`Az alapbér nem lehet kevesebb, mint ${this.MIN_WAGE.toLocaleString('hu-HU')} Ft`);
    }

    if (!input.ledolgozott_napok || input.ledolgozott_napok <= 0 || input.ledolgozott_napok > 31) {
      errors.push('A ledolgozott napok száma 1-31 között kell legyen');
    }

    if (!input.ledolgozott_orak || input.ledolgozott_orak <= 0 || input.ledolgozott_orak > 744) {
      errors.push('A ledolgozott órák száma 1-744 között kell legyen');
    }

    if ((input.tulora_orak || 0) < 0 || (input.tulora_orak || 0) > 200) {
      errors.push('A túlóra órák száma 0-200 között kell legyen');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Formázott kimenetek
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  static formatHours(hours: number): string {
    return `${hours.toFixed(1)} óra`;
  }

  static formatDays(days: number): string {
    return `${days.toFixed(1)} nap`;
  }
}
