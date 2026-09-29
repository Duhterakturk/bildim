import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import GuestRoute from "./components/common/GuestRoute";
import BadgeToastHost from "./components/badges/BadgeToastHost";
import StarCelebration from "./components/stars/StarCelebration";
import BoardTheme from "./components/owl/BoardTheme";
import TrialBar from "./components/shop/TrialBar";
import { PhotoBackdrop } from "./components/shop/ThemeScene";
import Shop from "./pages/Shop";
import Profile from "./pages/Profile";

import Home from "./pages/Home";
import Games from "./pages/Games";
import GamePage from "./pages/GamePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Forgot from "./pages/Forgot";
import Reset from "./pages/Reset";
import Dashboard from "./pages/Dashboard";
import Exam from "./pages/Exam";
import TeacherPanel from "./pages/TeacherPanel";
import Board from "./pages/Board";

function Shell() {
  const { t } = useTranslation();
  const { connecting } = useAuth();
  const location = useLocation();
  const onBoard = location.pathname.startsWith("/board");
  return (
    <>
      <BoardTheme />
      {!onBoard && <PhotoBackdrop />}
      {!onBoard && <Navbar />}
      {connecting && (
        <p className="relative z-[1] text-center text-sm text-slate-600 py-2" role="status">
          {t("auth.connecting")}
        </p>
      )}
      {!onBoard && <TrialBar />}
      <main key={location.pathname} className={onBoard ? undefined : "page-enter relative z-[1]"}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:slug" element={<GamePage />} />
          <Route path="/dukkan" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route
            path="/exam"
            element={
              <ProtectedRoute>
                <Exam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board/:slug"
            element={
              <ProtectedRoute role="teacher">
                <Board />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute role="teacher">
                <TeacherPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      {!onBoard && <BadgeToastHost />}
      {!onBoard && <StarCelebration />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
