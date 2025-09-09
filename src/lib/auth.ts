import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { db } from "@/lib/sqlite";
import { connectMongo } from "@/lib/mongo";

export const role = {
  ADMIN: "ADMIN",
  COORDINADOR: "COORDINADOR",
  VOLUNTARIO: "VOLUNTARIO",
} as const;

type Role = typeof role[keyof typeof role];

type Settings = { theme?: "system" | "light" | "dark"; widgets?: string[] };

type SlimUser = { role: Role | null; approved: boolean; name?: string | null; settings?: Settings };

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

async function getUserByEmail(email: string) {
  if (process.env.MONGODB_URI) {
    await connectMongo();
    const { default: User } = await import("@/models/User");
    const u = await User.findOne({ email }).lean();
    if (!u || Array.isArray(u)) return null;
    return {
      id: String((u as any)._id),
      name: (u as any).name as string | null,
      email: (u as any).email as string,
      passwordHash: (u as any).passwordHash as string | null,
      role: (u as any).role as Role | null,
      emailVerified: (u as any).emailVerified ? 1 : 0,
    };
  }
  const row = db
    .prepare(
      "SELECT id, name, email, password_hash as passwordHash, role, email_verified as emailVerified FROM users WHERE email = ?"
    )
    .get(email) as
    | { id: string; name: string | null; email: string; passwordHash: string | null; role: Role | null; emailVerified: number }
    | undefined;
  return row ?? null;
}

async function getRoleAndApproved(email: string): Promise<SlimUser> {
  if (process.env.MONGODB_URI) {
    await connectMongo();
    const { default: User } = await import("@/models/User");
    const u = await User.findOne({ email }).select({ role: 1, emailVerified: 1, name: 1, settings: 1 }).lean();
    return {
      role: (u as any)?.role as Role | null,
      approved: !!(u as any)?.emailVerified,
      name: (u as any)?.name ?? null,
      settings: (u as any)?.settings ?? {},
    };
  }
  const row = db
    .prepare("SELECT name, role, email_verified as emailVerified FROM users WHERE email = ?")
    .get(email) as { name: string | null; role: Role | null; emailVerified: number } | undefined;
  return { role: row?.role ?? null, approved: row?.emailVerified === 1, name: row?.name ?? null, settings: {} };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const row = await getUserByEmail(email);
        if (!row || !row.passwordHash) return null;
        const ok = await compare(password, row.passwordHash);
        if (!ok) return null;
        if (row.emailVerified !== 1) {
          // mensaje personalizado en ?error=
          throw new Error("PendienteAprobacion");
        }
        const { role: r, name, settings } = await getRoleAndApproved(email);
        return {
          id: row.id,
          email: row.email,
          name: name ?? row.name ?? undefined,
          role: r ?? row.role ?? role.VOLUNTARIO,
          settings: settings ?? {},
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // @ts-ignore
        token.role = (user as any).role ?? token.role ?? role.VOLUNTARIO;
        // @ts-ignore
        token.name = (user as any).name ?? token.name;
        // @ts-ignore
        token.settings = (user as any).settings ?? token.settings ?? {};
      }
      if (token?.email) {
        try {
          const { role: r, approved, name, settings } = await getRoleAndApproved(token.email);
          // @ts-ignore
          token.role = r ?? token.role ?? role.VOLUNTARIO;
          // @ts-ignore
          token.approved = approved ?? false;
          // @ts-ignore
          token.name = name ?? token.name;
          // @ts-ignore
          token.settings = settings ?? token.settings ?? {};
        } catch {}
      }
      return token;
    },
    session({ session, token }) {
      const s = session as any;
      s.user = s.user ?? {};
      s.user.role = (token as any).role ?? role.VOLUNTARIO;
      s.user.approved = (token as any).approved ?? false;
      if (token && (token as any).name) s.user.name = String((token as any).name);
      s.user.settings = (token as any).settings ?? {};
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
