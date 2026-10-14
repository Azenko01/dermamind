import { Tabs } from 'expo-router';
import {
  BookmarkSimpleIcon,
  CalendarBlankIcon,
  MagnifyingGlassIcon,
  SunHorizonIcon,
  UserIcon,
  type IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

type Icon = ComponentType<IconProps>;

/** Active tab: filled icon, darker colour; inactive: line icon (PLAN.md 7.3, 7.5). */
function TabIcon({ icon: Icon, focused }: { icon: Icon; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <Icon
      size={26}
      color={focused ? colors.textPrimary : colors.textSecondary}
      weight={focused ? 'fill' : 'regular'}
    />
  );
}

function tabIcon(icon: Icon) {
  return function TabBarIcon({ focused }: { focused: boolean }) {
    return <TabIcon icon={icon} focused={focused} />;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dziś', tabBarIcon: tabIcon(CalendarBlankIcon) }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Odkrywaj', tabBarIcon: tabIcon(MagnifyingGlassIcon) }}
      />
      <Tabs.Screen
        name="routine"
        options={{ title: 'Rutyna', tabBarIcon: tabIcon(SunHorizonIcon) }}
      />
      <Tabs.Screen
        name="shelf"
        options={{ title: 'Półka', tabBarIcon: tabIcon(BookmarkSimpleIcon) }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon(UserIcon) }} />
    </Tabs>
  );
}
