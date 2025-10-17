import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="mainUI" />
      <Tabs.Screen name="cctv" />
      <Tabs.Screen name="control" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="bottomtabbar" />
    </Tabs>
  );
}