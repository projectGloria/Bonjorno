import type { WeatherLocation } from '../types/settings';
import { storageGet, storageSet } from './chromeApi';

const WEATHER_CACHE_KEY = 'bonjorno_weather_cache_v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface WeatherSnapshot {
  temperatureC: number;
  apparentTemperatureC: number;
  weatherCode: number;
  isDay: boolean;
  windSpeedKmh: number;
  fetchedAt: number;
  latitude: number;
  longitude: number;
}

export function describeWeatherCode(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Fair';
}

export function formatTemperature(
  tempC: number,
  unit: 'celsius' | 'fahrenheit'
): string {
  if (unit === 'fahrenheit') {
    return `${Math.round((tempC * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(tempC)}°C`;
}

export async function searchCities(query: string): Promise<WeatherLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', trimmed);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error('Could not reach Open-Meteo geocoding service.');
  }
  const data = (await res.json()) as {
    results?: Array<{
      name: string;
      country?: string;
      admin1?: string;
      latitude: number;
      longitude: number;
    }>;
  };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    country: r.country ?? '',
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export async function fetchWeatherForLocation(
  location: WeatherLocation,
  forceRefresh = false
): Promise<WeatherSnapshot> {
  if (!forceRefresh) {
    const cached = await storageGet<WeatherSnapshot>(WEATHER_CACHE_KEY);
    if (
      cached &&
      Math.abs(cached.latitude - location.latitude) < 0.01 &&
      Math.abs(cached.longitude - location.longitude) < 0.01 &&
      Date.now() - cached.fetchedAt < CACHE_TTL_MS
    ) {
      return cached;
    }
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(location.latitude));
  url.searchParams.set('longitude', String(location.longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m'
  );
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error('Weather service temporarily unavailable.');
  }

  const json = (await res.json()) as {
    current?: {
      temperature_2m: number;
      apparent_temperature: number;
      is_day: number;
      weather_code: number;
      wind_speed_10m: number;
    };
  };

  if (!json.current) {
    throw new Error('Unexpected response from Open-Meteo.');
  }

  const snapshot: WeatherSnapshot = {
    temperatureC: json.current.temperature_2m,
    apparentTemperatureC: json.current.apparent_temperature,
    weatherCode: json.current.weather_code,
    isDay: json.current.is_day === 1,
    windSpeedKmh: json.current.wind_speed_10m,
    fetchedAt: Date.now(),
    latitude: location.latitude,
    longitude: location.longitude,
  };

  await storageSet(WEATHER_CACHE_KEY, snapshot);
  return snapshot;
}
