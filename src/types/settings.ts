export const SETTINGS_ID = "app-settings";

export interface Settings {
  id: string;
  businessName: string;
  businessAddress: string;
  businessLogo: string; // base64
  taxRate: number;
  defaultCurrency: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
}

export interface CurrencyOption {
  code: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "AED", label: "AED — UAE Dirham" },
];
