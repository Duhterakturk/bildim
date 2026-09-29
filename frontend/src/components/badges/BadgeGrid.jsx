import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchBadges, fetchMyBadges } from "../../api/badges";

export default function BadgeGrid() {
  const { t, i18n } = useTranslation();
  const [badges, setBadges] = useState([]);
  const [earnedMap, setEarnedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([fetchBadges(), fetchMyBadges()])
      .then(([allBadges, myBadges]) => {
        if (cancelled) return;
        setBadges(Array.isArray(allBadges) ? allBadges : []);
        const map = {};
        (Array.isArray(myBadges) ? myBadges : []).forEach((b) => {
          map[b.slug] = b.earned_at;
        });
        setEarnedMap(map);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) return <p className="text-slate-600 text-sm" role="status">{t("shop.loading")}</p>;
  if (error) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">{t("account.badgesTitle")}</h3>
        <p role="alert" className="text-sm text-slate-700">{t("account.badgesError")}</p>
        <button type="button" className="mt-3 min-h-[44px] font-semibold text-brand-700" onClick={() => setReloadKey((n) => n + 1)}>
          {t("account.retry")}
        </button>
      </div>
    );
  }
  if (badges.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">{t("account.badgesTitle")}</h3>
        <p className="text-sm text-slate-700">{t("account.badgesEmpty")}</p>
        <p className="text-sm text-slate-600 mt-1">{t("account.badgesEmptyHelp")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {badges.map((badge) => {
        const earned = Boolean(earnedMap[badge.slug]);
        const name = i18n.language === "tr" ? badge.name_tr : badge.name_en;
        const description = i18n.language === "tr" ? badge.description_tr : badge.description_en;
        return (
          <div
            key={badge.slug}
            title={description}
            className={[
              "flex flex-col items-center text-center p-4 rounded-xl border",
              earned
                ? "bg-amber-50 border-amber-200"
                : "bg-slate-50 border-slate-200 opacity-50 grayscale",
            ].join(" ")}
          >
            <span className="text-3xl mb-1">{badge.icon}</span>
            <span className="text-xs font-semibold text-slate-700">{name}</span>
            <span className="text-[11px] text-slate-500 mt-1">{description}</span>
          </div>
        );
      })}
    </div>
  );
}
