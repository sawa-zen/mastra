import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const WEATHER_CODE_JA: Record<number, string> = {
  0: "快晴",
  1: "ほぼ晴れ",
  2: "晴れ時々曇り",
  3: "曇り",
  45: "霧",
  48: "着氷性の霧",
  51: "霧雨 (弱)",
  53: "霧雨",
  55: "霧雨 (強)",
  61: "雨 (弱)",
  63: "雨",
  65: "雨 (強)",
  71: "雪 (弱)",
  73: "雪",
  75: "雪 (強)",
  80: "にわか雨 (弱)",
  81: "にわか雨",
  82: "にわか雨 (強)",
  95: "雷雨",
  96: "雷雨 (ひょう・弱)",
  99: "雷雨 (ひょう・強)",
};

export const weatherTool = createTool({
  id: "get-weather",
  description:
    "指定した地名 (例: 東京、Tokyo、Osaka) の現在の天気を取得する。Open-Meteo を利用。",
  inputSchema: z.object({
    location: z.string().describe("天気を知りたい地名。日本語/英語どちらでも可"),
  }),
  outputSchema: z.object({
    location: z.string(),
    country: z.string().optional(),
    temperatureC: z.number(),
    apparentTemperatureC: z.number(),
    humidity: z.number(),
    windSpeedKmh: z.number(),
    condition: z.string(),
    weatherCode: z.number(),
  }),
  execute: async ({ location }) => {

    const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geoUrl.searchParams.set("name", location);
    geoUrl.searchParams.set("count", "1");
    geoUrl.searchParams.set("language", "ja");
    geoUrl.searchParams.set("format", "json");

    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw new Error(`geocoding failed: ${geoRes.status} ${geoRes.statusText}`);
    }
    const geo = (await geoRes.json()) as {
      results?: Array<{
        name: string;
        country?: string;
        latitude: number;
        longitude: number;
      }>;
    };
    const hit = geo.results?.[0];
    if (!hit) {
      throw new Error(`地名が見つからない: ${location}`);
    }

    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(hit.latitude));
    weatherUrl.searchParams.set("longitude", String(hit.longitude));
    weatherUrl.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
    );
    weatherUrl.searchParams.set("timezone", "auto");

    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) {
      throw new Error(
        `weather fetch failed: ${weatherRes.status} ${weatherRes.statusText}`,
      );
    }
    const data = (await weatherRes.json()) as {
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        weather_code: number;
        wind_speed_10m: number;
      };
    };

    const code = data.current.weather_code;
    return {
      location: hit.name,
      country: hit.country,
      temperatureC: data.current.temperature_2m,
      apparentTemperatureC: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeedKmh: data.current.wind_speed_10m,
      condition: WEATHER_CODE_JA[code] ?? "不明",
      weatherCode: code,
    };
  },
});
