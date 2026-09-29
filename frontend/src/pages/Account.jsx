import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import BadgeGrid from "../components/badges/BadgeGrid";
import ProgressSummary from "../components/progress/ProgressSummary";
import ClassroomJoin from "../components/classroom/ClassroomJoin";
import { StudentHomework } from "../components/classroom/ClassHomework";
import PasswordCard from "../components/auth/PasswordCard";
import NameCard from "../components/auth/NameCard";
import Profile from "./Profile";
import TeacherPanel from "./TeacherPanel";

export function sectionsFor(role) {
  if (role === "teacher") return ["siniflar", "ilerleme", "kazanimlar", "ayarlar"];
  if (role === "student") return ["ilerleme", "sinif", "kazanimlar", "ayarlar"];
  return ["ilerleme", "kazanimlar", "ayarlar"];
}

export default function Account() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const sections = sectionsFor(user?.role);
  const requested = params.get("bolum");
  const section = sections.includes(requested) ? requested : sections[0];

  function open(id) {
    const next = new URLSearchParams(params);
    next.set("bolum", id);
    setParams(next, { replace: true });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="scene-label text-2xl font-bold">{user?.full_name}</h1>
      <p className="scene-label mt-2 mb-5 text-sm">{t(`auth.role_${user?.role}`, { defaultValue: "" })}</p>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label={t("nav.account")}>
        {sections.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            onClick={() => open(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${section === id ? "scene-tab-on" : "scene-chip"}`}
          >
            {t(`account.section.${id}`)}
          </button>
        ))}
      </div>

      {section === "siniflar" && <TeacherPanel embedded />}

      {section === "ilerleme" && (
        <div>
          <p className="mb-4 max-w-xl rounded-xl bg-white/95 px-4 py-3 text-sm text-slate-700">{t("account.progressHelp")}</p>
          <div className="mb-6 flex flex-wrap gap-3">
            <Link to="/games" className="bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold">{t("account.play")}</Link>
            <Link to="/exam" className="bg-white text-slate-800 px-4 py-2 rounded-lg font-semibold border border-slate-200">{t("account.exam")}</Link>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
            <ProgressSummary />
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
            <BadgeGrid />
          </div>
        </div>
      )}

      {section === "sinif" && (
        <div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
            <h2 className="text-lg font-semibold mb-1">{t("account.classTitle")}</h2>
            <p className="text-sm text-slate-600 mb-4">{t("account.classHelp")}</p>
            <ClassroomJoin />
          </div>
          <StudentHomework />
        </div>
      )}

      {section === "kazanimlar" && <Profile embedded />}

      {section === "ayarlar" && (
        <div>
          <NameCard />
          <PasswordCard />
        </div>
      )}
    </div>
  );
}
