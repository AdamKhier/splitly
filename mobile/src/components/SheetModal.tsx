import { useEffect, useRef } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../theme/theme";

interface SheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  fluid?: boolean;
}

/**
 * Bottom sheet on phones, centered dialog on the Fold's inner display.
 * Closes on outside tap on tablets; bottom sheets keep a scrim.
 */
export function SheetModal({ visible, onClose, children, maxWidth = 560, fluid }: SheetModalProps) {
  const keyboardRef = useRef(0);

  useEffect(() => {
    if (visible) {
      keyboardRef.current = 1;
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={({}) => [styles.sheet, { maxWidth: fluid ? undefined : maxWidth }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.handle} />
            <View style={styles.body}>{children}</View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  body: { gap: 0 },
});