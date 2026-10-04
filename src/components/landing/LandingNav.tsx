"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { setLocaleAction } from "@/lib/actions/auth";
import { BrandMark, ArrowIcon } from "@/components/shared/Brand";

/** Native dialog provides focus trapping, Escape dismissal and focus restoration. */
export function LandingNav() {
  const { t, locale } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const read = () => setScrolled(window.scrollY > 30);
    const frame = requestAnimationFrame(read);
    window.addEventListener("scroll", read, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", read);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const close = () => setOpen(false);
  const menuLinks = [
    { href: "#features", label: t("landing.navFeatures") },
    { href: "#lecture-log", label: t("classroom.lectureLog") },
    { href: "#engine", label: t("attendance.title") },
    { href: "#journey", label: t("landing.navStory") },
    { href: "#your-path", label: t("classroom.title") },
  ];

  const wordmark = (
    <Link href="/" aria-label={t("app.name")} className="design-wordmark" onClick={close}>
      <BrandMark className="h-12 w-10" />
      <span>{t("app.name")}</span>
    </Link>
  );
  const language = (
    <form action={setLocaleAction}>
      <input type="hidden" name="locale" value={locale === "en" ? "hi" : "en"} />
      <button type="submit" className="design-language" aria-label={t("design.langSwitch")}>
        {locale === "en" ? "हिं" : "EN"}
      </button>
    </form>
  );

  return (
    <>
      <header className="design-header" data-scrolled={scrolled}>
        <div className="design-header-inner">
          <button
            type="button"
            className="design-menu-button"
            aria-expanded={open}
            aria-controls="design-menu"
            onClick={() => setOpen(true)}
          >
            <span className="menu-lines" aria-hidden="true"><i /><i /></span>
            <span>{t("design.menu")}</span>
          </button>
          {wordmark}
          <div className="design-header-right">
            {language}
            <Link href="/login" className="design-header-link">
              {t("action.signIn")} <ArrowIcon direction="diagonal" className="!h-4 !w-4" />
            </Link>
          </div>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id="design-menu"
        className="design-menu-panel"
        aria-label={t("design.navigation")}
        onClose={close}
        onCancel={close}
      >
        <div className="design-header-inner absolute inset-x-0 top-0">
          <button type="button" onClick={close} className="design-menu-button" aria-label={t("design.closeMenu")} aria-expanded="true">
            <span className="menu-lines" aria-hidden="true"><i /><i /></span>
            <span>{t("action.close")}</span>
          </button>
          {wordmark}
          <div className="design-header-right">{language}</div>
        </div>
        <div className="design-container design-menu-content">
          <nav className="design-menu-nav" aria-label={t("design.navigation")}>
            {menuLinks.map((item, index) => (
              <a href={item.href} key={item.href} onClick={close}>
                <span><span className="mr-5 align-middle text-[10px] text-slate-500">0{index + 1}</span>{item.label}</span>
                <ArrowIcon direction="diagonal" />
              </a>
            ))}
          </nav>
          <aside className="design-menu-aside">
            <p className="design-eyebrow">{t("design.heroNote")}</p>
            <p className="design-body mt-5 max-w-sm">{t("design.heroBody")}</p>
            <Link href="/onboarding" onClick={close} className="btn btn-primary btn-editorial mt-8">
              {t("design.start")} <ArrowIcon />
            </Link>
            <p className="mt-4 text-[11px] text-slate-500">{t("landing.noLoginWall")}</p>
          </aside>
        </div>
      </dialog>
    </>
  );
}
