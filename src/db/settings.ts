import { db } from "./db";
import { SETTINGS_ID, type Settings } from "@/types/settings";

export const defaultSettings: Settings = {
  id: SETTINGS_ID,
  businessName: "",
  businessAddress: "",
  businessLogo: "",
  taxRate: 0,
  defaultCurrency: "USD",
  invoicePrefix: "INV",
  nextInvoiceNumber: 1,
};

export const getSettings = async (): Promise<Settings> =>
  (await db.settings.get(SETTINGS_ID)) ?? defaultSettings;

export const updateSettings = async (patch: Partial<Settings>): Promise<Settings> => {
  const current = await getSettings();
  const next = { ...current, ...patch, id: SETTINGS_ID };
  await db.settings.put(next);
  return next;
};

export const resetSettings = () => db.settings.delete(SETTINGS_ID);
