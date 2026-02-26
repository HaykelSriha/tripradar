import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

function Shimmer({ style }: { style: object }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  return <Animated.View style={[style, { opacity }]} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Shimmer style={styles.image} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Shimmer style={styles.routeText} />
          <Shimmer style={styles.ring} />
        </View>
        <Shimmer style={styles.price} />
        <Shimmer style={styles.meta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#13141A",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  image: { height: 140, backgroundColor: "#1C1D26" },
  body: { padding: 14, gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routeText: { height: 14, width: "50%", borderRadius: 6, backgroundColor: "#1C1D26" },
  ring: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1C1D26" },
  price: { height: 28, width: "35%", borderRadius: 6, backgroundColor: "#1C1D26" },
  meta: { height: 12, width: "70%", borderRadius: 6, backgroundColor: "#1C1D26" },
});
