import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Route } from "lucide-react";
import type { RegionAggregate, RouteSummary } from "../types";
import { loadGoogleMaps } from "../lib/mapLoader";
import { statusClass } from "./RiskMatrix";

interface PlannerMapProps {
  regions: RegionAggregate[];
  selected?: RegionAggregate;
  onSelect: (region: RegionAggregate) => void;
  onHover: (region: RegionAggregate) => void;
  showRouting: boolean;
  onToggleRouting: () => void;
  onRouteSummary: (summary: RouteSummary | undefined) => void;
}

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export function PlannerMap({ regions, selected, onSelect, onHover, showRouting, onToggleRouting, onRouteSummary }: PlannerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMap = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const originMarker = useRef<any>(null);
  const destinationMarker = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const originRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);
  const selectedRef = useRef<RegionAggregate | undefined>(selected);
  const showRoutingRef = useRef(showRouting);
  const lastCenteredRegionId = useRef<string | undefined>(undefined);
  const [mapError, setMapError] = useState<string | null>(apiKey ? null : "Google Maps key missing. Showing mock spatial geometry.");

  const center = selected ?? regions[0];

  selectedRef.current = selected;
  showRoutingRef.current = showRouting;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    loadGoogleMaps(apiKey)
      .then(() => {
        if (!window.google?.maps || !mapRef.current) return;
        googleMap.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: center?.latitude ?? 22.9, lng: center?.longitude ?? 78.9 },
          zoom: selected ? 9 : 5,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe8ef" }] },
            { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f7f3ea" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6f756f" }] },
            { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d8cfbf" }] },
          ],
        });
        directionsRenderer.current = new window.google.maps.DirectionsRenderer({
          map: googleMap.current,
          preserveViewport: true,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: "#2563eb",
            strokeOpacity: 0.86,
            strokeWeight: 6,
          },
        });
        googleMap.current.addListener("click", (event: any) => {
          if (!showRoutingRef.current) return;
          const latLng = event.latLng;
          if (!latLng) return;
          const origin = { latitude: latLng.lat(), longitude: latLng.lng() };
          if (originMarker.current) originMarker.current.setMap(null);
          originMarker.current = new window.google.maps.Marker({
            position: { lat: origin.latitude, lng: origin.longitude },
            map: googleMap.current,
            label: "A",
          });
          originRef.current = origin;
          requestFastestRoute(origin, selectedRef.current, onRouteSummary);
        });
      })
      .catch((error: Error) => setMapError(error.message));
  }, []);

  useEffect(() => {
    if (!googleMap.current || !window.google?.maps) return;
    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];

    regions.forEach((region) => {
      const marker = new window.google.maps.Marker({
        position: { lat: region.latitude, lng: region.longitude },
        map: googleMap.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: selected?.id === region.id ? 10 : 7,
          fillColor: markerColor(region.status),
          fillOpacity: 0.94,
          strokeColor: "#ffffff",
          strokeWeight: selected?.id === region.id ? 3 : 2,
        },
      });
      marker.addListener("click", () => {
        onSelect(region);
        selectedRef.current = region;
        if (showRoutingRef.current) {
          placeDestinationMarker(region);
        }
        if (showRoutingRef.current && originRef.current) {
          requestFastestRoute(originRef.current, region, onRouteSummary);
        }
      });
      marker.addListener("mouseover", () => onHover(region));
      markers.current.push(marker);
    });

    if (selected && selected.id !== lastCenteredRegionId.current) {
      lastCenteredRegionId.current = selected.id;
      googleMap.current.panTo({ lat: selected.latitude, lng: selected.longitude });
      googleMap.current.setZoom(9);
      if (showRoutingRef.current) {
        placeDestinationMarker(selected);
      }
    }
  }, [regions, selected, onSelect, onHover]);

  useEffect(() => {
    if (showRouting) {
      if (selectedRef.current) {
        placeDestinationMarker(selectedRef.current);
      }
      return;
    }
    clearRoute();
    onRouteSummary(undefined);
  }, [showRouting, onRouteSummary]);

  const fallbackPoints = useMemo(() => projectPoints(regions), [regions]);

  return (
    <section className="map-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Spatial evidence</p>
          <h2>Catchment and travel burden</h2>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            if (showRouting) {
              clearRoute();
              onRouteSummary(undefined);
            }
            onToggleRouting();
          }}
        >
          <Route size={14} /> {showRouting ? "Hide travel route" : "Show travel route"}
        </button>
      </div>
      <div className="map-canvas">
        {apiKey && !mapError ? <div ref={mapRef} className="google-map" /> : <FallbackMap points={fallbackPoints} selected={selected} showRouting={showRouting} onSelect={onSelect} onHover={onHover} onRouteSummary={onRouteSummary} />}
        {mapError && (
          <div className="map-warning">
            <AlertTriangle size={15} /> {mapError}
          </div>
        )}
      </div>
    </section>
  );

  function requestFastestRoute(origin: { latitude: number; longitude: number }, destination: RegionAggregate | undefined, onSummary: (summary: RouteSummary | undefined) => void) {
    if (!destination || !window.google?.maps || !directionsRenderer.current) {
      onSummary(undefined);
      return;
    }

    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin: { lat: origin.latitude, lng: origin.longitude },
        destination: { lat: destination.latitude, lng: destination.longitude },
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result: any, status: string) => {
        if (status !== "OK" || !result?.routes?.[0]?.legs?.[0]) {
          onSummary({
            origin,
            destinationRegionId: destination.id,
            destinationName: destination.villageTown,
            distanceText: "Unavailable",
            durationText: "Unavailable",
            mode: "Driving",
            status: "error",
            message: `Google Directions could not calculate a route (${status}).`,
          });
          return;
        }
        directionsRenderer.current.setDirections(result);
        const leg = result.routes[0].legs[0];
        onSummary({
          origin,
          destinationRegionId: destination.id,
          destinationName: destination.villageTown,
          distanceText: leg.distance?.text ?? "Unknown distance",
          durationText: leg.duration_in_traffic?.text ?? leg.duration?.text ?? "Unknown duration",
          mode: "Driving",
          status: "ready",
          message: "Fastest driving route from selected start point.",
        });
      },
    );
  }

  function placeDestinationMarker(destination: RegionAggregate) {
    if (!googleMap.current || !window.google?.maps) return;
    if (destinationMarker.current) destinationMarker.current.setMap(null);
    destinationMarker.current = new window.google.maps.Marker({
      position: { lat: destination.latitude, lng: destination.longitude },
      map: googleMap.current,
      label: "B",
      zIndex: 999,
    });
  }

  function clearRoute() {
    directionsRenderer.current?.setDirections({ routes: [] });
    if (originMarker.current) {
      originMarker.current.setMap(null);
      originMarker.current = null;
    }
    if (destinationMarker.current) {
      destinationMarker.current.setMap(null);
      destinationMarker.current = null;
    }
    originRef.current = undefined;
  }
}

function FallbackMap({ points, selected, showRouting, onSelect, onHover, onRouteSummary }: { points: Array<{ region: RegionAggregate; x: number; y: number }>; selected?: RegionAggregate; showRouting: boolean; onSelect: (region: RegionAggregate) => void; onHover: (region: RegionAggregate) => void; onRouteSummary: (summary: RouteSummary | undefined) => void }) {
  const [origin, setOrigin] = useState<{ x: number; y: number; latitude: number; longitude: number } | undefined>();

  useEffect(() => {
    if (showRouting) return;
    setOrigin(undefined);
    onRouteSummary(undefined);
  }, [showRouting, onRouteSummary]);

  return (
    <div
      className="fallback-map"
      onClick={(event) => {
        if (!showRouting) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        const nextOrigin = {
          x,
          y,
          latitude: selected ? selected.latitude + 0.18 : 22.9,
          longitude: selected ? selected.longitude - 0.18 : 78.9,
        };
        setOrigin(nextOrigin);
        onRouteSummary(
          selected
            ? {
                origin: { latitude: nextOrigin.latitude, longitude: nextOrigin.longitude },
                destinationRegionId: selected.id,
                destinationName: selected.villageTown,
                distanceText: "Mock geometry",
                durationText: `${selected.nearestTertiaryMinutes} min`,
                mode: "Driving",
                status: "error",
                message: "Add a Google Maps key to calculate live fastest routes.",
              }
            : undefined,
        );
      }}
    >
      <div className="map-gridline vertical" />
      <div className="map-gridline horizontal" />
      {showRouting && origin && <span className="fallback-route-point fallback-route-a" style={{ left: `${origin.x}%`, top: `${origin.y}%` }}>A</span>}
      {points.map(({ region, x, y }) => (
        <button
          key={region.id}
          type="button"
          className={`fallback-marker ${statusClass(region.status)} ${selected?.id === region.id ? "selected" : ""}`}
          style={{ left: `${x}%`, top: `${y}%` }}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(region);
            if (showRouting && origin) {
              onRouteSummary({
                origin: { latitude: origin.latitude, longitude: origin.longitude },
                destinationRegionId: region.id,
                destinationName: region.villageTown,
                distanceText: "Mock geometry",
                durationText: `${region.nearestTertiaryMinutes} min`,
                mode: "Driving",
                status: "error",
                message: "Add a Google Maps key to calculate live fastest routes.",
              });
            }
          }}
          onMouseEnter={() => onHover(region)}
        />
      ))}
      {showRouting && selected && <span className="fallback-route-point fallback-route-b" style={selectedFallbackPosition(selected, points)}>B</span>}
    </div>
  );
}

function selectedFallbackPosition(selected: RegionAggregate, points: Array<{ region: RegionAggregate; x: number; y: number }>) {
  const point = points.find((item) => item.region.id === selected.id);
  return { left: `${point?.x ?? 50}%`, top: `${point?.y ?? 50}%` };
}

function projectPoints(regions: RegionAggregate[]) {
  if (!regions.length) return [];
  const minLat = Math.min(...regions.map((r) => r.latitude));
  const maxLat = Math.max(...regions.map((r) => r.latitude));
  const minLng = Math.min(...regions.map((r) => r.longitude));
  const maxLng = Math.max(...regions.map((r) => r.longitude));
  return regions.map((region) => ({
    region,
    x: 8 + ((region.longitude - minLng) / Math.max(0.1, maxLng - minLng)) * 84,
    y: 92 - ((region.latitude - minLat) / Math.max(0.1, maxLat - minLat)) * 84,
  }));
}

function markerColor(status: string): string {
  if (status === "Verified Care Desert") return "#ef4444";
  if (status === "Data-Poor Region") return "#f59e0b";
  if (status === "Monitored Access") return "#10b981";
  return "#2563eb";
}
