// supabase/functions/push-notify/index.ts
//
// Remplace à la fois pb_hooks/push.pb.js (déclenchement) et
// push-relay/server.js (envoi réel à Firebase Cloud Messaging) : une seule
// fonction, appelée par 3 Database Webhooks Supabase (voir
// supabase/DATABASE_WEBHOOKS.md) :
//   - INSERT sur "messages"              -> notifie le destinataire
//   - UPDATE sur "subscriptionRequests"  -> notifie si validée/refusée
//   - UPDATE sur "boostRequests"         -> notifie si validée/refusée
//
// Secrets requis (à définir avec `supabase secrets set ...`) :
//   FCM_SERVICE_ACCOUNT   -> contenu JSON complet du compte de service Firebase
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont déjà fournis automatiquement
//   par la plateforme à toutes les Edge Functions.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ---------- Authentification Google (OAuth2 JWT Bearer) pour FCM HTTP v1 ----------

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of buf) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const serviceAccount = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT")!);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(new TextEncoder().encode(JSON.stringify(header)))}.${base64url(
    new TextEncoder().encode(JSON.stringify(claims))
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error("Échec OAuth2 Google : " + (await res.text()));
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function sendPush(userId: string, title: string, body: string, data: Record<string, string> = {}) {
  const { data: profile } = await supabase
    .from("profiles")
    .select('"pushToken"')
    .eq("id", userId)
    .maybeSingle();

  const token = profile?.pushToken;
  if (!token) return; // pas d'app mobile / push non activé

  try {
    const serviceAccount = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT")!);
    const accessToken = await getAccessToken();
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: { token, notification: { title, body }, data },
        }),
      }
    );
    if (!res.ok) console.log("[push] échec d'envoi FCM :", await res.text());
  } catch (err) {
    console.log("[push] erreur d'envoi :", err);
  }
}

// ---------- Routage selon la table à l'origine du webhook ----------

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    if (table === "messages" && type === "INSERT") {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("participants")
        .eq("id", record.conversation)
        .maybeSingle();
      const recipientId = conversation?.participants?.find((id: string) => id !== record.fromUser);
      if (recipientId) {
        const { data: sender } = await supabase
          .from("profiles")
          .select("nom")
          .eq("id", record.fromUser)
          .maybeSingle();
        await sendPush(
          recipientId,
          "Nouveau message de " + (sender?.nom || ""),
          String(record.text || "").slice(0, 80),
          { type: "message", conversationId: record.conversation }
        );
      }
    } else if (table === "subscriptionRequests" && type === "UPDATE") {
      if (record.status !== old_record?.status) {
        if (record.status === "validee") {
          await sendPush(record.user, "Abonnement activé ✓", "Votre demande d'abonnement a été validée.", {
            type: "subscription",
          });
        } else if (record.status === "refusee") {
          await sendPush(record.user, "Demande refusée", "Votre demande d'abonnement a été refusée.", {
            type: "subscription",
          });
        }
      }
    } else if (table === "boostRequests" && type === "UPDATE") {
      if (record.status !== old_record?.status) {
        if (record.status === "validee") {
          await sendPush(record.user, "Boost activé ✓", "Votre annonce est maintenant en avant.", {
            type: "boost",
            listingId: record.listing,
          });
        } else if (record.status === "refusee") {
          await sendPush(record.user, "Demande refusée", "Votre demande de boost a été refusée.", {
            type: "boost",
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.log("[push-notify] erreur :", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
