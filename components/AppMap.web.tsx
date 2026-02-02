import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

export const PROVIDER_DEFAULT = "google";

export const Marker = ({
  coordinate,
  title,
  description,
  onCalloutPress,
  children,
}: any) => {
  if (typeof window === "undefined") return null;
  const { Marker: LeafletMarker, Popup } = require("react-leaflet");
  const L = require("leaflet");

  // Simple fallback for icons if they are loading from CDN
  const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  // Try to find a label if children are provided (matching jobs.tsx usage)
  let label = "";
  try {
    if (children) {
      // Deep search for text children
      const findText = (node: any): string => {
        if (typeof node === "string" || typeof node === "number")
          return node.toString();
        if (Array.isArray(node)) return node.map(findText).join("");
        if (node?.props?.children) return findText(node.props.children);
        return "";
      };
      label = findText(children);
    }
  } catch (e) {
    console.log("Error extracting marker label", e);
  }

  const icon = label
    ? L.divIcon({
        html: `<div style="background-color: #6200ee; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${label}</div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
    : DefaultIcon;

  return (
    <LeafletMarker
      position={[coordinate.latitude, coordinate.longitude]}
      icon={icon}
    >
      {(title || description) && (
        <Popup>
          <div
            style={{ cursor: "pointer", padding: "5px" }}
            onClick={() => onCalloutPress && onCalloutPress()}
          >
            <h3 style={{ margin: 0, fontSize: "14px", color: "#333" }}>
              {title}
            </h3>
            {description && (
              <p
                style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}
              >
                {description}
              </p>
            )}
            <p
              style={{
                margin: "8px 0 0 0",
                color: "#6200ee",
                fontWeight: "bold",
                fontSize: "11px",
              }}
            >
              Voir les détails →
            </p>
          </div>
        </Popup>
      )}
    </LeafletMarker>
  );
};

const AppMap = ({ style, initialRegion, children }: any) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === "undefined") {
    return (
      <View
        style={[
          {
            flex: 1,
            backgroundColor: "#f0f0f0",
            justifyContent: "center",
            alignItems: "center",
          },
          style,
        ]}
      >
        <Text>Chargement de la carte...</Text>
      </View>
    );
  }

  const { MapContainer, TileLayer } = require("react-leaflet");

  // Leaflet expects center as [lat, lon]
  const center: [number, number] = initialRegion
    ? [initialRegion.latitude, initialRegion.longitude]
    : [46.603354, 1.888334];

  // zoom level calculation from delta
  const zoom = initialRegion
    ? Math.max(
        1,
        Math.min(
          18,
          Math.round(Math.log2(360 / (initialRegion.latitudeDelta || 10))),
        ),
      )
    : 5;

  const flattenedStyle = Array.isArray(style)
    ? Object.assign({}, ...style)
    : style;

  return (
    <View
      style={[{ flex: 1, minHeight: 400, overflow: "hidden" }, flattenedStyle]}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </View>
  );
};

export default AppMap;
