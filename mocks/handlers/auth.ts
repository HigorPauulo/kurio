import { http, HttpResponse, type HttpHandler } from "msw";
import { loginBodySchema, registerBodySchema, type Session } from "@/contracts/user";
import { createSalt, hashPassword, verifyPassword } from "../db/password";
import {
  API,
  apiError,
  authenticate,
  createSession,
  fieldError,
  parseBody,
  readToken,
  toUser,
  withConditions,
  type HandlerDeps,
} from "./shared";

export function authHandlers(deps: HandlerDeps): HttpHandler[] {
  const { db } = deps;
  const sessionTtl = (): number => deps.getScenario().sessionTtlMs;

  return [
    http.post(
      `${API}/auth/register`,
      withConditions(deps, async ({ request }) => {
        const body = await parseBody(request, registerBodySchema);
        if (body.response) return body.response;
        const { username, email, password } = body.data;

        const users = db.read((tables) => Object.values(tables.users));
        if (users.some((user) => user.email === email)) {
          return fieldError(request, 409, "EMAIL_TAKEN", "email", "Este e-mail já tem cadastro.");
        }
        if (users.some((user) => user.username === username)) {
          return fieldError(request, 409, "USERNAME_TAKEN", "username", "Este nome de usuário já está em uso.");
        }

        const salt = createSalt();
        const passwordHash = await hashPassword(password, salt);
        let session: Session | undefined;
        db.commit((draft, { nextId, now }) => {
          const id = nextId("usr");
          draft.users[id] = {
            id,
            email,
            username,
            name: username,
            ensName: null,
            avatarUrl: null,
            createdAt: now().toISOString(),
            salt,
            passwordHash,
          };
          session = createSession(draft, id, nextId, now().getTime(), sessionTtl());
        });
        return HttpResponse.json(session, { status: 201 });
      }),
    ),

    http.post(
      `${API}/auth/login`,
      withConditions(deps, async ({ request }) => {
        const body = await parseBody(request, loginBodySchema);
        if (body.response) return body.response;

        const user = db.read((tables) =>
          Object.values(tables.users).find((candidate) => candidate.email === body.data.email),
        );
        if (!user || !(await verifyPassword(body.data.password, user.salt, user.passwordHash))) {
          return apiError(request, 401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
        }

        let session: Session | undefined;
        db.commit((draft, { nextId, now }) => {
          session = createSession(draft, user.id, nextId, now().getTime(), sessionTtl());
        });
        return HttpResponse.json(session);
      }),
    ),

    http.get(
      `${API}/auth/session`,
      withConditions(deps, ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const session = db.read((tables) => tables.sessions[auth.token]);
        const user = db.read((tables) => tables.users[auth.userId]);
        return HttpResponse.json({ token: auth.token, expiresAt: session.expiresAt, user: toUser(user) });
      }),
    ),

    http.post(
      `${API}/auth/logout`,
      withConditions(deps, ({ request }) => {
        const token = readToken(request);
        if (token && db.read((tables) => token in tables.sessions)) {
          db.commit((draft) => {
            delete draft.sessions[token];
          });
        }
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
