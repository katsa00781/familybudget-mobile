// Magyar bérkalkulációs típusok a web projektből átvéve

interface SalaryCalculation {
  id: string;
  family_member_id: string;
  
  // Alapadatok
  alapber: number;
  ledolgozott_napok: number;
  ledolgozott_orak: number;
  
  // Szabadság és túlóra
  szabadsag_napok: number;
  szabadsag_orak: number;
  tulora_orak: number;
  muszakpotlek_orak: number;
  unnepnapi_orak: number;
  betegszabadsag_napok: number;
  kikuldes_napok: number;
  
  // Egyéb juttatások
  gyed_mellett: number;
  formaruha_kompenzacio: number;
  csaladi_adokedvezmeny: number;
  
  // Számított értékek
  brutto_ber: number;
  netto_ber: number;
  szja: number;
  tb_jarulék: number;
  szoc_hozzajarulas: number;
  teljes_munkaltaroi_koltseg: number;
  
  created_at: string;
  updated_at: string;
}

// Bérkalkulációs input form típus
export interface SalaryCalculationInput {
  alapber: number;
  ledolgozott_napok: number;
  ledolgozott_orak: number;
  szabadsag_napok?: number;
  szabadsag_orak?: number;
  tulora_orak?: number;
  muszakpotlek_orak?: number;
  unnepnapi_orak?: number;
  betegszabadsag_napok?: number;
  kikuldes_napok?: number;
  gyed_mellett?: number;
  formaruha_kompenzacio?: number;
  csaladi_adokedvezmeny?: number;
}

// Magyar adózási konstansok (2025)
export const TAX_RATES = {
  SZJA: 0.15, // 15% SZJA
  TB_JARULÉK: 0.185, // 18.5% TB járulék
  NYUGDIJJARULÉK: 0.10, // 10% nyugdíjjárulék (500.000 Ft felett)
  SZOC_HOZZAJARULAS: 0.135, // 13.5% szociális hozzájárulási adó (munkáltatói)
  ÖNKÉNTES_NYUGDIJ: 0.015, // 1.5% önkéntes nyugdíjpénztár (adóalapot csökkenti)
  MUSZAKPOTLEK: 0.45, // 45% műszakpótlék (túlórára is vonatkozik)
  TULORA_POTLEK: 0.00, // 0% túlórapótlék (túlóra = 100% alapbér)
  UNNEPNAPI_SZORZO: 1.0, // 100% ünnepnapi szorzó
  ERDEKKÉPVISELETI_TAGDIJ: 0.007, // 0.7% érdekképviseleti tagdíj (adóalapot csökkenti)
} as const;

// Családi adókedvezmény összegek
export const CSALADI_ADOKEDVEZMENY = {
  EGY_GYEREK: 10000,
  KET_GYEREK: 20000,
  HAROM_VAGY_TOBB_GYEREK: 33000,
} as const;
