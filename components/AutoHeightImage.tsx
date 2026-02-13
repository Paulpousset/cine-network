import ClapLoading from "@/components/ClapLoading";
import { useTheme } from "@/providers/ThemeProvider";
import React, { useEffect, useState } from "react";
import {
  Image,
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

  useEffect(() => {
    let isMounted = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (isMounted && width && height) {
          setAspectRatio(width / height);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Failed to get image size", error);
        if (isMounted) setLoading(false);
      },
    );
    return () => {
      isMounted = false;
    };
  }, [uri]);

  if (loading) {
    return (
      <View
        style={{
          width: "100%",
          height: 200,
          backgroundColor: colors.backgroundSecondary,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 8,
          marginBottom: 10,
        }}
      >
        <ClapLoading size={30} />
      </View>
    );
  }

  // Sur Web, on limite la hauteur maximale des images pour éviter qu'elles ne remplissent l'écran
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
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 8,
        }}
        resizeMode={isWeb ? "contain" : "cover"}
      />
    </TouchableOpacity>
  );
};

export default AutoHeightImage;
