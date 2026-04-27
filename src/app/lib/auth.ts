import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "./supabase";
import { supabaseAdmin } from "./supabaseAdmin";

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
      checks: ["pkce"],
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile) {
        const nameParts = (profile.name || "").split(" ");

        await supabaseAdmin.from("user").upsert(
          {
            email: user.email,
            name: profile.name,
            first_name: nameParts[0] || null,
            last_name: nameParts.slice(1).join(" ") || null,
            image_url: profile.picture as string,
          },
          { onConflict: "email" },
        );
      }
      return true;
    },
    async jwt({ token }) {
      if (!token.user_id) {
        const { data: dbUser } = await supabase
          .from("user")
          .select("id")
          .eq("email", token.email)
          .single();

        if (dbUser?.id) {
          token.user_id = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.user_id) {
        session.user.id = token.user_id as string;
      }
      return session;
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/admin`;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
