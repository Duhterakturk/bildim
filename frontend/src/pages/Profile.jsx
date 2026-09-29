import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import Owl from "../components/owl/Owl";
import { chooseTitle, fetchProfile } from "../api/shop";
import { downloadCertificate, fetchMyCertificates } from "../api/certificates";
export default function Profile({ embedded = false }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [certs, setCerts] = useState(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    fetchProfile()
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setError(true); });
    fetchMyCertificates()
      .then((data) => { if (!cancelled) setCerts(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setCerts([]); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6">
        <p role="alert" className="text-sm text-slate-700">{t("profile.loadError")}</p>
        <button type="button" className="mt-3 min-h-[44px] font-semibold text-brand-700" onClick={() => setReloadKey((n) => n + 1)}>
          {t("account.retry")}
        </button>
      </div>
    );
  }
  if (!profile) return <p className="px-4 py-10 text-slate-600" role="status">{t("shop.loading")}</p>;

  const title = profile.active_title;
  const progress = profile.next
    ? Math.min(100, Math.round((1 - profile.next.remaining / (profile.solved + profile.next.remaining)) * 100))
    : 100;

  return (
    <div className={embedded ? "" : "max-w-3xl mx-auto px-4 py-8"}>
      <div className="bg-white text-slate-900 rounded-2xl p-6 text-center">
        <Owl stage={profile.stage} className="w-48 mx-auto" />
        <p className="mt-2 font-semibold" data-testid="collection-progress">
          {t("profile.collection", {
            owned: profile.collection?.owned ?? 0,
            total: profile.collection?.total ?? 12,
          })}
        </p>
        <p className="text-xl font-bold mt-2">{user.full_name}</p>
        <p className="text-slate-600" data-testid="active-title">
          {title ? t(`titles.${title.split(":")[1]}`) : t("profile.noTitle")}
        </p>
        <p className="mt-2 font-semibold">⭐ {profile.star_balance}</p>
        <div className="mt-4 text-left">
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-slate-600 mt-2">
            {profile.next
              ? t("profile.remaining", { stage: t(`stages.${profile.next.stage}`), count: profile.next.remaining })
              : t("profile.maxStage")}
          </p>
        </div>
      </div>

      <section className="bg-white text-slate-900 rounded-2xl p-6 mt-4">
        <h2 className="font-semibold mb-3">{t("profile.titles")}</h2>
        {profile.titles.length === 0 ? (
          <p className="text-sm text-slate-500">{t("profile.noTitlesYet")}</p>
        ) : (
          <ul className="space-y-2">
            {profile.titles.map((row) => {
              const key = `${row.game_slug}:${row.rank}`;
              return (
                <li key={key} className="flex items-center justify-between gap-2 text-sm">
                  <span>{row.game_slug} · {t(`titles.${row.rank}`)}</span>
                  <button type="button" className="font-semibold text-brand-700" onClick={() => chooseTitle(key).then(setProfile)}>
                    {profile.active_title === key ? t("profile.active") : t("profile.use")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-white text-slate-900 rounded-2xl p-6 mt-4">
        <h2 className="font-semibold mb-3">{t("certs.title")}</h2>
        {certs == null ? (
          <p className="text-sm text-slate-600" role="status">{t("shop.loading")}</p>
        ) : certs.length === 0 ? (
          <p className="text-sm text-slate-600">{t("profile.certsEmpty")}</p>
        ) : (
        <ul className="space-y-2">
          {certs.map((row) => (
            <li key={row.kind} className="flex items-center justify-between gap-2 text-sm">
              <span>{t(`certs.${row.kind}`, { need: row.progress.need, count: row.progress.remaining })}</span>
              {row.earned ? (
                <button type="button" className="font-semibold text-brand-700" onClick={() => downloadCertificate(row.id)}>
                  {t("certs.download")}
                </button>
              ) : (
                <span className="text-slate-500">{t(`certs.left.${row.kind.startsWith("puzzles-") ? "puzzles" : row.kind}`, { need: row.progress.need, count: row.progress.remaining })}</span>
              )}
            </li>
          ))}
        </ul>
        )}
      </section>

      <section className="bg-white text-slate-900 rounded-2xl p-6 mt-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">{t("profile.records")}</h2>
        {profile.records.length === 0 ? (
          <p className="text-sm text-slate-500">{t("profile.noRecords")}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {profile.records.map((row) => (
                <tr key={`${row.game_slug}-${row.difficulty}`} className="border-t border-slate-100">
                  <td className="py-2">{row.game_slug}</td>
                  <td>{t(`difficulty.${row.difficulty}`)}</td>
                  <td className="text-right">{row.best_seconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
