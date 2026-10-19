import {
  sessionSchema,
  type LoginBody,
  type RegisterBody,
  type Session,
} from "@/contracts/user";
import { parseResponse } from "@/lib/http/apiError";
import { http } from "@/lib/http/client";

export async function register(body: RegisterBody): Promise<Session> {
  const { data } = await http.post<unknown>("/auth/register", body);
  return parseResponse(sessionSchema, data);
}

export async function login(body: LoginBody): Promise<Session> {
  const { data } = await http.post<unknown>("/auth/login", body);
  return parseResponse(sessionSchema, data);
}

export async function logout(): Promise<void> {
  await http.post("/auth/logout");
}
