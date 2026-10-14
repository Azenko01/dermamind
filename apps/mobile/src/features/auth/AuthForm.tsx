import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui/Text';

export function AuthForm({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { colors, spacing } = useTheme();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.screen, gap: spacing.lg }}
      >
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" style={{ fontSize: 17, lineHeight: 24 }}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Where to go after a successful sign-in: close the auth modal and land on the tabs. */
export function leaveAuth(router: {
  canDismiss: () => boolean;
  dismissAll: () => void;
  replace: (href: '/') => void;
}) {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
