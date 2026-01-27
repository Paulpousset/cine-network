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
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        backgroundColor: "#F9FAFB",
        borderRadius: "12px",
        padding: "12px 16px",
        fontSize: "16px",
        color: "#1F2937",
        border: "1px solid transparent",
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
