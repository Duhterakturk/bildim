import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { recoverPassword } from "../api/auth";

export default function Forgot() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [reminder, setReminder] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await recoverPassword(email, reminder, password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || "Şifre yenilenemedi. Bilgilerinizi kontrol edip yeniden deneyebilirsiniz.");
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-3">{t("auth.forgot_title")}</h1>
      <p className="text-sm text-slate-600 mb-6">{t("auth.forgot_help")}</p>

      {done ? (
        <p className="text-sm text-slate-700">
          {t("auth.forgot_sent")}{" "}
          <Link to="/login" className="text-brand-600 font-medium">
            {t("auth.login_button")}
          </Link>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder={t("auth.email")}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="text"
            placeholder={t("auth.reminder_label")}
            required
            minLength={3}
            autoComplete="off"
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          />
          <input
            type="password"
            placeholder={t("auth.new_password")}
            required
            minLength={8}
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-brand-500 text-white py-2 rounded-lg font-semibold hover:bg-brand-600"
          >
            {t("auth.send_link")}
          </button>
        </form>
      )}

      {!done && (
        <p className="text-sm text-slate-500 mt-4">
          <Link to="/login" className="text-brand-600 font-medium">
            {t("auth.login_button")}
          </Link>
        </p>
      )}
    </div>
  );
}
