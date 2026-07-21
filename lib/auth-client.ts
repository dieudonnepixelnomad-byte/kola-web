import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { ac, proprietaire, admin, lecture } from "./permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  basePath: "/api/admin/auth",
  plugins: [organizationClient({ ac, roles: { proprietaire, admin, lecture } })],
});
