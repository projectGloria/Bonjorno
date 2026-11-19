import { useEffect, useRef, useState } from 'react';
import {
  describeWeatherCode,
  fetchWeatherForLocation,
  formatTemperature,
  searchCities,
  type WeatherSnapshot,
} from '../services/weather';
import type { WeatherLocation, WeatherSettings } from '../types/settings';
import { CloudIcon, RefreshIcon, SearchIcon, SunIcon } from './Icons';

interface WeatherPillProps {
  weather: WeatherSettings;
  onUpdateWeather: (next: WeatherSettings) => void;
}

export function WeatherPill({ weather, onUpdateWeather }: WeatherPillProps) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<WeatherLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const loadWeather = async (loc: WeatherLocation, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeatherForLocation(loc, force);
      setSnapshot(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to fetch weather right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!weather.enabled || !weather.consentGiven || !weather.location) {
      setSnapshot(null);
      return;
    }
    void loadWeather(weather.location, false);
  }, [weather.enabled, weather.consentGiven, weather.location]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (!weather.enabled) return null;

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cityQuery.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const results = await searchCities(cityQuery);
      setCityResults(results);
      if (results.length === 0) {
        setError('No matching cities found.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'City lookup failed.'
      );
    } finally {
      setSearching(false);
    }
  };

  const selectCity = (loc: WeatherLocation) => {
    onUpdateWeather({
      ...weather,
      consentGiven: true,
      location: loc,
    });
    setCityResults([]);
    setCityQuery('');
  };

  return (
    <div className="weather-wrap" ref={wrapRef}>
      <button
        type="button"
        className="topbar-pill surface-card"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Weather"
      >
        {snapshot?.weatherCode === 0 ? (
          <SunIcon size={15} />
        ) : (
          <CloudIcon size={15} />
        )}
        {snapshot && weather.location ? (
          <span>
            {formatTemperature(snapshot.temperatureC, weather.unit)} ·{' '}
            {weather.location.name}
          </span>
        ) : (
          <span>{loading ? 'Loading...' : 'Set weather'}</span>
        )}
      </button>

      {open && (
        <div className="weather-popover surface-popover">
          {!weather.consentGiven ? (
            <div className="weather-consent">
              <h4>Enable Weather via Open-Meteo</h4>
              <p>
                Weather uses the public, privacy-friendly{' '}
                <strong>Open-Meteo</strong> API (no account or tracking). Only the
                city you choose is queried, and results are cached locally for 30
                minutes.
              </p>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() =>
                  onUpdateWeather({ ...weather, consentGiven: true })
                }
              >
                Allow Open-Meteo Lookup
              </button>
            </div>
          ) : (
            <>
              {snapshot && weather.location && (
                <div className="weather-current">
                  <div>
                    <div className="weather-temp">
                      {formatTemperature(snapshot.temperatureC, weather.unit)}
                    </div>
                    <div className="weather-desc">
                      {describeWeatherCode(snapshot.weatherCode)} · Feels like{' '}
                      {formatTemperature(
                        snapshot.apparentTemperatureC,
                        weather.unit
                      )}
                    </div>
                    <div className="weather-loc">
                      {weather.location.name}
                      {weather.location.country
                        ? `, ${weather.location.country}`
                        : ''}
                      {' · '}Wind {Math.round(snapshot.windSpeedKmh)} km/h
                    </div>
                  </div>
                  <div className="weather-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() =>
                        onUpdateWeather({
                          ...weather,
                          unit:
                            weather.unit === 'celsius'
                              ? 'fahrenheit'
                              : 'celsius',
                        })
                      }
                      title="Toggle °C / °F"
                    >
                      {weather.unit === 'celsius' ? '°C' : '°F'}
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() =>
                        weather.location && loadWeather(weather.location, true)
                      }
                      disabled={loading}
                      aria-label="Refresh weather"
                      title="Refresh"
                    >
                      <RefreshIcon size={14} />
                    </button>
                  </div>
                </div>
              )}

              <form className="weather-search" onSubmit={handleCitySearch}>
                <input
                  type="text"
                  className="text-input"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Search city (e.g. Lisbon)..."
                  aria-label="Search city"
                />
                <button
                  type="submit"
                  className="icon-btn"
                  disabled={searching || cityQuery.trim().length < 2}
                  aria-label="Search city"
                >
                  <SearchIcon size={14} />
                </button>
              </form>

              {error && <p className="field-error">{error}</p>}

              {cityResults.length > 0 && (
                <ul className="weather-results">
                  {cityResults.map((loc) => (
                    <li key={`${loc.latitude}-${loc.longitude}`}>
                      <button
                        type="button"
                        className="weather-result-btn"
                        onClick={() => selectCity(loc)}
                      >
                        <strong>{loc.name}</strong>
                        <span>
                          {[loc.admin1, loc.country].filter(Boolean).join(', ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="weather-attribution">
                Data by Open-Meteo · Cached locally for 30 min
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
