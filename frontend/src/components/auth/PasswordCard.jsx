import { useState } from "react";
import { useTranslation } from "react-i18next";
import { changePassword, saveReminder } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { btnPrimary, btnSecondary } from "../common/buttons";

export default function PasswordCard() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [reminderPassword, setReminderPassword] = useState("");
  const [reminder, setReminder] = useState("");
  const [reminderMessage, setReminderMessage] = useState(null);
  const [reminderError, setReminderError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage(t("auth.password_changed"));
    } catch (err) {
      setError(err.response?.data?.error || "Şifre değiştirilemedi. Bilgilerinizi kontrol edip yeniden deneyebilirsiniz.");
    }
  }

  async function handleReminder(e) {
    e.preventDefault();
    setReminderError(null);
    setReminderMessage(null);
    try {
      await saveReminder(reminderPassword, reminder);
      setReminderPassword("");
      setReminder("");
      setReminderMessage(t("auth.reminder_saved"));
      await refreshUser();
    } catch (err) {
      setReminderError(err.response?.data?.error || "Hatırlatma kelimesi kaydedilemedi. Yeniden deneyebilirsiniz.");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 mb-6">
      <h2 className="text-lg font-semibold mb-4">{t("auth.change_password")}</h2>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <label htmlFor="current-password" className="block text-sm font-medium">{t("auth.current_password")}</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          placeholder={t("auth.current_password")}
          required
          className="w-full border border-slate-200 rounded-lg px-3 py-2 min-h-[44px]"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <label htmlFor="new-password" className="block text-sm font-medium">{t("auth.new_password")}</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.new_password")}
          required
          minLength={8}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 min-h-[44px]"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
        {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
        <button type="submit" className={btnPrimary}>
          {t("auth.save_password")}
        </button>
      </form>

      <form onSubmit={handleReminder} className="space-y-3 max-w-sm mt-6 pt-6 border-t border-slate-100">
        <h3 className="font-semibold">{t("auth.reminder_label")}</h3>
        <p className="text-sm text-slate-500">{t("auth.reminder_help")}</p>
        <label htmlFor="reminder-password" className="block text-sm font-medium">{t("auth.current_password")}</label>
        <input
          id="reminder-password"
          type="password"
          autoComplete="current-password"
          placeholder={t("auth.current_password")}
          required
          className="w-full border border-slate-200 rounded-lg px-3 py-2 min-h-[44px]"
          value={reminderPassword}
          onChange={(e) => setReminderPassword(e.target.value)}
        />
        <label htmlFor="reminder-word" className="block text-sm font-medium">{t("auth.reminder_label")}</label>
        <input
          id="reminder-word"
          type="text"
          placeholder={t("auth.reminder_label")}
          required
          minLength={3}
          autoComplete="off"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 min-h-[44px]"
          value={reminder}
          onChange={(e) => setReminder(e.target.value)}
        />
        {reminderError && <p role="alert" className="text-red-700 text-sm">{reminderError}</p>}
        {reminderMessage && <p className="text-sm text-slate-700">{reminderMessage}</p>}
        <button type="submit" className={btnSecondary}>
          {t("auth.save_reminder")}
        </button>
      </form>
    </div>
  );
}
