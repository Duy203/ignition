import { supabase } from "@/lib/supabase";

export interface DbTask {
  id: string;
  name: string;
  time: string | null;
  date: string;
  status: "pending" | "completed";
  notification_id: string | null;
  completed_at: string | null;
}

export async function fetchTasks(userId: string): Promise<DbTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("time", { ascending: true });

  if (error) {
    console.error("fetchTasks failed:", error.message);
    return [];
  }
  return data as DbTask[];
}

export async function insertTask(
  userId: string,
  name: string,
  time: string,
  date: string,
  notificationId: string | null,
): Promise<DbTask | null> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      name,
      time: time || null,
      date,
      notification_id: notificationId,
    })
    .select()
    .single();

  if (error) {
    console.error("insertTask failed:", error.message);
    return null;
  }
  return data as DbTask;
}

export async function setTaskStatus(
  taskId: string,
  status: "pending" | "completed",
  completedAt: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ status, completed_at: completedAt })
    .eq("id", taskId);

  if (error) console.error("setTaskStatus failed:", error.message);
}
