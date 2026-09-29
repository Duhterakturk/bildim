import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../api/auth";
import { apiErrorText, apiFailure } from "../i18n/apiError";

export default function Reset() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(apiFailure(err, "errors.unknown"));
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">{t("auth.reset_title")}</h1>

      {!token && <p className="text-sm text-red-500">{t("auth.reset_missing")}</p>}

      {done ? (
        <p className="text-sm text-slate-700">
          {t("auth.reset_done")}{" "}
          <Link to="/login" className="text-brand-600 font-medium">
            {t("auth.login_button")}
          </Link>
        </p>
      ) : (
        token && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder={t("auth.new_password")}
              required
              minLength={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p role="alert" className="text-red-500 text-sm">{apiErrorText(error, t, i18n)}</p>}
            <button
              type="submit"
              className="w-full bg-brand-500 text-white py-2 rounded-lg font-semibold hover:bg-brand-600"
            >
              {t("auth.reset_button")}
            </button>
          </form>
        )
      )}
    </div>
  );
}
