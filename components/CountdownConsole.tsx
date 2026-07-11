import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const COLORS = {
  panel: "#14171A",
  line: "#262B30",
  amber: "#FF9F1C",
  green: "#3ECF8E",
  text: "#EDEEF0",
  textFaint: "#565B62",
  danger: "#E85D5D",
};

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Phase = "ready" | "counting" | "go" | "doing";

interface Props {
  visible: boolean;
  taskName: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function CountdownConsole({
  visible,
  taskName,
  onClose,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(5);
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setPhase("ready");
      setCount(5);
      progress.setValue(0);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [visible]);

  const runCountdown = () => {
    setPhase("counting");
    let n = 5;
    setCount(n);
    progress.setValue(0);

    timerRef.current = setInterval(() => {
      n -= 1;
      if (n >= 1) {
        setCount(n);
        Animated.timing(progress, {
          toValue: (5 - n) / 5,
          duration: 950,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start();
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        Animated.timing(progress, {
          toValue: 1,
          duration: 950,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start();
        setPhase("go");
        setTimeout(() => setPhase("doing"), 700);
      }
    }, 1000);
  };

  const oneMoreTime = () => {
    runCountdown();
  };

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.console}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Up next</Text>
          <Text style={styles.taskName}>{taskName}</Text>

          <View style={styles.ringWrap}>
            <Svg width={200} height={200} viewBox="0 0 200 200">
              <Circle
                cx={100}
                cy={100}
                r={RADIUS}
                stroke={COLORS.line}
                strokeWidth={8}
                fill="none"
              />
              <AnimatedCircle
                cx={100}
                cy={100}
                r={RADIUS}
                stroke={COLORS.amber}
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                rotation={-90}
                origin="100, 100"
              />
            </Svg>
            <View style={styles.ringNumWrap}>
              <Text style={phase === "go" ? styles.ringNumGo : styles.ringNum}>
                {phase === "go" ? "GO" : count}
              </Text>
            </View>
          </View>

          {phase === "ready" && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnLaunch} onPress={runCountdown}>
                <Text style={styles.btnLaunchText}>I'm ready</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
                <Text style={styles.btnGhostText}>Not now</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === "doing" && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.btnGreen} onPress={onComplete}>
                <Text style={styles.btnLaunchText}>Mark complete</Text>
              </TouchableOpacity>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.btnGhost, { flex: 1 }]}
                  onPress={oneMoreTime}
                >
                  <Text style={styles.btnGhostText}>One more time</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnGhost, { flex: 1 }]}
                  onPress={onClose}
                >
                  <Text style={styles.btnGhostText}>Stop</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.hint}>
            {phase === "doing"
              ? "Don't worry how well you do it. Just do it."
              : "You only need one countdown to start."}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4,5,6,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  console: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COLORS.panel,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
  },
  closeBtn: { position: "absolute", top: 14, right: 16, padding: 4 },
  closeText: { color: COLORS.textFaint, fontSize: 18 },
  label: {
    color: COLORS.textFaint,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  taskName: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "600",
    marginBottom: 26,
    textAlign: "center",
  },
  ringWrap: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  ringNumWrap: { position: "absolute" },
  ringNum: { color: COLORS.text, fontSize: 64, fontWeight: "700" },
  ringNumGo: {
    color: COLORS.green,
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: 2,
  },
  actions: { width: "100%", gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  btnLaunch: {
    backgroundColor: COLORS.amber,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnGreen: {
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnLaunchText: { color: "#201400", fontSize: 15, fontWeight: "700" },
  btnGhost: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnGhostText: { color: COLORS.textFaint, fontSize: 13, fontWeight: "600" },
  hint: { color: COLORS.textFaint, fontSize: 12, marginTop: 14 },
});
