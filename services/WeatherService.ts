// services/WeatherService.ts

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
export const getWeatherCodeInfo = (code: number) => {
  switch (code) {
    case 0:
      return { label: "Ciel dégagé", icon: "sunny" };
    case 1:
    case 2:
    case 3:
      return { label: "Partiellement nuageux", icon: "partly-sunny" };
    case 45:
    case 48:
      return { label: "Brouillard", icon: "cloudy" };
    case 51:
    case 53:
    case 55:
      return { label: "Bruine légère", icon: "rainy" };
    case 56:
    case 57:
      return { label: "Bruine verglaçante", icon: "snow" };
    case 61:
    case 63:
    case 65:
      return { label: "Pluie", icon: "rainy" };
    case 66:
    case 67:
      return { label: "Pluie verglaçante", icon: "snow" };
    case 71:
    case 73:
    case 75:
      return { label: "Neige", icon: "snow" };
    case 77:
      return { label: "Grains de neige", icon: "snow" };
    case 80:
    case 81:
    case 82:
      return { label: "Averses de pluie", icon: "rainy" };
    case 85:
    case 86:
      return { label: "Averses de neige", icon: "snow" };
    case 95:
      return { label: "Orage", icon: "thunderstorm" };
    case 96:
    case 99:
      return { label: "Orage avec grêle", icon: "thunderstorm" };
    default:
      return { label: "Inconnu", icon: "help" };
  }
};

interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
}

interface WeatherData {
  temperature_2m: number;
  weathercode: number;
}

export const WeatherService = {
  /**
   * Geocode a location string (address or city) to lat/lon
   */
  async geocode(location: string): Promise<GeoResult | null> {
    try {
      if (!location) return null;

      const performGeocode = async (name: string) => {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          name,
        )}&count=1&language=fr&format=json`;
        const res = await fetch(url);
        return await res.json();
      };

      let data = await performGeocode(location);

      // FALLBACK LOGIC
      if (!data.results || data.results.length === 0) {
        // 1. Try splitting by comma
        if (location.includes(",")) {
          const parts = location.split(",");
          const cityPart = parts[parts.length - 1].trim();
          if (cityPart) {
            data = await performGeocode(cityPart);
          }
        }

        // 2. Try extracting city-like part (last two words: often ZIP + City or just City)
        if (!data.results || data.results.length === 0) {
          const words = location.trim().split(/\s+/);
          if (words.length > 2) {
            // Take last 2 words (e.g., "75015 Paris")
            const cityGuess = words.slice(-2).join(" ");
            data = await performGeocode(cityGuess);
          }
        }

        // 3. Try just the last word
        if (!data.results || data.results.length === 0) {
          const words = location.trim().split(/\s+/);
          if (words.length > 0) {
            data = await performGeocode(words[words.length - 1]);
          }
        }
      }

      if (data.results && data.results.length > 0) {
        return {
          latitude: data.results[0].latitude,
          longitude: data.results[0].longitude,
          name: data.results[0].name,
        };
      }
      return null;
    } catch (e) {
      console.error("[WeatherService] Geocoding error:", e);
      return null;
    }
  },

  /**
   * Get weather forecast for a specific date and time
   * Since Open-Meteo gives hourly data, we'll try to match the closest hour.
   * Note: Open-Meteo Free API usually provides 7 day forecast.
   * If the date is too far, it might not return accurate data or might return historical if available.
   * We will use the forecast endpoint.
   */
  async getForecast(
    lat: number,
    lon: number,
    dateStr: string, // YYYY-MM-DD or ISO
    timeStr: string, // HH:MM or HH:MM:SS
  ): Promise<WeatherData | null> {
    try {
      if (!dateStr) return null;

      // Extract only YYYY-MM-DD from dateStr
      const sanitizedDate = dateStr.split("T")[0];

      // If no time provided, assume noon 12:00
      const targetTime = timeStr || "12:00";
      const targetHour = parseInt(targetTime.split(":")[0], 10);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&start_date=${sanitizedDate}&end_date=${sanitizedDate}&timezone=auto`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data || !data.hourly || !data.hourly.time) {
        console.warn(
          "[WeatherService] No hourly data found for",
          sanitizedDate,
          data,
        );
        return null;
      }

      const times = data.hourly.time as string[];
      let closestIndex = -1;

      // Find the index for the requested hour
      // Open-Meteo returns ISO strings like "2024-01-29T13:00"
      const targetHourStr = targetHour.toString().padStart(2, "0");
      const targetPrefix = `${sanitizedDate}T${targetHourStr}`;

      closestIndex = times.findIndex((t) => t.startsWith(targetPrefix));

      // Fallback: if not found, use the closest hour or noon
      if (closestIndex === -1) {
        closestIndex = Math.min(targetHour, times.length - 1);
      }

      if (
        closestIndex !== -1 &&
        data.hourly.temperature_2m &&
        data.hourly.weathercode
      ) {
        return {
          temperature_2m: data.hourly.temperature_2m[closestIndex],
          weathercode: data.hourly.weathercode[closestIndex],
        };
      }

      return null;
    } catch (e) {
      console.error("[WeatherService] Forecast error:", e);
      return null;
    }
  },
};
