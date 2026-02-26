import { Tabs } from "expo-router";
import { Plane, Compass, Bell, User } from "lucide-react-native";
import { View } from "react-native";

function TabIcon({
  Icon,
  color,
  focused,
}: {
  Icon: typeof Plane;
  color: string;
  focused: boolean;
}) {
  return (
    <View
      className={`items-center justify-center rounded-2xl p-2 ${
        focused ? "bg-orange-500/15" : ""
      }`}
    >
      <Icon size={22} color={focused ? "#FF6B35" : color} strokeWidth={focused ? 2.5 : 1.8} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#13141A",
          borderTopColor: "rgba(255,255,255,0.06)",
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 72,
        },
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#4B4F6B",
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Deals",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Plane} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorer",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Compass} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alertes",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Bell} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={User} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
