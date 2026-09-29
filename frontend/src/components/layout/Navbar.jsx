import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [starBalance, setStarBalance] = useState(user?.star_balance ?? 0);

  useEffect(() => {
    setStarBalance(user?.star_balance ?? 0);
  }, [user]);

  useEffect(() => {
    function onStars(event) {
      if (typeof event.detail?.star_balance === "number") setStarBalance(event.detail.star_balance);
    }
    window.addEventListener("mindarena:stars", onStars);
    return () => window.removeEventListener("mindarena:stars", onStars);
  }, []);

  function toggleLanguage() {
    const next = i18n.language === "tr" ? "en" : "tr";
    i18n.changeLanguage(next);
    localStorage.setItem("mindarena_lang", next);
  }

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/");
  }

  const linkClass = "block sm:inline hover:text-brand-600 py-2 sm:py-0";

  const links = (
    <>
      <Link to="/games" className={linkClass} onClick={() => setMenuOpen(false)}>
        {t("nav.games")}
      </Link>

      {user ? (
        <>
          <Link to="/dukkan" className={linkClass} onClick={() => setMenuOpen(false)}>
            {t("nav.shop")}
          </Link>
          <Link to="/hesabim" className={linkClass} onClick={() => setMenuOpen(false)}>
            {t("nav.account")}
          </Link>
          <button onClick={handleLogout} className={`${linkClass} w-full text-left sm:w-auto`}>
            {t("nav.logout")}
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className={linkClass} onClick={() => setMenuOpen(false)}>
            {t("nav.login")}
          </Link>
          <Link
            to="/register"
            onClick={() => setMenuOpen(false)}
            className="block sm:inline bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 text-center sm:text-left mt-1 sm:mt-0"
          >
            {t("nav.register")}
          </Link>
        </>
      )}

      <button
        onClick={toggleLanguage}
        className="border border-slate-300 rounded-lg px-2 py-1 text-xs uppercase mt-1 sm:mt-0 w-full sm:w-auto"
      >
        {i18n.language === "tr" ? "EN" : "TR"}
      </button>
    </>
  );

  return (
    <nav className="site-nav sticky top-0 z-10 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="brand-link" aria-label={t("app.name")} onClick={() => setMenuOpen(false)}>
          <img className="brand-logo" src="/brand/bildim-logo-light.png" alt="" width="2169" height="725" fetchPriority="high" />
        </Link>

        <div className="flex items-center gap-3">
          {user && <span data-testid="star-balance" className="text-sm font-medium">⭐ {starBalance}</span>}
          <div className="hidden sm:flex items-center gap-4 text-sm font-medium">
            {links}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t("nav.menu")}
            aria-expanded={menuOpen}
            className="sm:hidden p-2 -mr-2 text-inherit"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* sm altı: açılır menü paneli */}
      {menuOpen && (
        <div className="sm:hidden border-t border-slate-200 px-4 py-2 text-sm font-medium">{links}</div>
      )}
    </nav>
  );
}
