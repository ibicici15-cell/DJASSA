import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { checkForNotifications, checkExpiryReminders } from "../lib/notifications";
import { registerPushNotifications } from "../lib/push";

// Ne rend rien à l'écran : vérifie juste, à la connexion, si des demandes
// (abonnement/boost) ont été traitées depuis la dernière visite, et affiche
// un toast pour chacune.
export default function NotificationsWatcher() {
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    checkForNotifications(user.id, showToast);
    checkExpiryReminders(user.id, showToast);
    registerPushNotifications(user.id); // no-op sur le web, actif seulement dans l'app mobile
  }, [user?.id]);

  return null;
}
