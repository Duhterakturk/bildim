import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import BadgeGrid from "../components/badges/BadgeGrid";
import ProgressSummary from "../components/progress/ProgressSummary";
import ClassroomJoin from "../components/classroom/ClassroomJoin";
import { StudentHomework } from "../components/classroom/ClassHomework";
import PasswordCard from "../components/auth/PasswordCard";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">{t("nav.dashboard")}</h1>
      <p className="text-slate-600 mb-8">
        {user?.full_name} — {t(`auth.role_${user?.role}`)}
      </p>

      <Link to="/exam" className="board-card mb-6 block p-5">
        <span className="font-display text-2xl">{t("exam.title")}</span>
        <span className="block text-sm text-stone-600 mt-1">{t("exam.short")}</span>
      </Link>

      {user?.role === "student" && <StudentHomework />}

      {user?.role === "student" && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
          <h2 className="text-lg font-semibold mb-3">{t("exam.class")}</h2>
          <ClassroomJoin />
        </div>
      )}

      <PasswordCard />

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t("exam.progress")}</h2>
        <ProgressSummary />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-lg font-semibold mb-4">{t("exam.badges")}</h2>
        <BadgeGrid />
      </div>
    </div>
  );
}
