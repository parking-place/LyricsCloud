import { createHash, createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 3100;
const issuer = `http://${host}:${port}`;
const clientId = "synthetic-e2e-client";
const clientSecret = "synthetic-e2e-client-secret";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const codes = new Map();

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", issuer);
  if (url.pathname === "/health") return json(response, { status: "ok" });
  if (url.pathname === "/.well-known/openid-configuration") return json(response, {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    jwks_uri: `${issuer}/jwks`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["client_secret_post"]
  });
  if (url.pathname === "/jwks") return json(response, { keys: [{
    ...publicKey.export({ format: "jwk" }), kid: "e2e-key", use: "sig", alg: "RS256"
  }] });
  if (url.pathname === "/authorize") return authorize(url, response);
  if (url.pathname === "/token" && request.method === "POST") return token(request, response);
  response.writeHead(404).end();
});

server.listen(port, host);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));

function authorize(url, response) {
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");
  const nonce = url.searchParams.get("nonce");
  const challenge = url.searchParams.get("code_challenge");
  if (!redirectUri || !state || !nonce || !challenge || url.searchParams.get("client_id") !== clientId) {
    return json(response, { error: "invalid_request" }, 400);
  }
  const actions = [
    issue("허용 계정으로 계속", "allowed", "e2e-allowed-user", "fixture@example.invalid", "통합 테스트 사용자"),
    issue("미허용 계정으로 계속", "denied", "e2e-outsider", "outsider@example.invalid", "초대받지 않은 사용자")
  ];
  const cancel = `${redirectUri}?${new URLSearchParams({ error: "access_denied", state })}`;
  response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  response.end(`<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width"><title>OIDC 테스트 공급자</title></head><body><main><h1>OIDC 테스트 공급자</h1><p>실제 Google 계정이나 토큰을 사용하지 않습니다.</p>${actions.map(({ label, href }) => `<p><a href="${escapeHtml(href)}">${label}</a></p>`).join("")}<p><a href="${escapeHtml(cancel)}">로그인 취소</a></p></main></body></html>`);

  function issue(label, kind, subject, email, name) {
    const code = `${kind}-${randomUUID()}`;
    codes.set(code, { redirectUri, nonce, challenge, subject, email, name, used: false });
    return { label, href: `${redirectUri}?${new URLSearchParams({ code, state })}` };
  }
}

async function token(request, response) {
  let body = "";
  for await (const chunk of request) body += String(chunk);
  const form = new URLSearchParams(body);
  const record = codes.get(form.get("code"));
  const verifier = form.get("code_verifier") ?? "";
  const validChallenge = createHash("sha256").update(verifier).digest("base64url");
  if (!record || record.used || form.get("client_id") !== clientId || form.get("client_secret") !== clientSecret
    || form.get("redirect_uri") !== record.redirectUri || validChallenge !== record.challenge) {
    return json(response, { error: "invalid_grant" }, 400);
  }
  record.used = true;
  const now = Math.floor(Date.now() / 1_000);
  return json(response, {
    access_token: "synthetic-provider-token-never-persisted",
    token_type: "Bearer",
    expires_in: 300,
    id_token: jwt({
      iss: issuer, aud: clientId, sub: record.subject, iat: now, exp: now + 300,
      nonce: record.nonce, email: record.email, email_verified: true, name: record.name
    })
  });
}

function jwt(claims) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "e2e-key", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const input = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(input).end().sign(privateKey).toString("base64url");
  return `${input}.${signature}`;
}

function json(response, body, status = 200) {
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
