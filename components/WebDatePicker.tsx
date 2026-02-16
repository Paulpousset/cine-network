import { useTheme } from "@/providers/ThemeProvider";
import React from "react";

interface WebDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "time" | "datetime-local";
  style?: React.CSSProperties;
}

const WebDatePicker: React.FC<WebDatePickerProps> = ({
  value,
  onChange,
  type = "date",
  style,
}) => {
  const { colors } = useTheme();

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        backgroundColor: colors.backgroundSecondary,
        borderRadius: "12px",
        padding: "12px 16px",
        fontSize: "16px",
        color: colors.text,
        border: `1px solid ${colors.border}`,
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "inherit",
        outline: "none",
        ...style,
      }}
    />
  );
};

export default WebDatePicker;
