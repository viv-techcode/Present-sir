"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";
import { signOutAction, setLocaleAction } from "@/lib/actions/auth";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { BrandMark, ProductIcon } from "@/components/shared/Brand";

interface NavItem { href: string; key: TranslationKey; icon: string; primary: boolean }

export function AppShell({ children, user, classroomHref, unread }: {
  children: ReactNode;
  user: { name: string; isGuest: boolean; email: string | null };
  classroomHref: string;
  unread: number;
}) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: "/home", key: "nav.home", icon: "home", primary: true },
    { href: "/attendance", key: "nav.attendance", icon: "attendance", primary: true },
    { href: classroomHref, key: "nav.classroom", icon: "classroom", primary: true },
    { href: "/planner", key: "nav.planner", icon: "planner", primary: true },
    { href: "/search", key: "nav.search", icon: "search", primary: false },
    { href: "/profile", key: "nav.profile", icon: "profile", primary: false },
    { href: "/settings", key: "nav.settings", icon: "settings", primary: false },
  ];
  const isActive = (item: NavItem) => item.key === "nav.classroom"
    ? pathname.startsWith("/classrooms")
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const initials = user.name.split(" ").map((part) => part[0]).slice(0,2).join("").toUpperCase();

  const navLink = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isActive(item) ? "page" : undefined}
      className={`nav-link ${isActive(item) ? "nav-link-active" : ""}`}
    >
      <ProductIcon name={item.icon} />
      <span>{t(item.key)}</span>
      {item.key === "nav.classroom" && unread > 0 ? <span className="ml-auto border border-white/20 px-2 py-0.5 text-[10px] text-white">{unread}</span> : null}
    </Link>
  );

  return (
    <div className="app-shell lg:flex">
      <aside className="app-sidebar hidden lg:flex">
        <div>
          <Link href="/home" className="flex items-center gap-3 px-3" aria-label={t("app.name")}>
            <BrandMark className="h-12 w-10" />
            <span className="min-w-0">
              <span className="brand-name block">{t("app.name")}</span>
              <span className="mt-1 block text-[9px] uppercase tracking-[.12em] text-slate-500">{t("design.workspace")}</span>
            </span>
          </Link>
          <p className="label">{t("design.primaryNav")}</p>
          <nav className="flex flex-col gap-1" aria-label={t("design.primaryNav")}>{items.filter((item) => item.primary).map(navLink)}</nav>
          <p className="label">{t("design.secondaryNav")}</p>
          <nav className="flex flex-col gap-1" aria-label={t("design.secondaryNav")}>{items.filter((item) => !item.primary).map(navLink)}</nav>
        </div>
        <div className="grid gap-3">
          <div className="flex items-center gap-3 border-t border-white/10 px-3 pt-5">
            <span className="avatar-mark shrink-0" aria-hidden="true">{initials}</span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] text-white">{user.name}</span>
              <span className="mt-1 block truncate text-[10px] text-slate-500">{user.isGuest ? t("auth.guest") : user.email}</span>
            </span>
          </div>
          <div className="flex items-center justify-between px-3">
            <LanguageSwitch locale={locale} compact />
            <form action={signOutAction}>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 text-[10px] uppercase tracking-[.06em] text-slate-400 hover:text-white">
                <ProductIcon name="logout" className="!h-4 !w-4" /> {t("action.signOut")}
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-mobile-top lg:hidden">
          <Link href="/home" className="flex items-center gap-2" aria-label={t("app.name")}>
            <BrandMark className="h-10 w-8" />
            <span className="text-[12px] font-medium uppercase tracking-[.08em]">{t("app.name")}</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/search" className="grid h-11 w-11 place-items-center" aria-label={t("nav.search")}><ProductIcon name="search" /></Link>
            <LanguageSwitch locale={locale} compact />
            <Link href="/profile" className="avatar-mark" aria-label={t("nav.profile")}>{initials}</Link>
          </div>
        </header>

        <header className="app-topbar hidden lg:flex">
          <p className="app-topbar-title">{t("design.heroNote")}</p>
          <div className="flex items-center gap-6">
            <Link href="/search" className="flex min-h-11 items-center gap-2 text-[11px] text-slate-400 hover:text-white"><ProductIcon name="search" className="!h-4 !w-4" />{t("nav.search")}</Link>
            {unread > 0 ? <Link href={classroomHref} className="text-[11px] text-slate-400" aria-label={t("design.notifications")}>{t("design.notifications")} <span className="ml-2 border border-white/20 px-2 py-1 text-white">{unread}</span></Link> : null}
            <Link href="/profile" className="avatar-mark" aria-label={t("nav.profile")}>{initials}</Link>
          </div>
        </header>

        <main id="main-content" className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <nav className="app-bottom-nav lg:hidden" aria-label={t("design.primaryNav")}>
        {items.filter((item) => item.primary).map((item) => (
          <Link key={item.href} href={item.href} className="app-bottom-link" aria-current={isActive(item) ? "page" : undefined}>
            <ProductIcon name={item.icon} className="!h-[21px] !w-[21px]" />
            <span>{t(item.key)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function LanguageSwitch({ locale, compact = false }: { locale: string; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <form action={setLocaleAction}>
      <input type="hidden" name="locale" value={locale === "en" ? "hi" : "en"} />
      <button type="submit" className={`btn btn-ghost btn-sm ${compact ? "" : "btn-block"}`} aria-label={t("design.langSwitch")}>
        {locale === "en" ? "हिं" : "EN"}
      </button>
    </form>
  );
}

export function NoChrome({ children }: { children: ReactNode }) { return <div className="min-h-screen">{children}</div>; }
