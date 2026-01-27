import React, { useState } from "react";
import {
    Platform,
    Pressable,
    PressableProps,
    StyleProp,
    ViewStyle,
} from "react-native";

export interface HoverableProps extends Omit<
  PressableProps,
  "style" | "children"
> {
  hoverStyle?: StyleProp<ViewStyle>;
  style?:
    | StyleProp<ViewStyle>
    | ((state: {
        pressed: boolean;
        hovered: boolean;
        focused: boolean;
      }) => StyleProp<ViewStyle>);
  children:
    | React.ReactNode
    | ((state: {
        pressed: boolean;
        hovered: boolean;
        focused: boolean;
      }) => React.ReactNode);
}

export function Hoverable({
  style,
  hoverStyle,
  children,
  ...props
}: HoverableProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      {...props}
      onHoverIn={() => {
        if (Platform.OS === "web") {
          setHovered(true);
        }
        props.onHoverIn?.({} as any); // Pass empty event if needed, though Pressable expects NativeSyntheticEvent
      }}
      onHoverOut={() => {
        if (Platform.OS === "web") {
          setHovered(false);
        }
        props.onHoverOut?.({} as any);
      }}
      style={(state) => {
        const isHovered = Platform.OS === "web" ? hovered : false;
        const userStyle =
          typeof style === "function"
            ? style({
                ...state,
                hovered: isHovered,
                focused: false,
              })
            : style;
        const webStyle =
          Platform.OS === "web" && props.onPress ? { cursor: "pointer" } : {};
        return [
          webStyle,
          userStyle,
          isHovered && hoverStyle,
        ] as StyleProp<ViewStyle>;
      }}
    >
      {(state) => {
        const isHovered = Platform.OS === "web" ? hovered : false;
        return typeof children === "function"
          ? children({
              ...state,
              hovered: isHovered,
              focused: false,
            })
          : children;
      }}
    </Pressable>
  );
}
