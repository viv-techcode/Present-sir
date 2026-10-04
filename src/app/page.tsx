import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { loadDemoAction } from "@/lib/actions/auth";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroMedia } from "@/components/landing/HeroMedia";
import { AttendancePreview } from "@/components/landing/AttendancePreview";
import { ArrowIcon, BrandMark, ProductIcon } from "@/components/shared/Brand";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Reveal, SplitText, PixelReveal, InfiniteMenu } from "@/components/motion";
import { HorizontalSection } from "@/components/motion/ScrollStory";
import { MotionToggle } from "@/components/motion/Provider";
import { evaluate, formatPct } from "@/lib/attendance-engine";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");
  const { t } = await getI18n();
  const demoAttendance = evaluate({ attended: 27, total: 30 },75);

  const pillars = [
    { title: t("design.attendanceTitle"), body: t("design.attendanceBody"), icon: "attendance", href: "#engine", preview: "attendance" },
    { title: t("design.lectureTitle"), body: t("design.lectureBody"), icon: "lecture", href: "#lecture-log", preview: "lecture" },
    { title: t("design.classroomTitle"), body: t("design.classroomBody"), icon: "classroom", href: "#your-path", preview: "classroom" },
  ];
  const modules: { key: TranslationKey; icon: string; view: string }[] = [
    { key: "classroom.timetable", icon: "clock", view: "timetable" },
    { key: "classroom.lectureLog", icon: "lecture", view: "lecture-log" },
    { key: "classroom.assignments", icon: "planner", view: "assignments" },
    { key: "classroom.exams", icon: "shield", view: "exams" },
    { key: "classroom.resources", icon: "resources", view: "resources" },
    { key: "classroom.groups", icon: "profile", view: "groups" },
  ];
  const journey = [1,2,3,4,5].map((index) => ({
    title: t(`landing.loop${index}Title` as TranslationKey),
    body: t(`landing.loop${index}Body` as TranslationKey),
    icon: ["clock","attendance","lecture","planner","resources"][index - 1],
    stat: String(index).padStart(2,"0"),
  }));

  return (
    <div className="design-site">
      <LandingNav />
      <main id="main-content">
        <section className="design-hero" aria-labelledby="hero-title">
          <HeroMedia />
          <div className="design-hero-shade" aria-hidden="true" />
          <div className="design-container design-hero-content">
            <Reveal direction="up"><p className="design-eyebrow">{t("design.heroEyebrow")}</p></Reveal>
            <h1 id="hero-title" className="design-hero-title">
              <span><SplitText text={t("design.heroLine1")} delay={100} /></span>
              <span><SplitText text={t("design.heroLine2")} delay={200} /></span>
            </h1>
            <Reveal delay={250}><p className="design-body">{t("design.heroBody")}</p></Reveal>
            <Reveal delay={350}>
              <div className="design-hero-actions">
                <Link href="/onboarding" className="btn btn-primary btn-editorial">{t("design.start")}<ArrowIcon /></Link>
                <form action={loadDemoAction}><SubmitButton label={t("design.explore")} /></form>
              </div>
              <div className="design-hero-meta">
                <span><ProductIcon name="check" className="!h-3 !w-3" />{t("landing.noLoginWall")}</span>
                <span>{t("design.footerLanguage")}</span>
              </div>
            </Reveal>
          </div>
          <div className="design-hero-bottom">
            <div className="design-container">
              <a href="#features"><ArrowIcon direction="down" className="!h-4 !w-4" />{t("design.scroll")}</a>
              <p className="design-hero-caption">{t("design.heroCaption")}</p>
              <span className="h-12 w-12" aria-hidden="true" />
            </div>
          </div>
          <div className="hero-horizon" aria-hidden="true" />
        </section>

        <div className="design-container">
          <div className="design-spec-row">
            <div className="design-spec"><BrandMark className="h-11 w-9 shrink-0" /><p className="design-spec-label !max-w-[230px]">{t("design.edition")}</p></div>
            <div className="design-spec"><span className="design-spec-number">3s</span><p className="design-spec-label">{t("landing.stat1Label")}</p></div>
            <div className="design-spec"><span className="design-spec-number">0</span><p className="design-spec-label">{t("landing.stat2Label")}</p></div>
            <div className="design-spec"><span className="design-spec-number">11</span><p className="design-spec-label">{t("landing.stat4Label")}</p></div>
          </div>
        </div>

        <section id="features" className="design-section" aria-labelledby="features-title">
          <div className="design-container">
            <div className="design-section-top">
              <Reveal><p className="design-eyebrow">{t("design.pillarsLabel")}</p><h2 id="features-title" className="design-heading">{t("design.pillarsTitle")}</h2></Reveal>
              <Reveal delay={120}><p className="design-body">{t("design.pillarsBody")}</p></Reveal>
            </div>
            <div className="design-pillars">
              {pillars.map((pillar,index) => (
                <Reveal key={pillar.href} delay={index * 80} className="h-full">
                  <article className="design-pillar h-full">
                    <div className="design-pillar-top"><ProductIcon name={pillar.icon} className="!h-7 !w-7" /><span>0{index + 1}</span></div>
                    <h3>{pillar.title}</h3>
                    <p className="design-body">{pillar.body}</p>
                    <div className="design-pillar-preview">
                      {pillar.preview === "attendance" ? <div className="flex items-end justify-between gap-3"><span className="design-pillar-value">{formatPct(demoAttendance.pct,0)}</span><span className="text-right text-[10px] leading-relaxed text-slate-400">DBMS / {t("auth.guest")}<br />{t("home.safeSkips",{ count: demoAttendance.safeSkips })}</span></div> : null}
                      {pillar.preview === "lecture" ? <div><p className="design-eyebrow mb-2">DBMS / {t("common.published")}</p><p className="text-[14px] leading-relaxed text-white">{t("design.previewTopic")}</p></div> : null}
                      {pillar.preview === "classroom" ? <div className="design-mini-track" aria-hidden="true">{[48,68,42,85,58,100].map((height,index) => <i key={index} style={{ height: `${height}%` }} />)}</div> : null}
                    </div>
                    <a href={pillar.href} className="design-pillar-link">{t("design.learn")}<ArrowIcon direction="diagonal" className="!h-4 !w-4" /></a>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="lecture-log" className="design-section design-lecture-section" aria-labelledby="lecture-title">
          <div className="design-container design-editorial-grid">
            <div className="design-editorial-media">
              <PixelReveal className="design-editorial-photo"><Image src="/images/lecture-editorial.jpg" alt={t("design.photoAlt")} fill sizes="(max-width:767px) 100vw, 50vw" className="object-cover" /></PixelReveal>
              <Reveal delay={160} className="design-log-sample">
                <div className="design-sample-top"><p className="design-eyebrow !text-[8px]">{t("design.preview")}</p><span className="design-sample-status"><ProductIcon name="check" className="!h-3 !w-3" />{t("common.published")}</span></div>
                <h3>{t("design.previewTopic")}</h3>
                <p className="mt-2 text-[11px] text-slate-500">{t("design.previewSubject")} / 09:00–10:00</p>
                <ul>
                  <li><ProductIcon name="check" />{t("design.previewPoint1")}</li>
                  <li><ProductIcon name="check" />{t("design.previewPoint2")}</li>
                </ul>
                <div className="design-sample-links">
                  <form action={loadDemoAction}><input type="hidden" name="view" value="resources" /><input type="hidden" name="type" value="notes" /><SubmitButton label={t("design.notes")} className="" arrow={false} /></form>
                  <form action={loadDemoAction}><input type="hidden" name="view" value="resources" /><input type="hidden" name="type" value="pyq" /><SubmitButton label={t("design.pyq")} className="" arrow={false} /></form>
                </div>
              </Reveal>
            </div>
            <div className="design-editorial-copy">
              <Reveal><p className="design-eyebrow">{t("design.lectureLabel")}</p><h2 id="lecture-title" className="design-heading">{t("design.lectureHeading")}</h2></Reveal>
              <Reveal delay={120}><p className="design-lecture-quote">{t("design.lectureIntro")}</p><p className="design-body">{t("design.lectureDetail")}</p></Reveal>
              <Reveal delay={220}><form action={loadDemoAction} className="mt-8"><input type="hidden" name="view" value="lecture-log" /><SubmitButton label={t("design.openClassroom")} /></form></Reveal>
            </div>
          </div>
        </section>

        <section id="engine" className="design-section" aria-labelledby="engine-title">
          <div className="design-container design-editorial-grid">
            <div>
              <Reveal><p className="design-eyebrow">{t("design.engineLabel")}</p><h2 id="engine-title" className="design-heading">{t("design.engineTitle")}</h2></Reveal>
              <Reveal delay={100}><p className="design-body mt-6 max-w-md">{t("design.engineBody")}</p></Reveal>
              <div className="design-engine-principles">
                {[{ icon: "attendance", title: "design.exact", body: "design.exactBody" },{ icon: "shield", title: "design.cancelled", body: "design.cancelledBody" },{ icon: "profile", title: "design.solo", body: "design.soloBody" }].map((item,index) => (
                  <Reveal key={item.title} delay={index * 60}><div className="design-principle"><ProductIcon name={item.icon} className="mt-0.5" /><div><h3>{t(item.title as TranslationKey)}</h3><p>{t(item.body as TranslationKey)}</p></div></div></Reveal>
                ))}
              </div>
              <form action={loadDemoAction} className="mt-7"><input type="hidden" name="view" value="what-if" /><SubmitButton label={t("design.simulator")} /></form>
            </div>
            <Reveal direction="up" delay={160}><AttendancePreview /></Reveal>
          </div>
        </section>

        <section id="journey" aria-label={t("design.journeyTitle")}>
          <HorizontalSection items={journey} label={t("design.journeyLabel")} title={t("design.journeyTitle")} hint={t("landing.scrollPlayHint")} />
        </section>

        <section className="design-section design-connections" aria-labelledby="connections-title">
          <div className="design-container">
            <div className="design-section-top">
              <Reveal><p className="design-eyebrow">{t("design.connectLabel")}</p><h2 id="connections-title" className="design-heading">{t("design.connectTitle")}</h2></Reveal>
              <Reveal delay={100}><p className="design-body">{t("design.connectBody")}</p></Reveal>
            </div>
            <div className="design-module-grid">
              {modules.map((module) => (
                <form key={module.key} action={loadDemoAction}>
                  <input type="hidden" name="view" value={module.view} />
                  <button type="submit" className="design-module-item w-full text-left"><span className="design-module-title"><ProductIcon name={module.icon} />{t(module.key)}</span><ArrowIcon direction="diagonal" /></button>
                </form>
              ))}
            </div>
          </div>
        </section>

        <section id="your-path" className="design-section" aria-labelledby="path-title">
          <div className="design-container">
            <Reveal><p className="design-eyebrow">{t("design.pathLabel")}</p><h2 id="path-title" className="design-heading">{t("design.pathTitle")}</h2></Reveal>
            <div className="design-paths">
              <Reveal><div className="design-path h-full"><ProductIcon name="profile" className="!h-8 !w-8" /><h3>{t("design.soloTitle")}</h3><p className="design-body">{t("design.soloDescription")}</p><Link href="/onboarding" className="btn btn-primary btn-editorial w-fit">{t("design.start")}<ArrowIcon /></Link></div></Reveal>
              <Reveal delay={100}><div className="design-path h-full"><ProductIcon name="classroom" className="!h-8 !w-8" /><h3>{t("design.classTitle")}</h3><p className="design-body">{t("design.classDescription")}</p><div className="mt-auto flex flex-wrap items-center gap-4"><Link href="/classrooms/join" className="btn btn-ghost btn-editorial">{t("design.join")}<ArrowIcon /></Link><Link href="/classrooms/create" className="design-inline-link">{t("design.create")}<ArrowIcon direction="diagonal" className="!h-4 !w-4" /></Link></div></div></Reveal>
            </div>
          </div>
        </section>

        <div className="border-t border-white/10 py-8">
          <InfiniteMenu speed={.3} items={["attendance.whatIf","attendance.bunkBudget","attendance.leavePlanner","attendance.forecast","classroom.lectureLog","classroom.resources","nav.planner","nav.search"].map((key) => ({ label: t(key as TranslationKey), href: "/onboarding" }))} />
        </div>
      </main>
      <footer className="design-footer">
        <div className="design-container">
          <div className="design-footer-top"><div><Link href="/" className="design-wordmark" aria-label={t("app.name")}><BrandMark className="h-12 w-10" /><span>{t("app.name")}</span></Link><p className="mt-4 text-[12px] text-slate-400">{t("design.footerLine")}</p></div><div className="design-footer-links"><Link href="/login">{t("action.signIn")}</Link><Link href="/onboarding">{t("design.start")}</Link><a href="#features">{t("landing.navFeatures")}</a></div></div>
          <div className="design-footer-bottom"><p>© {new Date().getFullYear()} {t("app.name")}<br />{t("design.footerNote")}</p><p>{t("design.footerTheme")}</p><div className="design-footer-motion"><span>{t("design.settingsMotion")}</span><MotionToggle /></div></div>
        </div>
      </footer>
    </div>
  );
}
