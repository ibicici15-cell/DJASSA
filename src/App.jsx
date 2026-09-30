import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BottomNav from "./components/BottomNav";
import HowItWorksIntro from "./components/HowItWorksIntro";
import SplashAnimation from "./components/SplashAnimation";
import ScrollManager from "./components/ScrollManager";
import NotificationsWatcher from "./components/NotificationsWatcher";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";

import Home from "./pages/Home";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SellerProfile from "./pages/SellerProfile";
import Signup from "./pages/Signup";
import Charte from "./pages/Charte";
import BrowseListings from "./pages/BrowseListings";
import ListingDetail from "./pages/ListingDetail";
import PublishListing from "./pages/PublishListing";
import MyListings from "./pages/MyListings";
import Favorites from "./pages/Favorites";
import Messages from "./pages/Messages";
import Subscription from "./pages/Subscription";
import AdminDashboard from "./pages/AdminDashboard";

// Pied de page : complet sur le web. Sur Android, seulement sur l'accueil, et
// toujours avec la place réservée à la barre du bas (fixe, h-16).
function AppFooter() {
  const { pathname } = useLocation();
  if (!Capacitor.isNativePlatform()) return <Footer />;
  return (
    <>
      <div className="pb-16">{pathname === "/" && <Footer />}</div>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <ScrollManager />
        <NotificationsWatcher />
        <SplashAnimation />
        <HowItWorksIntro />
        <Navbar />
        <main className={"min-h-[80vh]"}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/charte" element={<Charte />} />
            <Route path="/connexion" element={<Login />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
            <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
            <Route path="/vendeur/:userId" element={<SellerProfile />} />
            <Route path="/inscription" element={<Signup />} />
            <Route path="/annonces" element={<BrowseListings />} />
            <Route path="/annonces/:id" element={<ListingDetail />} />
            <Route path="/publier" element={<RequireAuth><PublishListing /></RequireAuth>} />
            <Route path="/annonces/:id/modifier" element={<RequireAuth><PublishListing editMode /></RequireAuth>} />
            <Route path="/mes-annonces" element={<RequireAuth><MyListings /></RequireAuth>} />
            <Route path="/favoris" element={<RequireAuth><Favorites /></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
            <Route path="/abonnement" element={<RequireAuth><Subscription /></RequireAuth>} />
            <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          </Routes>
        </main>
        <AppFooter />
      </BrowserRouter>
    </ToastProvider>
    </AuthProvider>
  );
}
