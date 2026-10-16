import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, Loader2, Sparkles, Check } from 'lucide-react';

const RECOMMENDED_PLACES = [
  { name: 'Mumbai', detail: 'Maharashtra, India', icon: '🏙️' },
  { name: 'New Delhi', detail: 'Delhi, India', icon: '🏛️' },
  { name: 'Bengaluru', detail: 'Karnataka, India', icon: '💻' },
  { name: 'Pune', detail: 'Maharashtra, India', icon: '🌆' },
  { name: 'Hyderabad', detail: 'Telangana, India', icon: '🏰' },
  { name: 'Goa', detail: 'India', icon: '🏖️' },
  { name: 'Kolkata', detail: 'West Bengal, India', icon: '🕌' },
  { name: 'Chennai', detail: 'Tamil Nadu, India', icon: '🏢' },
  { name: 'Jaipur', detail: 'Rajasthan, India', icon: '🏰' },
  { name: 'Ahmedabad', detail: 'Gujarat, India', icon: '🏭' },
];

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  currentLocation = ''
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setGpsError('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // Live location autocomplete using Photon (OpenStreetMap)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`
        );
        const data = await res.json();
        if (data && data.features) {
          const formatted = data.features.map((f) => {
            const p = f.properties;
            const primary = p.name || '';
            const secondary = [p.locality, p.district, p.city, p.state, p.country]
              .filter(Boolean)
              .filter((item, idx, arr) => item !== primary && arr.indexOf(item) === idx)
              .slice(0, 2)
              .join(', ');

            return {
              name: primary,
              detail: secondary,
              full: secondary ? `${primary}, ${secondary}` : primary
            };
          });
          setSearchResults(formatted);
        }
      } catch (err) {
        console.error('Location search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  // GPS Live Location Detection
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`
          );
          const data = await res.json();

          if (data && data.features && data.features.length > 0) {
            const p = data.features[0].properties;
            const area = p.locality || p.district || p.suburb || p.name || '';
            const city = p.city || p.county || p.state || '';
            const country = p.country || '';

            const parts = [area, city, country]
              .filter(Boolean)
              .filter((item, idx, arr) => arr.indexOf(item) === idx);

            const detectedLocation =
              parts.slice(0, 2).join(', ') || `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;

            onSelectLocation(detectedLocation);
            onClose();
          } else {
            onSelectLocation('Current Location');
            onClose();
          }
        } catch (err) {
          setGpsError('Location detected, but failed to fetch address name.');
        } finally {
          setIsDetectingGps(false);
        }
      },
      (error) => {
        setIsDetectingGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Location permission denied in browser.');
        } else {
          setGpsError('Could not detect location. Please search manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelect = (placeString) => {
    onSelectLocation(placeString);
    onClose();
  };

  const handleClearLocation = () => {
    onSelectLocation('');
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-full">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Location</h3>
              <p className="text-xs text-zinc-400">Where are you tweeting from?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Option 2: GPS Detect Button */}
          <div>
            <button
              type="button"
              onClick={handleDetectGps}
              disabled={isDetectingGps}
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-indigo-500/15 hover:from-sky-500/25 hover:to-indigo-500/25 border border-sky-500/30 hover:border-sky-400 rounded-2xl flex items-center justify-between text-left transition group shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                  {isDetectingGps ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <span>Use Current Location</span>
                    <span className="text-[10px] bg-sky-500/30 text-sky-300 font-semibold px-1.5 py-0.5 rounded-full">
                      GPS
                    </span>
                  </span>
                  <p className="text-xs text-zinc-400">
                    {isDetectingGps
                      ? 'Detecting your area via GPS...'
                      : 'Auto-detect your city & neighborhood'}
                  </p>
                </div>
              </div>
            </button>

            {gpsError && (
              <p className="text-xs text-rose-400 mt-1.5 px-1 font-medium">
                ⚠️ {gpsError}
              </p>
            )}
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search city, area, or landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results (Live Autocomplete) */}
          {searchQuery.trim().length >= 2 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-semibold">
                <span>Matching Places</span>
                {isSearching && (
                  <span className="flex items-center space-x-1 text-sky-400 text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Searching...</span>
                  </span>
                )}
              </div>

              {searchResults.length > 0 ? (
                <div className="divide-y divide-zinc-900 rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
                  {searchResults.map((item, idx) => (
                    <button
                      type="button"
                      key={`${item.name}-${idx}`}
                      onClick={() => handleSelect(item.full)}
                      className="w-full px-3.5 py-2.5 flex items-center space-x-3 text-left hover:bg-zinc-800/60 transition group"
                    >
                      <MapPin className="w-4 h-4 text-zinc-500 group-hover:text-sky-400 shrink-0 transition" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-white block truncate">
                          {item.name}
                        </span>
                        {item.detail && (
                          <span className="text-xs text-zinc-400 block truncate">
                            {item.detail}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : !isSearching ? (
                <div className="py-6 text-center text-xs text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-900">
                  No places found for "{searchQuery}".
                </div>
              ) : null}
            </div>
          )}

          {/* Option 3: Recommended & Popular Places */}
          {(!searchQuery.trim() || searchQuery.trim().length < 2) && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 px-1 text-xs font-bold text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Recommended & Popular Places</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {RECOMMENDED_PLACES.map((place) => {
                  const isCurrent =
                    currentLocation &&
                    (currentLocation === place.name ||
                      currentLocation.startsWith(place.name));

                  return (
                    <button
                      type="button"
                      key={place.name}
                      onClick={() => handleSelect(`${place.name}, ${place.detail.split(',')[0]}`)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2.5 ${
                        isCurrent
                          ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                          : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/70 hover:border-zinc-700 text-zinc-200'
                      }`}
                    >
                      <span className="text-base shrink-0">{place.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate text-white">
                            {place.name}
                          </span>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1" />}
                        </div>
                        <span className="text-[11px] text-zinc-400 truncate block">
                          {place.detail}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Clear current location button if set */}
        {currentLocation && (
          <div className="p-3 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
            <span className="truncate max-w-[240px]">
              Selected: <strong className="text-white">{currentLocation}</strong>
            </span>
            <button
              type="button"
              onClick={handleClearLocation}
              className="text-rose-400 hover:text-rose-300 font-semibold hover:underline"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
