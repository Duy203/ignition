import CountdownConsole from "@/components/CountdownConsole";
import OnboardingScreen from "@/components/OnBoardingScreen";
import { ensureAuthenticated } from "@/utils/auth";
import {
  requestNotificationPermissions,
  scheduleTaskNotification,
} from "@/utils/notification";
import { DbTask, fetchTasks, insertTask, setTaskStatus } from "@/utils/tasks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  bg: "#0B0D0F",
  panel: "#14171A",
  panelRaised: "#1B1F23",
  line: "#262B30",
  amber: "#FF9F1C",
  green: "#3ECF8E",
  text: "#EDEEF0",
  textDim: "#8A8F98",
  textFaint: "#565B62",
};

type TabKey = "today" | "tomorrow";

interface Task {
  id: string;
  name: string;
  time: string;
  date: string; // real "YYYY-MM-DD"
  status: "pending" | "completed";
  notificationId?: string | null;
  completedAt?: string | null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr(): string {
  return dateKey(new Date());
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dateKey(d);
}

function formatTime(time: string | null | undefined): string {
  if (!time) return "Anytime";
  const parts = time.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return "Anytime";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function toTimeString(date: Date | null): string {
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getTriggerDate(dateStr: string, time: string): Date | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const trigger = new Date(y, mo - 1, d, h, m, 0, 0);
  return trigger;
}

function computeStreak(tasks: Task[]): number {
  const completedDates = new Set<string>();
  tasks.forEach((t) => {
    if (t.status === "completed" && t.completedAt) {
      completedDates.add(dateKey(new Date(t.completedAt)));
    }
  });

  let streak = 0;
  const cursor = new Date();
  if (!completedDates.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedDates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeTodayPct(tasks: Task[]): number {
  const list = tasks.filter((t) => t.date === todayStr());
  if (list.length === 0) return 0;
  const done = list.filter((t) => t.status === "completed").length;
  return Math.round((done / list.length) * 100);
}

function fromDbTask(t: DbTask): Task {
  return {
    id: t.id,
    name: t.name,
    time: t.time ?? "",
    date: t.date,
    status: t.status,
    notificationId: t.notification_id,
    completedAt: t.completed_at,
  };
}

export default function TodayScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [name, setName] = useState("");
  const [time, setTime] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [formTab, setFormTab] = useState<TabKey>("today");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("hasOnboarded").then((value) => {
      if (!value) setShowOnboarding(true);
    });

    requestNotificationPermissions();

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const taskId = response.notification.request.content.data?.taskId as
          | string
          | undefined;
        if (taskId) setActiveTaskId(taskId);
      },
    );

    (async () => {
      const uid = await ensureAuthenticated();
      setUserId(uid);
      if (uid) {
        const dbTasks = await fetchTasks(uid);
        setTasks(dbTasks.map(fromDbTask));
      }
      setLoading(false);
    })();

    return () => sub.remove();
  }, []);

  const finishOnboarding = () => {
    AsyncStorage.setItem("hasOnboarded", "true");
    setShowOnboarding(false);
  };

  const addTask = async () => {
    if (!name.trim() || !userId) return;
    const dateStr = formTab === "today" ? todayStr() : tomorrowStr();
    const timeStr = toTimeString(time);
    const triggerDate = getTriggerDate(dateStr, timeStr);

    let notificationId: string | null = null;
    if (triggerDate) {
      notificationId = await scheduleTaskNotification(
        dateStr,
        name.trim(),
        triggerDate,
      );
    }

    const saved = await insertTask(
      userId,
      name.trim(),
      timeStr,
      dateStr,
      notificationId,
    );
    if (saved) {
      setTasks((prev) => [...prev, fromDbTask(saved)]);
    }

    setName("");
    setTime(null);
  };

  const toggleComplete = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "completed" ? "pending" : "completed";
    const completedAt =
      newStatus === "completed" ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: newStatus, completedAt } : t,
      ),
    );
    await setTaskStatus(id, newStatus, completedAt);
  };

  const visibleTasks = tasks
    .filter(
      (t) => t.date === (activeTab === "today" ? todayStr() : tomorrowStr()),
    )
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={{ color: COLORS.textFaint }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <SafeAreaView style={styles.safe}>
        <View
          style={[
            styles.header,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
            },
          ]}
        >
          <View>
            <Text style={styles.brand}>IGNITION</Text>
            <Text style={styles.brandSub}>5 · 4 · 3 · 2 · 1 · GO</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.statNum}>{computeStreak(tasks)}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.statNum}>{computeTodayPct(tasks)}%</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <TouchableOpacity onPress={() => setShowOnboarding(true)}>
              <Text style={{ color: COLORS.textFaint, fontSize: 16 }}>ⓘ</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dayToggle}>
          <TouchableOpacity
            style={[
              styles.dayBtn,
              activeTab === "today" && styles.dayBtnActive,
            ]}
            onPress={() => setActiveTab("today")}
          >
            <Text
              style={[
                styles.dayBtnText,
                activeTab === "today" && styles.dayBtnTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dayBtn,
              activeTab === "tomorrow" && styles.dayBtnActive,
            ]}
            onPress={() => setActiveTab("tomorrow")}
          >
            <Text
              style={[
                styles.dayBtnText,
                activeTab === "tomorrow" && styles.dayBtnTextActive,
              ]}
            >
              Tomorrow
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={visibleTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {activeTab === "today"
                  ? "No tasks yet. Add the one you're dreading most."
                  : "Plan tomorrow once today is handled."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.taskCard,
                item.status === "completed" && styles.taskCardDone,
              ]}
              onPress={() =>
                item.status !== "completed" && setActiveTaskId(item.id)
              }
            >
              <Text style={styles.taskTime}>{formatTime(item.time)}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.taskName,
                    item.status === "completed" && styles.taskNameDone,
                  ]}
                >
                  {item.name}
                </Text>
              </View>
              <Text style={styles.taskStatus}>
                {item.status === "completed" ? "✓" : "Start"}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.addForm}>
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="What's the task?"
              placeholderTextColor={COLORS.textFaint}
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity
              style={styles.timeInput}
              onPress={() => setShowPicker(true)}
            >
              <Text
                style={{
                  color: time ? COLORS.text : COLORS.textFaint,
                  fontSize: 14,
                }}
              >
                {time ? formatTime(toTimeString(time)) : "Set time"}
              </Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={time ?? new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  setShowPicker(false);
                  if (selectedDate) setTime(selectedDate);
                }}
              />
            )}
          </View>
          <View style={styles.dayToggle}>
            <TouchableOpacity
              style={[
                styles.dayBtn,
                formTab === "today" && styles.dayBtnActive,
              ]}
              onPress={() => setFormTab("today")}
            >
              <Text
                style={[
                  styles.dayBtnText,
                  formTab === "today" && styles.dayBtnTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dayBtn,
                formTab === "tomorrow" && styles.dayBtnActive,
              ]}
              onPress={() => setFormTab("tomorrow")}
            >
              <Text
                style={[
                  styles.dayBtnText,
                  formTab === "tomorrow" && styles.dayBtnTextActive,
                ]}
              >
                Tomorrow
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={addTask}>
            <Text style={styles.addBtnText}>Add task</Text>
          </TouchableOpacity>
        </View>

        <CountdownConsole
          visible={activeTaskId !== null}
          taskName={tasks.find((t) => t.id === activeTaskId)?.name ?? ""}
          onClose={() => setActiveTaskId(null)}
          onComplete={() => {
            if (activeTaskId) toggleComplete(activeTaskId);
            setActiveTaskId(null);
          }}
        />

        <OnboardingScreen visible={showOnboarding} onDone={finishOnboarding} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  brand: {
    color: COLORS.amber,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
  },
  brandSub: {
    color: COLORS.textFaint,
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 1,
  },
  statNum: { color: COLORS.amber, fontSize: 20, fontWeight: "700" },
  statLabel: {
    color: COLORS.textFaint,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  dayToggle: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  dayBtn: {
    flex: 1,
    backgroundColor: COLORS.panelRaised,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  dayBtnActive: { borderColor: COLORS.amber },
  dayBtnText: { color: COLORS.textDim, fontSize: 13, fontWeight: "600" },
  dayBtnTextActive: { color: COLORS.amber },
  empty: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 26,
    alignItems: "center",
  },
  emptyText: { color: COLORS.textFaint, fontSize: 13, textAlign: "center" },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  taskCardDone: { opacity: 0.5 },
  taskTime: { color: COLORS.amber, fontSize: 13, fontWeight: "600", width: 70 },
  taskName: { color: COLORS.text, fontSize: 15, fontWeight: "500" },
  taskNameDone: { textDecorationLine: "line-through", color: COLORS.textFaint },
  taskStatus: { color: COLORS.green, fontSize: 13, fontWeight: "600" },
  addForm: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.panel,
  },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: COLORS.panelRaised,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  timeInput: {
    width: 90,
    backgroundColor: COLORS.panelRaised,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: COLORS.amber,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  addBtnText: { color: "#201400", fontSize: 14, fontWeight: "700" },
});
