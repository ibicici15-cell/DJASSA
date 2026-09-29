import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "./supabase";

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

let listenersReady = false;
let currentUserId = null;

// Les listeners ne doivent être ajoutés qu'UNE fois, et AVANT register() :
// sinon l'événement "registration" (le token FCM) peut arriver avant qu'on
// l'écoute et le token n'est jamais enregistré sur le profil.
function setupListeners() {
  if (listenersReady) return;
  listenersReady = true;

  PushNotifications.addListener("registration", async (token) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ pushToken: token.value, pushPlatform: Capacitor.getPlatform() })
        .eq("id", currentUserId);
      if (error) console.error("Enregistrement du token push refusé:", error.message);
    } catch (e) {
      console.error("Enregistrement du token push échoué:", e);
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Erreur d'enregistrement push:", err);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Notification reçue (app ouverte):", notification);
  });

  // Tap sur une notification (app en arrière-plan ou fermée) -> ouvre la bonne page.
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const data = action.notification?.data || {};
    if (data.type === "message") window.location.assign("/messages");
    else if (data.type === "subscription" || data.type === "boost") window.location.assign("/abonnement");
  });
}

// À appeler une fois l'utilisateur connecté (ex: dans NotificationsWatcher).
export async function registerPushNotifications(userId) {
  if (!isNativePlatform() || !userId) return;
  currentUserId = userId;

  setupListeners();

  const perm = await PushNotifications.checkPermissions();
  if (perm.receive !== "granted") {
    const req = await PushNotifications.requestPermissions();
    if (req.receive !== "granted") return; // l'utilisateur a refusé
  }

  // Canal Android à forte importance : sans lui, les notifications arrivent
  // en silence, sans bannière, dans un canal "Divers".
  if (Capacitor.getPlatform() === "android") {
    try {
      await PushNotifications.createChannel({
        id: "messages",
        name: "Messages et demandes",
        description: "Nouveaux messages et réponses à vos demandes",
        importance: 5,
        visibility: 1,
        vibration: true,
      });
    } catch { /* ignore */ }
  }

  await PushNotifications.register();
}
