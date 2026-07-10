import React, { useState } from "react";
import {
  FlatList,
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
  const [time, setTime] = useState("");
  const [formDay, setFormDay] = useState<DayKey>("today");

  const addTask = () => {
    if (!name.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: uid(), name: name.trim(), time, date: formDay, status: "pending" },
    ]);
    setName("");
    setTime("");
  };

  const toggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
          : t,
      ),
    );
  };

  const visibleTasks = tasks
    .filter((t) => t.date === activeDay)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.brand}>IGNITION</Text>
        <Text style={styles.brandSub}>5 · 4 · 3 · 2 · 1 · GO</Text>
      </View>

      <View style={styles.dayToggle}>
        <TouchableOpacity
          style={[styles.dayBtn, activeDay === "today" && styles.dayBtnActive]}
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
            onPress={() => toggleComplete(item.id)}
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
          <TextInput
            style={styles.timeInput}
            placeholder="HH:MM"
            placeholderTextColor={COLORS.textFaint}
            value={time}
            onChangeText={setTime}
          />
        </View>
        <View style={styles.dayToggle}>
          <TouchableOpacity
            style={[styles.dayBtn, formDay === "today" && styles.dayBtnActive]}
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
    </SafeAreaView>
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
  addBtn: {
    backgroundColor: COLORS.amber,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  addBtnText: { color: "#201400", fontSize: 14, fontWeight: "700" },
});
