import { TextInput, type TextInputProps, View } from "react-native";
import { colors, radii, spacing } from "../theme/theme";
import { Text } from "./Text";

interface FieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  trailing?: React.ReactNode;
}

export function Field({ label, hint, error, trailing, style, ...props }: FieldProps) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="micro" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}
        </Text>
      ) : null}
      <View style={{ position: "relative" }}>
        <TextInput
          placeholderTextColor={colors.textFaint}
          {...props}
          style={[
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: error ? colors.danger : colors.border,
              borderRadius: radii.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              color: colors.text,
            },
            trailing ? { paddingRight: 56 } : {},
            style,
          ]}
        />
        {trailing ? <View style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}