export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "PT", name: "Portugal", dialCode: "351" },
  { code: "BR", name: "Brasil", dialCode: "55" },
  { code: "ES", name: "España", dialCode: "34" },
  { code: "US", name: "United States", dialCode: "1" },
  { code: "GB", name: "United Kingdom", dialCode: "44" },
  { code: "FR", name: "France", dialCode: "33" },
  { code: "DE", name: "Deutschland", dialCode: "49" },
  { code: "IT", name: "Italia", dialCode: "39" },
  { code: "MX", name: "México", dialCode: "52" },
  { code: "AR", name: "Argentina", dialCode: "54" },
  { code: "CO", name: "Colombia", dialCode: "57" },
  { code: "CL", name: "Chile", dialCode: "56" },
  { code: "PE", name: "Perú", dialCode: "51" },
  { code: "VE", name: "Venezuela", dialCode: "58" },
  { code: "IN", name: "India", dialCode: "91" },
  { code: "AO", name: "Angola", dialCode: "244" },
  { code: "MZ", name: "Moçambique", dialCode: "258" },
  { code: "CV", name: "Cabo Verde", dialCode: "238" },
  { code: "CA", name: "Canada", dialCode: "1" },
  { code: "AU", name: "Australia", dialCode: "61" },
];
