"use strict";

// Crée un Lead Salesforce à partir du formulaire « Confiez-nous votre besoin »
// du portail client.
//
// Les identifiants vivent UNIQUEMENT en variables d'environnement Netlify
// (SF_SESSION_ID, SF_INSTANCE_URL), jamais dans le code ni dans le HTML : la
// maquette est servie publiquement, tout ce qui est dans la page est lisible.
// En leur absence : erreur explicite, aucun repli silencieux.
//
// SF_SESSION_ID est une session ID Salesforce, qui EXPIRE. Quand la création
// renvoie 401, c'est qu'il faut la renouveler dans les variables Netlify. Pour
// un usage durable, la remplacer par une Connected App (OAuth client
// credentials), qui redonne un token à la demande.
//
// Aucune dépendance npm : Netlify ne lance pas `npm install` sur ce projet,
// un `require` externe planterait. fetch est natif depuis Node 18.

const VERSION_API = "v62.0";
const LONGUEURS = { LastName: 80, FirstName: 40, Title: 128, Company: 255, City: 40, Email: 80 };

function reponse(code, corps) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(corps),
  };
}

// Salesforce rejette la création si un champ dépasse sa longueur : on coupe.
function borner(valeur, champ) {
  const texte = String(valeur == null ? "" : valeur).trim();
  const max = LONGUEURS[champ];
  return max && texte.length > max ? texte.slice(0, max) : texte;
}

// « Paris · 2 j de télétravail / semaine » → « Paris » (City fait 40 caractères).
function ville(localisation) {
  return borner(String(localisation || "").split(/[·,(]/)[0], "City");
}

function recapitulatif(d) {
  const lignes = [
    ["Type de prestation", d.type],
    ["Intitulé du poste", d.poste],
    ["Localisation", d.localisation],
    ["TJM ou budget cible", d.tjm],
    ["Date de démarrage", d.dateDemarrage],
    ["Demandeur", [d.contactNom, d.contactEmail].filter(Boolean).join(" — ")],
  ].filter(function (paire) {
    return paire[1];
  });
  const entete = lignes.map(function (p) {
    return p[0] + " : " + p[1];
  });
  const libre = String(d.description || "").trim();
  return (entete.join("\n") + (libre ? "\n\nBesoin exprimé par le client :\n" + libre : "")).slice(0, 32000);
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return reponse(405, { error: "Méthode non autorisée" });
  }

  const session = process.env.SF_SESSION_ID;
  const instance = process.env.SF_INSTANCE_URL;
  if (!session || !instance) {
    return reponse(500, { error: "SF_SESSION_ID ou SF_INSTANCE_URL absent de l'environnement" });
  }

  let demande;
  try {
    demande = JSON.parse(event.body || "{}");
  } catch (erreur) {
    return reponse(400, { error: "Corps de requête illisible" });
  }

  const nom = borner(demande.contactNom, "LastName");
  if (!nom) {
    return reponse(400, { error: "Le nom du demandeur est obligatoire" });
  }

  const lead = {
    LastName: nom,
    FirstName: borner(demande.contactPrenom, "FirstName"),
    Email: borner(demande.contactEmail, "Email"),
    Company: borner(demande.societe || "Client portail", "Company"),
    Title: borner(demande.poste, "Title"),
    City: ville(demande.localisation),
    Status: "Nouveau",
    LeadSource: "Site web",
    Description: recapitulatif(demande),
  };
  Object.keys(lead).forEach(function (cle) {
    if (lead[cle] === "") delete lead[cle];
  });

  let sf;
  try {
    sf = await fetch(instance.replace(/\/+$/, "") + "/services/data/" + VERSION_API + "/sobjects/Lead", {
      method: "POST",
      headers: { Authorization: "Bearer " + session, "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
  } catch (erreur) {
    console.error("Salesforce injoignable :", erreur);
    return reponse(502, { error: "Salesforce injoignable" });
  }

  const brut = await sf.text();
  let charge = null;
  try {
    charge = JSON.parse(brut);
  } catch (erreur) {
    charge = null;
  }

  if (!sf.ok) {
    // La réponse SF peut contenir des détails d'org : on la journalise côté
    // serveur et on ne renvoie au navigateur qu'un message et un code.
    console.error("Création Lead refusée (HTTP " + sf.status + ") :", brut);
    const detail = Array.isArray(charge) && charge[0] ? charge[0] : {};
    if (sf.status === 401) {
      return reponse(502, { error: "Session Salesforce expirée — renouveler SF_SESSION_ID", code: "SESSION_EXPIREE" });
    }
    return reponse(502, { error: "Salesforce a refusé la création du lead", code: detail.errorCode || "ERREUR_SF" });
  }

  const id = charge && charge.id;
  console.log("Lead créé :", id);
  return reponse(201, {
    id: id,
    url: instance.replace(/\/+$/, "") + "/lightning/r/Lead/" + id + "/view",
  });
};
