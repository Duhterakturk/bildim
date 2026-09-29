import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { btnPrimary } from "../common/buttons";
import { apiErrorText, apiFailure } from "../../i18n/apiError";

export default function NameCard() {
  const { t, i18n } = useTranslation();
  const { saveName, user } = useAuth();
  const [name, setName] = useState(user?.full_name || "");

  useEffect(() => {
    if (user?.full_name) setName(user.full_name);
  }, [user?.full_name]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveName(name.trim());
      setSaved(true);
    } catch (err) {
      setError(apiFailure(err, "profile.nameError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white text-slate-900 rounded-2xl p-6 my-4">
      <h2 className="font-semibold mb-2">{t("profile.editName")}</h2>
      <p className="text-sm text-slate-600 mb-4">{t("profile.nameHelp")}</p>
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="profile-name" className="block text-sm font-medium">{t("auth.full_name")}</label>
        <input id="profile-name" name="full_name" type="text" autoComplete="name"
          required maxLength={255} value={name} disabled={busy}
          onChange={(event) => { setName(event.target.value); setSaved(false); }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        <button type="submit" disabled={busy || !name.trim()}
          className={`${btnPrimary} disabled:opacity-50`}>
          {t(busy ? "play.saving" : "profile.saveName")}
        </button>
        {error && <p role="alert" className="text-red-600 text-sm">{apiErrorText(error, t, i18n)}</p>}
        {saved && <p role="status" className="text-green-700 text-sm">{t("profile.nameSaved")}</p>}
      </form>
    </section>
  );
}
