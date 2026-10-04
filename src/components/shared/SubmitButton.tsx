"use client";

import { useFormStatus } from "react-dom";
import { useI18n } from "@/lib/i18n/client";
import { ArrowIcon } from "@/components/shared/Brand";

export function SubmitButton({ label, className = "btn btn-ghost btn-editorial", arrow = true }: {
  label: string;
  className?: string;
  arrow?: boolean;
}) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? <span className="btn-pending"><span className="pending-spinner" aria-hidden="true" />{t("common.loading")}</span> : label}
      {arrow && !pending ? <ArrowIcon /> : null}
    </button>
  );
}
