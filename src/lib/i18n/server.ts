import { cache } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createTranslator, type Locale, type Translator } from "./dictionaries";

export const LOCALE_COOKIE = "ps_locale";

export const getLocale = cache(async (): Promise<Locale> => {
  const jar = await cookies();
  const cookieLocale = jar.get(LOCALE_COOKIE)?.value;
  if (cookieLocale === "en" || cookieLocale === "hi") return cookieLocale;
  const user = await getCurrentUser();
  if (user?.locale === "hi" || user?.locale === "en") return user.locale;
  return "en";
});

export const getI18n = cache(async (): Promise<{ locale: Locale; t: Translator }> => {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
});
