import { supabase } from "@/lib/supabase";

export async function ensureAuthenticated(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Anonymous sign-in failed:", error.message);
    return null;
  }
  return data.user?.id ?? null;
}
