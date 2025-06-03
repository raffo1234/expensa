import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import syncUserWithDatabase from "@/lib/syncUserWithDatabase";
import { supabase } from "./supabase";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,

      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, profile }) {
      console.log("auth-astro signIn callback triggered", { user });

      if (user && profile) {
        await syncUserWithDatabase(user, profile);
      }

      return true;
    },
    async jwt({ token, account, user }) {
      if (!token.role && account && user?.email) {
        try {
          const { data: dbUser, error } = await supabase
            .from("user")
            .select("id, role_id, template_id")
            .eq("email", user.email)
            .single();

          if (error) {
            console.error("Error fetching user role in JWT callback:", error);
          } else if (dbUser?.role_id) {
            token.template_id = dbUser.template_id;
            token.user_id = dbUser.id;
            token.role_id = dbUser.role_id;
          }
        } catch (error) {
          console.error("Error fetching user role in JWT callback:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.role_id && token?.user_id) {
        session.user.id = token.user_id as string;
        session.user.role_id = token.role_id as string;
        session.user.template_id = token.template_id as string | null;
      }
      return session;
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/admin/dicom`;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
