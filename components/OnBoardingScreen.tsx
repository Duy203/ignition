import React, { useState } from "react";
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const COLORS = {
  bg: "#0B0D0F",
  panel: "#14171A",
  line: "#262B30",
  amber: "#FF9F1C",
  green: "#3ECF8E",
  text: "#EDEEF0",
  textFaint: "#565B62",
};

const SLIDES = [
  {
    kicker: "The problem",
    title: "You already know what to do.",
    body: "Emails, bills, chores, errands — you don't need a to-do app to tell you they exist. The hard part is starting. Ignition is built for that one moment of hesitation, not for managing your whole life.",
  },
  {
    kicker: "The method",
    title: "5 · 4 · 3 · 2 · 1 · GO",
    body: "At the moment a task is due, count down from five out loud in your head. When you hit GO, you move — no waiting to feel ready, no negotiating. This is the Mel Robbins method, and it works by skipping the part of your brain that talks you out of things.",
  },
  {
    kicker: "How it works here",
    title: "Log it. Get prompted. Just go.",
    body: "Add a task with a time. When it arrives, Ignition prompts you and runs the countdown. Tap \u201cOne more time\u201d if you need a beat, or \u201cMark complete\u201d once you've started. Your streak tracks days you followed through — not days you did everything perfectly.",
  },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

export default function OnboardingScreen({ visible, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const next = () => {
    if (isLast) {
      onDone();
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.wrap}>
        <TouchableOpacity
          style={styles.skip}
          onPress={() => {
            onDone();
            setIndex(0);
          }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.kicker}>{slide.kicker}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={next}>
            <Text style={styles.btnText}>
              {isLast ? "Get started" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 28,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  skip: { position: "absolute", top: height * 0.06, right: 24, zIndex: 10 },
  skipText: { color: COLORS.textFaint, fontSize: 13, fontWeight: "600" },
  content: { flex: 1, justifyContent: "center" },
  kicker: {
    color: COLORS.amber,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 18,
    lineHeight: 36,
  },
  body: { color: COLORS.textFaint, fontSize: 15, lineHeight: 23 },
  footer: { gap: 22 },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.line },
  dotActive: { backgroundColor: COLORS.amber, width: 20 },
  btn: {
    backgroundColor: COLORS.amber,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnText: { color: "#201400", fontSize: 15, fontWeight: "700" },
});
