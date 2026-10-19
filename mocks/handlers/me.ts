import { http, HttpResponse, type HttpHandler } from "msw";
import { changePasswordBodySchema, updateMeBodySchema } from "@/contracts/user";
import { createSalt, hashPassword, verifyPassword } from "../db/password";
import {
  API,
  authenticate,
  fieldError,
  parseBody,
  toUser,
  withConditions,
  type HandlerDeps,
} from "./shared";

const AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const AVATAR_MAX_BYTES = 100_000;

async function toDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${file.type};base64,${btoa(binary)}`;
}

export function meHandlers(deps: HandlerDeps): HttpHandler[] {
  const { db } = deps;

  return [
    http.get(
      `${API}/me`,
      withConditions(deps, ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        return HttpResponse.json(toUser(db.read((tables) => tables.users[auth.userId])));
      }),
    ),

    http.patch(
      `${API}/me`,
      withConditions(deps, async ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const body = await parseBody(request, updateMeBodySchema);
        if (body.response) return body.response;
        const changes = body.data;

        const others = db.read((tables) =>
          Object.values(tables.users).filter((user) => user.id !== auth.userId),
        );
        if (changes.username && others.some((user) => user.username === changes.username)) {
          return fieldError(request, 409, "USERNAME_TAKEN", "username", "Este nome de usuário já está em uso.");
        }
        if (changes.email && others.some((user) => user.email === changes.email)) {
          return fieldError(request, 409, "EMAIL_TAKEN", "email", "Este e-mail já tem cadastro.");
        }

        db.commit((draft) => {
          Object.assign(draft.users[auth.userId], changes);
        });
        return HttpResponse.json(toUser(db.read((tables) => tables.users[auth.userId])));
      }),
    ),

    http.post(
      `${API}/me/avatar`,
      withConditions(deps, async ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;

        const form = await request.formData().catch(() => null);
        const file = form?.get("file");
        if (!(file instanceof File) || !AVATAR_TYPES.has(file.type)) {
          return fieldError(request, 422, "VALIDATION_FAILED", "file", "Envie uma imagem PNG, JPEG ou WebP.");
        }
        if (file.size > AVATAR_MAX_BYTES) {
          return fieldError(request, 422, "VALIDATION_FAILED", "file", "A imagem deve ter até 100 KB.");
        }

        const avatarUrl = await toDataUrl(file);
        db.commit((draft) => {
          draft.users[auth.userId].avatarUrl = avatarUrl;
        });
        return HttpResponse.json({ avatarUrl });
      }),
    ),

    http.delete(
      `${API}/me/avatar`,
      withConditions(deps, ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        db.commit((draft) => {
          draft.users[auth.userId].avatarUrl = null;
        });
        return HttpResponse.json({ avatarUrl: null });
      }),
    ),

    http.post(
      `${API}/me/password`,
      withConditions(deps, async ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const body = await parseBody(request, changePasswordBodySchema);
        if (body.response) return body.response;

        const user = db.read((tables) => tables.users[auth.userId]);
        if (!(await verifyPassword(body.data.currentPassword, user.salt, user.passwordHash))) {
          return fieldError(request, 422, "WRONG_PASSWORD", "currentPassword", "A senha atual está incorreta.");
        }

        const salt = createSalt();
        const passwordHash = await hashPassword(body.data.newPassword, salt);
        db.commit((draft) => {
          Object.assign(draft.users[auth.userId], { salt, passwordHash });
        });
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
