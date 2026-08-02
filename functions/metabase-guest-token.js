"use strict";

// Signe un JWT d'embed Metabase pour le dashboard 33 (« EDF · marchés »).
// Le secret vit UNIQUEMENT en variable d'environnement Netlify
// (METABASE_EMBED_SECRET), jamais dans le code. En son absence : erreur
// explicite, aucun repli silencieux.
//
// La signature HS256 est faite avec le module `crypto` de Node, sans
// dépendance npm : le déploiement par glisser-déposer Netlify n'exécute
// aucun `npm install`, une function qui `require("jsonwebtoken")` planterait.

const crypto = require("crypto");

function base64url(valeur) {
  return Buffer.from(valeur)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function reponse(code, corps) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(corps),
  };
}

exports.handler = async function handler() {
  const secret = process.env.METABASE_EMBED_SECRET;
  if (!secret) {
    return reponse(500, { error: "METABASE_EMBED_SECRET absent de l'environnement" });
  }

  const entete = { alg: "HS256", typ: "JWT" };
  const charge = {
    resource: { dashboard: 33 },
    params: {},
    exp: Math.round(Date.now() / 1000) + 10 * 60, // expiration 10 min
  };

  const aSigner = base64url(JSON.stringify(entete)) + "." + base64url(JSON.stringify(charge));
  const signature = base64url(crypto.createHmac("sha256", secret).update(aSigner).digest());

  return reponse(200, { jwt: aSigner + "." + signature });
};
