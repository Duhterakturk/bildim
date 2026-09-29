import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { apiErrorText, apiFailure } from "../i18n/apiError";

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(form);
      navigate("/hesabim", { replace: true });
    } catch (err) {
      setError(apiFailure(err, "errors.unknown"));
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">{t("auth.login_button")}</h1>

      <form method="post" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            {t("auth.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder={t("auth.email")}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            {t("auth.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder={t("auth.password")}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {error && <p role="alert" className="text-red-500 text-sm">{apiErrorText(error, t, i18n)}</p>}

        <p className="text-sm">
          <Link to="/forgot" className="text-brand-600 font-medium">
            {t("auth.forgot_link")}
          </Link>
        </p>

        <button
          type="submit"
          className="w-full bg-brand-500 text-white py-2 rounded-lg font-semibold hover:bg-brand-600"
        >
          {t("auth.login_button")}
        </button>
      </form>

      <p className="text-sm text-slate-500 mt-4">
        {t("auth.no_account")}{" "}
        <Link to="/register" className="text-brand-600 font-medium">
          {t("auth.register_button")}
        </Link>
      </p>
    </div>
  );
}
