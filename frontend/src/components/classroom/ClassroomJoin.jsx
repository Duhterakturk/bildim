import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { joinClassroom, leaveClassroom } from "../../api/classrooms";
import { btnDanger, btnPrimary, btnSecondary } from "../common/buttons";

export default function ClassroomJoin() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await joinClassroom(code);
      await refreshUser();
      setCode("");
    } catch (err) {
      setError(err.response?.data?.error || "Sınıfa katılınamadı. Kodu kontrol edip yeniden deneyebilirsiniz.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    setError(null);
    setBusy(true);
    try {
      await leaveClassroom();
      await refreshUser();
      setConfirmLeave(false);
    } catch (err) {
      setError(err.response?.data?.error || t("account.leaveError"));
    } finally {
      setBusy(false);
    }
  }

  if (user?.classroom_id) {
    const label = user.classroom_name
      ? t("account.joined", { name: user.classroom_name })
      : t("account.joinedUnknown");
    return (
      <div>
        <p className="text-sm text-slate-700">{label}</p>
        {!confirmLeave ? (
          <button type="button" onClick={() => { setError(null); setConfirmLeave(true); }} className={`${btnDanger} mt-3`}>
            {t("account.leave")}
          </button>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-slate-600 mb-3">{t("account.leaveHelp")}</p>
            {error && <p role="alert" className="text-red-700 text-sm mb-2">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleLeave} disabled={busy} className={btnDanger}>
                {t("account.leaveConfirm")}
              </button>
              <button type="button" onClick={() => { setConfirmLeave(false); setError(null); }} disabled={busy} className={btnSecondary}>
                {t("account.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleJoin} className="space-y-2">
      <label htmlFor="class-code" className="block text-sm font-medium">{t("account.codeLabel")}</label>
      <div className="flex flex-wrap gap-2">
        <input
          id="class-code"
          type="text"
          placeholder={t("account.codeLabel")}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="min-w-[12rem] flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase min-h-[44px]"
        />
        <button type="submit" disabled={busy} className={btnPrimary}>
          Katılın
        </button>
      </div>
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    </form>
  );
}
