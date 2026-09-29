import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

export default function GuestRoute({ children }) {
  const { user, loading, connecting } = useAuth();
  const { t } = useTranslation();
  if (user) return <Navigate to="/" replace />;
  if (loading || connecting) {
    return <p role="status" className="px-4 py-10 text-center">{t("auth.connecting")}</p>;
  }
  return children;
}
