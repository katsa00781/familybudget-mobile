// Magyar bérkalkulációs típusok a web projektből átvéve

export interface SalaryCalculation {
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

// Magyar adózási konstansok
export const TAX_RATES = {
  SZJA: 0.15, // 15% SZJA
  TB_JARULÉK: 0.185, // 18.5% TB járulék
  SZOC_HOZZAJARULAS: 0.135, // 13.5% szociális hozzájárulási adó (munkáltatói)
} as const;

// Családi adókedvezmény összegek
export const CSALADI_ADOKEDVEZMENY = {
  EGY_GYEREK: 10000,
  KET_GYEREK: 20000,
  HAROM_VAGY_TOBB_GYEREK: 33000,
} as const;
