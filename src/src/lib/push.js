import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "./supabase";

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

// À appeler une fois l'utilisateur connecté (ex: dans NotificationsWatcher).
// Demande la permission, récupère le token FCM de l'appareil, et l'enregistre
// sur le compte pour que l'Edge Function push-notify puisse l'utiliser.
export async function registerPushNotifications(userId) {
  if (!isNativePlatform() || !userId) return;

  const perm = await PushNotifications.checkPermissions();
  if (perm.receive !== "granted") {
    const req = await PushNotifications.requestPermissions();
    if (req.receive !== "granted") return; // l'utilisateur a refusé
  }

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    try {
      await supabase
        .from("profiles")
        .update({ pushToken: token.value, pushPlatform: Capacitor.getPlatform() }) // "android" ou "ios"
        .eq("id", userId);
    } catch {
      // silencieux : ne bloque jamais l'app pour un souci d'enregistrement push
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Erreur d'enregistrement push:", err);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Notification reçue (app ouverte):", notification);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("Notification tapée:", action.notification);
  });
}
