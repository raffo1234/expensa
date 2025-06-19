import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import syncUserWithDatabase from "@/lib/syncUserWithDatabase";
import { supabase } from "./supabase";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

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
    CredentialsProvider({
      name: "Sign in with Email/Password",
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        
        if (!email || !password) {
          return null; 
        }

        try {
          const { data: user, error } = await supabase
            .from("user") 
            .select("id, email, first_name, last_name, password") 
            .eq("email", email)
            .single();

          if (error) {
            console.error("Error fetching user:", error);
            return null; 
          }

          if (!user) {
            return null; 
          }

          const isPasswordValid = await bcrypt.compare(password as string, user.password);
            
          if (isPasswordValid) {
            
            return {
              id: user.id,
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email, 
              email: user.email,
              
            };
          } else {
            return null;
          }
        } catch (error) {
          console.error("Error during authorization:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user && account?.provider === 'google' && profile) {
        await syncUserWithDatabase(user, profile);
      }  else if (user && account?.provider === 'credentials') {
        console.log("Credentials sign-in successful for user:", user);
      }

      return true;
    },
    async jwt({ token }) {
      if (!token.user_id) {
        try {
          const { data: dbUser, error } = await supabase
            .from("user")
            .select("id")
            .eq("email", token.email)
            .single();

          if (error) {
            console.error("Error fetching user role in JWT callback:", error);
          } else if (dbUser?.id) {
            token.user_id = dbUser.id;
          }
        } catch (error) {
          console.error("Error fetching user role in JWT callback:", error);
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
      return `${baseUrl}/admin/dicom`;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
