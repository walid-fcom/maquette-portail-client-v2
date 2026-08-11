/* Garde d'accès de la maquette V2, exécutée sur les serveurs Netlify avant de
   livrer chaque page. Le code d'accès vit dans la variable d'environnement
   ACCES_CODE (jamais dans le HTML servi) ; un code valide pose un cookie signé
   (HMAC SHA-256) qui ouvre l'accès pour 7 jours. Sans variable ACCES_CODE, le
   site est servi sans garde — retirer la variable désactive l'écran. */
const DUREE_JOURS = 7;
const COOKIE = 'acces_maquette';

async function signer(secret, message) {
  const cle = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map(function (o) { return o.toString(16).padStart(2, '0'); }).join('');
}

function lireCookie(entete, nom) {
  for (const morceau of entete.split(/;\s*/)) {
    const i = morceau.indexOf('=');
    if (i > 0 && morceau.slice(0, i) === nom) return morceau.slice(i + 1);
  }
  return '';
}

async function jetonValide(jeton, secret) {
  const i = jeton.indexOf('.');
  if (i < 0) return false;
  const expiration = jeton.slice(0, i), signature = jeton.slice(i + 1);
  if (!/^\d+$/.test(expiration) || Number(expiration) < Date.now()) return false;
  return signature === await signer(secret, expiration);
}

function pageCadenas(erreur) {
  /* Même écran que le cadenas historique de la maquette : la page complète ne
     part vers le navigateur qu'une fois le code validé. */
  return new Response('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex">'
    + '<title>Maquette — Portail Front</title><style>'
    + '*{box-sizing:border-box;margin:0}'
    + 'body{display:grid;place-items:center;min-height:100vh;padding:24px;background:linear-gradient(135deg,#111a30 0%,#091121 100%);font-family:Montserrat,Inter,system-ui,sans-serif}'
    + '.carte{width:min(100%,440px);padding:40px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.35)}'
    + '.icone{display:grid;place-items:center;width:52px;height:52px;margin-bottom:26px;border-radius:15px;background:#edf3ff;color:#003CC2}'
    + '.icone svg{width:27px;height:27px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
    + 'h1{color:#17213a;font-size:26px;letter-spacing:-.6px}'
    + 'p{margin:8px 0 26px;color:#66738c;line-height:1.5}'
    + 'label{display:block;margin-bottom:8px;color:#34415a;font-size:13px;font-weight:800}'
    + '.rang{display:flex;gap:10px}'
    + 'input{min-width:0;flex:1;height:52px;border:1px solid #ccd6e7;border-radius:12px;padding:0 14px;color:#17213a;font:600 16px Montserrat,system-ui,sans-serif}'
    + 'input:focus{border-color:#003CC2;outline:3px solid #e8efff}'
    + 'button{height:52px;border:0;border-radius:12px;padding:0 20px;background:#003CC2;color:#fff;font:800 15px Montserrat,system-ui,sans-serif;cursor:pointer}'
    + 'button:hover{background:#002E96}'
    + '.erreur{min-height:20px;margin:12px 0 0;color:#bd2e2e;font-size:13px;font-weight:700}'
    + '@media(max-width:520px){body{padding:16px}.carte{padding:30px 24px}.rang{flex-direction:column}button{width:100%}}'
    + '</style></head><body>'
    + '<form class="carte" method="post">'
    + '<div class="icone"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>'
    + '<h1>Maquette — Portail Front</h1>'
    + '<p>Accès protégé à la maquette front.</p>'
    + '<label for="code">Code d’accès</label>'
    + '<div class="rang"><input id="code" name="code" type="password" autocomplete="current-password" placeholder="Saisir le code" required autofocus><button type="submit">Ouvrir</button></div>'
    + '<p class="erreur" role="alert">' + (erreur ? 'Code d’accès incorrect.' : '') + '</p>'
    + '</form></body></html>',
    { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export default async function (request, context) {
  const secret = Netlify.env.get('ACCES_CODE');
  if (!secret) return context.next();
  const jeton = lireCookie(request.headers.get('cookie') || '', COOKIE);
  if (await jetonValide(jeton, secret)) return context.next();
  if (request.method === 'POST') {
    const donnees = await request.formData().catch(function () { return null; });
    if (donnees && donnees.get('code') === secret) {
      const expiration = String(Date.now() + DUREE_JOURS * 86400000);
      return new Response(null, {
        status: 303,
        headers: {
          'location': new URL(request.url).pathname || '/',
          'set-cookie': COOKIE + '=' + expiration + '.' + await signer(secret, expiration)
            + '; Path=/; Max-Age=' + DUREE_JOURS * 86400 + '; HttpOnly; Secure; SameSite=Lax',
          'cache-control': 'no-store'
        }
      });
    }
    return pageCadenas(true);
  }
  return pageCadenas(false);
}

/* La route (path /*) est déclarée dans netlify.toml : la config en ligne
   n'était pas prise en compte par ce build. */
