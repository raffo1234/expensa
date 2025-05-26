import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role_id?: string;
      template_id?: string | null;
    } & DefaultSession["user"];
  }
}
