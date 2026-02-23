import ClapLoading from "@/components/ui/ClapLoading";
import { useTheme } from "@/providers/ThemeProvider";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
    Platform,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

const AutoHeightImage = ({
  uri,
  onPress,
}: {
  uri: string;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  const [aspectRatio, setAspectRatio] = useState(1); // Default square
  const [loading, setLoading] = useState(true);
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  const imageContainerStyle: any = {
    width: "100%",
    aspectRatio: aspectRatio,
    marginBottom: 10,
    maxHeight: isWeb && windowWidth > 768 ? 500 : undefined,
    overflow: "hidden",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={imageContainerStyle}
    >
      <Image
        source={{ uri }}
        onLoad={(e) => {
          if (e.source.width && e.source.height) {
            setAspectRatio(e.source.width / e.source.height);
          }
          setLoading(false);
        }}
        contentFit={isWeb ? "contain" : "cover"}
        transition={200}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 8,
        }}
      />
      {loading && (
        <View
          style={{
            ...imageContainerStyle,
            position: "absolute",
            height: 200,
            justifyContent: "center",
          }}
        >
          <ClapLoading size={30} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default AutoHeightImage;
