import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../i18n";

export default function ProductMetadata() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  useEffect(() => {
    const title = t("Flowdesck — Your AI-powered rental business assistant.");
    const description = t(
      "Manage your fleet, streamline bookings and make smarter operational decisions — all from one workspace.",
    );
    document.title =
      pathname === "/business-plan"
        ? t("Business plan") + " · Flowdesck"
        : title;
    document.querySelector('meta[name="description"]').content = description;
    document.querySelector('meta[property="og:title"]').content =
      document.title;
    document.querySelector('meta[property="og:description"]').content =
      description;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    if (pathname === "/business-plan") document.head.append(robots);
    return () => robots.remove();
  }, [pathname, t]);
  return null;
}
