import { SalaryCalculationInput, TAX_RATES } from '../types/salary';

// Magyar bérkalkulációs logika
export class SalaryCalculator {
  // Havi munkanarok (átlagosan)
  static readonly AVERAGE_WORK_DAYS_PER_MONTH = 22;
  static readonly AVERAGE_WORK_HOURS_PER_MONTH = 176;
  
  // Túlórapótlékok
  static readonly OVERTIME_MULTIPLIER = 1.5; // 150%
  static readonly SHIFT_ALLOWANCE_MULTIPLIER = 0.3; // 30%
  static readonly HOLIDAY_MULTIPLIER = 2.0; // 200%

  // Minimálbér 2024 (példa - frissítendő aktuális értékkel)
  static readonly MIN_WAGE = 266800;

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

    // Túlóra pótlék
    const overtimePay = tulora_orak * hourlyWage * this.OVERTIME_MULTIPLIER;

    // Műszakpótlék
    const shiftAllowance = muszakpotlek_orak * hourlyWage * this.SHIFT_ALLOWANCE_MULTIPLIER;

    // Ünnepnapi pótlék
    const holidayPay = unnepnapi_orak * hourlyWage * this.HOLIDAY_MULTIPLIER;

    return Math.round(
      alapber + 
      overtimePay + 
      shiftAllowance + 
      holidayPay + 
      formaruha_kompenzacio
    );
  }

  /**
   * TB járulék számítása (18.5%)
   */
  static calculateSocialSecurityContribution(grossSalary: number): number {
    return Math.round(grossSalary * TAX_RATES.TB_JARULÉK);
  }

  /**
   * SZJA számítása (15%)
   */
  static calculateIncomeTax(grossSalary: number, socialSecurity: number, familyTaxCredit: number = 0): number {
    const taxBase = Math.max(0, grossSalary - socialSecurity - familyTaxCredit);
    return Math.round(taxBase * TAX_RATES.SZJA);
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
    } = input;

    // 1. Bruttó bér
    const brutto_ber = this.calculateGrossSalary(input);

    // 2. TB járulék
    const tb_jarulék = this.calculateSocialSecurityContribution(brutto_ber);

    // 3. SZJA
    const szja = this.calculateIncomeTax(brutto_ber, tb_jarulék, csaladi_adokedvezmeny);

    // 4. Nettó bér
    const netto_ber = this.calculateNetSalary(brutto_ber, tb_jarulék, szja);

    // 5. Munkáltatói költségek
    const szoc_hozzajarulas = this.calculateSocialContributionTax(brutto_ber);
    const teljes_munkaltaroi_koltseg = this.calculateTotalEmployerCost(brutto_ber, szoc_hozzajarulas);

    return {
      brutto_ber,
      netto_ber,
      szja,
      tb_jarulék,
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
