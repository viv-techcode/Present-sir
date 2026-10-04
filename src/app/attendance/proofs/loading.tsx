import { PageLoader } from "@/components/motion/Skeleton";
import { getI18n } from "@/lib/i18n/server";

export default async function RouteLoading() {
  const { t } = await getI18n();
  return <PageLoader label={t("common.loading")} />;
}
