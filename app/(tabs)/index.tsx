import CountdownConsole from "@/components/CountdownConsole";
import OnboardingScreen from "@/components/OnBoardingScreen";
import {
  requestNotificationPermissions,
  scheduleTaskNotification,
} from "@/utils/notification";
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

type TaskStatus = "pending" | "completed";
type DayKey = "today" | "tomorrow";

interface Task {
  id: string;
  name: string;
  time: string;
  date: DayKey;
  status: TaskStatus;
  notificationId?: string | null;
  completedAt?: string | null;
}

// helper functions

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreak(tasks: Task[]): number {
  const completeDates = new Set<string>();
  tasks.forEach((t) => {
    if (t.status === "completed" && t.completedAt) {
      completeDates.add(dateKey(new Date(t.completedAt)));
    }
  });
  let streak = 0;
  const cursor = new Date();
  if (!completeDates.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completeDates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeTodayPct(tasks: Task[]): number {
  const list = tasks.filter((t) => t.date === "today");
  if (list.length === 0) return 0;
  const done = list.filter((t) => t.status === "completed").length;
  return Math.round((done / list.length) * 100);
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatTime(time: string): string {
  if (!time) return "Anytime";
  const parts = time.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return "Anytime";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function TodayScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeDay, setActiveDay] = useState<DayKey>("today");
  const [name, setName] = useState("");
  //const [time, setTime] = useState("");
  const [time, setTime] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [formDay, setFormDay] = useState<DayKey>("today");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

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

    return () => sub.remove();
  }, []);

  function toTimeString(date: Date | null): string {
    if (!date) return "";
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  function getTriggerDate(dayKey: DayKey, time: string): Date | null {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    if (dayKey === "tomorrow") d.setDate(d.getDate() + 1);
    d.setHours(h, m, 0, 0);
    return d;
  }
  const addTask = async () => {
    if (!name.trim()) return;
    const id = uid();
    const triggerDate = getTriggerDate(formDay, toTimeString(time));
    let notificationId: string | null = null;

    if (triggerDate) {
      notificationId = await scheduleTaskNotification(
        id,
        name.trim(),
        triggerDate,
      );
    }

    setTasks((prev) => [
      ...prev,
      {
        id,
        name: name.trim(),
        time: toTimeString(time),
        date: formDay,
        status: "pending",
        notificationId,
      },
    ]);
    setName("");
    setTime(null);
  };
  const toggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === "completed" ? "pending" : "completed",
              completedAt:
                t.status === "completed" ? null : new Date().toISOString(),
            }
          : t,
      ),
    );
  };

  const visibleTasks = tasks
    .filter((t) => t.date === activeDay)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  const [showOnboarding, setShowOnboarding] = useState(false);
  const finishOnboarding = () => {
    AsyncStorage.setItem("hasOnboarded", "true");
    setShowOnboarding(false);
  };

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
          <View style={{ flexDirection: "row", gap: 18 }}>
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
              activeDay === "today" && styles.dayBtnActive,
            ]}
            onPress={() => setActiveDay("today")}
          >
            <Text
              style={[
                styles.dayBtnText,
                activeDay === "today" && styles.dayBtnTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dayBtn,
              activeDay === "tomorrow" && styles.dayBtnActive,
            ]}
            onPress={() => setActiveDay("tomorrow")}
          >
            <Text
              style={[
                styles.dayBtnText,
                activeDay === "tomorrow" && styles.dayBtnTextActive,
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
                {activeDay === "today"
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
                formDay === "today" && styles.dayBtnActive,
              ]}
              onPress={() => setFormDay("today")}
            >
              <Text
                style={[
                  styles.dayBtnText,
                  formDay === "today" && styles.dayBtnTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dayBtn,
                formDay === "tomorrow" && styles.dayBtnActive,
              ]}
              onPress={() => setFormDay("tomorrow")}
            >
              <Text
                style={[
                  styles.dayBtnText,
                  formDay === "tomorrow" && styles.dayBtnTextActive,
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
  statNum: { color: COLORS.amber, fontSize: 20, fontWeight: "700" },
  statLabel: {
    color: COLORS.textFaint,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: COLORS.amber,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  addBtnText: { color: "#201400", fontSize: 14, fontWeight: "700" },
});
