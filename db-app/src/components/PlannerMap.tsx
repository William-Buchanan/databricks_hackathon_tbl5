import { useEffect, useMemo, useRef, useState } from "react";
import { cellToBoundary, cellToLatLng, cellToParent, isValidCell, latLngToCell, polygonToCells } from "h3-js";
import { AlertTriangle, Route } from "lucide-react";
import { logPlannerEvent } from "../lib/auditLog";
import type { FacilityRecord, RegionAggregate, RouteSummary } from "../types";
import { loadGoogleMaps } from "../lib/mapLoader";
import { statusClass } from "./RiskMatrix";

interface PlannerMapProps {
  regions: RegionAggregate[];
  selected?: RegionAggregate;
  onSelect: (region: RegionAggregate) => void;
  onScopeRegion?: (region: RegionAggregate) => void;
  onHover: (region: RegionAggregate) => void;
  showRouting: boolean;
  onToggleRouting: () => void;
  onRouteSummary: (summary: RouteSummary | undefined) => void;
}

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const INDIA_BOUNDS = { minLat: 6.5, maxLat: 37.5, minLng: 68, maxLng: 98.5 };
const H3_DISPLAY_RESOLUTION = 4;
const H3_FACILITY_DOT_ZOOM = 8;
type MapLayerMode = "points" | "h3";

interface H3Cell {
  id: string;
  hasData: boolean;
  centerLat: number;
  centerLng: number;
  vertices: Array<{ latitude: number; longitude: number }>;
  regions: RegionAggregate[];
  topRegion?: RegionAggregate;
  averageRisk: number;
  averageTrust: number;
  population: number;
}

interface H3FacilityPoint {
  facility: FacilityRecord;
  region: RegionAggregate;
}

export function PlannerMap({ regions, selected, onSelect, onScopeRegion, onHover, showRouting, onToggleRouting, onRouteSummary }: PlannerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMap = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const heatPolygons = useRef<any[]>([]);
  const h3FacilityMarkers = useRef<any[]>([]);
  const originMarker = useRef<any>(null);
  const destinationMarker = useRef<any>(null);
  const h3HospitalMarker = useRef<any>(null);
  const h3HospitalInfoWindow = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const originRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);
  const selectedRef = useRef<RegionAggregate | undefined>(selected);
  const showRoutingRef = useRef(showRouting);
  const layerModeRef = useRef<MapLayerMode>("points");
  const lastCenteredRegionId = useRef<string | undefined>(undefined);
  const [mapError, setMapError] = useState<string | null>(apiKey ? null : "Google Maps key missing. Showing mock spatial geometry.");
  const [layerMode, setLayerMode] = useState<MapLayerMode>("points");
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(5);

  const center = selected ?? regions[0];
  const heatCells = useMemo(() => h3Cells(regions), [regions]);
  const h3FacilityPoints = useMemo(() => facilityPointsForRegions(regions), [regions]);

  selectedRef.current = selected;
  showRoutingRef.current = showRouting;
  layerModeRef.current = layerMode;

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
        setMapReady(true);
        setMapZoom(googleMap.current.getZoom?.() ?? 5);
        googleMap.current.addListener("click", (event: any) => {
          if (layerModeRef.current !== "points") return;
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
        googleMap.current.addListener("zoom_changed", () => {
          const zoom = googleMap.current?.getZoom?.();
          if (typeof zoom === "number") setMapZoom(zoom);
        });
      })
      .catch((error: Error) => setMapError(error.message));
  }, []);

  useEffect(() => {
    if (!mapReady || !googleMap.current || !window.google?.maps) return;
    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];

    regions.forEach((region) => {
      const marker = new window.google.maps.Marker({
        position: { lat: region.latitude, lng: region.longitude },
        map: googleMap.current,
        visible: layerMode === "points",
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
      if (layerMode === "points" && showRoutingRef.current) {
        placeDestinationMarker(selected);
      }
    }
  }, [regions, selected, onSelect, onHover, layerMode, mapReady]);

  useEffect(() => {
    if (!mapReady || !googleMap.current || !window.google?.maps) return;
    heatPolygons.current.forEach((polygon) => polygon.setMap(null));
    heatPolygons.current = [];

    if (layerMode !== "h3") return;

    heatCells.forEach((cell) => {
      const polygon = new window.google.maps.Polygon({
        paths: cell.vertices.map((point) => ({ lat: point.latitude, lng: point.longitude })),
        strokeColor: cell.hasData ? heatColor(cell.averageRisk) : "#d8cfbf",
        strokeOpacity: cell.hasData ? 0.88 : 0.34,
        strokeWeight: selected?.id && cell.regions.some((region) => region.id === selected.id) ? 2.4 : 0.7,
        fillColor: cell.hasData ? heatColor(cell.averageRisk) : "#edf2ef",
        fillOpacity: cell.hasData ? 0.32 + Math.min(0.3, cell.averageRisk / 340) : 0.16,
        map: googleMap.current,
      });
      if (cell.topRegion) {
        polygon.addListener("click", () => applyH3RegionScope(cell.topRegion as RegionAggregate));
        polygon.addListener("mouseover", () => onHover(cell.topRegion as RegionAggregate));
      }
      heatPolygons.current.push(polygon);
    });
  }, [heatCells, layerMode, mapReady, onHover, onSelect, selected?.id]);

  useEffect(() => {
    if (!mapReady || !googleMap.current || !window.google?.maps) return;
    h3FacilityMarkers.current.forEach((marker) => marker.setMap(null));
    h3FacilityMarkers.current = [];

    if (layerMode !== "h3" || mapZoom < H3_FACILITY_DOT_ZOOM) return;

    h3FacilityPoints.forEach((point) => {
      const marker = new window.google.maps.Marker({
        position: { lat: point.facility.latitude, lng: point.facility.longitude },
        map: googleMap.current,
        title: point.facility.facilityName,
        zIndex: 900,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: selected?.id === point.region.id ? 5.8 : 4.8,
          fillColor: markerColor(point.region.status),
          fillOpacity: 0.92,
          strokeColor: "#ffffff",
          strokeWeight: 1.5,
        },
      });
      marker.addListener("click", () => {
        showH3Facility(point, marker);
        onScopeRegion?.(point.region);
        if (!onScopeRegion) onSelect(point.region);
        selectedRef.current = point.region;
      });
      marker.addListener("mouseover", () => onHover(point.region));
      h3FacilityMarkers.current.push(marker);
    });
  }, [h3FacilityPoints, layerMode, mapReady, mapZoom, onHover, onScopeRegion, onSelect, selected?.id]);

  useEffect(() => {
    if (layerMode === "h3") {
      clearRoute();
      onRouteSummary(undefined);
      return;
    }
    if (showRouting) {
      if (selectedRef.current) {
        placeDestinationMarker(selectedRef.current);
      }
      return;
    }
    clearRoute();
    onRouteSummary(undefined);
  }, [showRouting, onRouteSummary, layerMode]);

  const fallbackPoints = useMemo(() => projectPoints(regions), [regions]);
  const fallbackCells = useMemo(() => projectHeatCells(heatCells), [heatCells]);

  return (
    <section className="map-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Spatial evidence</p>
          <h2>Catchment and travel burden</h2>
        </div>
        <div className="map-actions">
          <div className="map-layer-toggle" aria-label="Map layer">
            <button type="button" className={layerMode === "points" ? "active" : ""} onClick={() => changeLayerMode("points")}>
              Map
            </button>
            <button type="button" className={layerMode === "h3" ? "active" : ""} onClick={() => changeLayerMode("h3")}>
              H3 heatmap
            </button>
          </div>
          {layerMode === "points" && (
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
          )}
        </div>
      </div>
      <div className="map-canvas">
        {apiKey && !mapError ? (
          <div ref={mapRef} className="google-map" />
        ) : (
          <FallbackMap
            points={fallbackPoints}
            cells={fallbackCells}
            selected={selected}
            showRouting={showRouting && layerMode === "points"}
            layerMode={layerMode}
            onSelect={onSelect}
            onScopeRegion={onScopeRegion}
            onHover={onHover}
            onRouteSummary={onRouteSummary}
          />
        )}
        {layerMode === "h3" && <HeatmapLegend cells={heatCells} facilityCount={h3FacilityPoints.length} mapZoom={mapZoom} />}
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
    if (!mapReady || !googleMap.current || !window.google?.maps) return;
    if (destinationMarker.current) destinationMarker.current.setMap(null);
    destinationMarker.current = new window.google.maps.Marker({
      position: { lat: destination.latitude, lng: destination.longitude },
      map: googleMap.current,
      label: "B",
      zIndex: 999,
    });
  }

  function showH3Hospital(region: RegionAggregate) {
    if (!mapReady || !googleMap.current || !window.google?.maps) return;
    const hospital = displayHospitalForRegion(region);
    const position = {
      lat: hospital.latitude,
      lng: hospital.longitude,
    };
    if (h3HospitalMarker.current) h3HospitalMarker.current.setMap(null);
    h3HospitalInfoWindow.current?.close?.();
    h3HospitalMarker.current = new window.google.maps.Marker({
      position,
      map: googleMap.current,
      title: hospital.name,
      zIndex: 1000,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#0b2026",
        fillOpacity: 0.94,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
    h3HospitalInfoWindow.current = new window.google.maps.InfoWindow({
      content: `<strong>${escapeHtml(hospital.name)}</strong><br/><span>${escapeHtml(region.villageTown)}, ${escapeHtml(region.district)}</span>`,
    });
    h3HospitalInfoWindow.current.open({
      anchor: h3HospitalMarker.current,
      map: googleMap.current,
    });
    googleMap.current.panTo(position);
  }

  function showH3Facility(point: H3FacilityPoint, marker: any) {
    if (!mapReady || !googleMap.current || !window.google?.maps) return;
    const position = {
      lat: point.facility.latitude,
      lng: point.facility.longitude,
    };
    h3HospitalInfoWindow.current?.close?.();
    h3HospitalInfoWindow.current = new window.google.maps.InfoWindow({
      content: `<strong>${escapeHtml(point.facility.facilityName || "Hospital")}</strong><br/><span>${escapeHtml(point.region.villageTown)}, ${escapeHtml(point.region.district)}</span>`,
    });
    h3HospitalInfoWindow.current.open({
      anchor: marker,
      map: googleMap.current,
    });
    googleMap.current.panTo(position);
  }

  function clearH3Hospital() {
    h3HospitalInfoWindow.current?.close?.();
    h3HospitalInfoWindow.current = null;
    h3FacilityMarkers.current.forEach((marker) => marker.setMap(null));
    h3FacilityMarkers.current = [];
    if (h3HospitalMarker.current) {
      h3HospitalMarker.current.setMap(null);
      h3HospitalMarker.current = null;
    }
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

  function changeLayerMode(nextMode: MapLayerMode) {
    setLayerMode(nextMode);
    if (nextMode === "h3") {
      clearRoute();
      onRouteSummary(undefined);
    } else {
      clearH3Hospital();
    }
    logPlannerEvent({
      eventType: "map_layer_changed",
      payload: {
        layerMode: nextMode,
        h3CellCount: heatCells.length,
        visibleRegionCount: regions.length,
      },
    });
  }

  function applyH3RegionScope(region: RegionAggregate) {
    clearRoute();
    onRouteSummary(undefined);
    showH3Hospital(region);
    onScopeRegion?.(region);
    if (!onScopeRegion) onSelect(region);
    selectedRef.current = region;
  }
}

function displayHospitalForRegion(region: RegionAggregate) {
  const facility = [...region.facilities].sort((a, b) => (b.accuracyConfidence ?? 0) - (a.accuracyConfidence ?? 0))[0];
  return {
    name: facility?.facilityName || region.villageTown,
    latitude: facility?.latitude || region.latitude,
    longitude: facility?.longitude || region.longitude,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return replacements[character];
  });
}

function FallbackMap({ points, cells, selected, showRouting, layerMode, onSelect, onScopeRegion, onHover, onRouteSummary }: { points: Array<{ region: RegionAggregate; x: number; y: number }>; cells: Array<H3Cell & { x: number; y: number; width: number; height: number }>; selected?: RegionAggregate; showRouting: boolean; layerMode: MapLayerMode; onSelect: (region: RegionAggregate) => void; onScopeRegion?: (region: RegionAggregate) => void; onHover: (region: RegionAggregate) => void; onRouteSummary: (summary: RouteSummary | undefined) => void }) {
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
      {layerMode === "h3" &&
        cells.map((cell) => (
          <button
            key={cell.id}
            type="button"
            className={`h3-cell ${selected && cell.regions.some((region) => region.id === selected.id) ? "selected" : ""}`}
            style={{
              left: `${cell.x}%`,
              top: `${cell.y}%`,
              width: `${cell.width}%`,
              height: `${cell.height}%`,
              backgroundColor: cell.hasData ? heatColor(cell.averageRisk) : "#edf2ef",
              opacity: cell.hasData ? 0.34 + Math.min(0.32, cell.averageRisk / 320) : 0.18,
            }}
            title={`${cell.id}: risk ${cell.averageRisk}, trust ${cell.averageTrust}, ${cell.regions.length} zones`}
            onClick={(event) => {
              event.stopPropagation();
              if (cell.topRegion) {
                onScopeRegion?.(cell.topRegion);
                if (!onScopeRegion) onSelect(cell.topRegion);
              }
            }}
            onMouseEnter={() => {
              if (cell.topRegion) onHover(cell.topRegion);
            }}
          >
            <span>{cell.id.split("-").slice(-2).join("-")}</span>
          </button>
        ))}
      {showRouting && origin && <span className="fallback-route-point fallback-route-a" style={{ left: `${origin.x}%`, top: `${origin.y}%` }}>A</span>}
      {layerMode === "points" && points.map(({ region, x, y }) => (
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
      {showRouting && selected && layerMode === "points" && <span className="fallback-route-point fallback-route-b" style={selectedFallbackPosition(selected, points)}>B</span>}
    </div>
  );
}

function HeatmapLegend({ cells, facilityCount, mapZoom }: { cells: H3Cell[]; facilityCount: number; mapZoom: number }) {
  const highRiskCells = cells.filter((cell) => cell.averageRisk >= 70).length;
  const dotsVisible = mapZoom >= H3_FACILITY_DOT_ZOOM;
  return (
    <div className="heatmap-legend">
      <strong>H3 risk heatmap</strong>
      <span>{cells.length} grid cells · {highRiskCells} high-risk</span>
      <div>
        <i className="low" />
        <i className="mid" />
        <i className="high" />
      </div>
      <small>Resolution {H3_DISPLAY_RESOLUTION}; facility H3 indices are aggregated into each cell.</small>
      <small>{dotsVisible ? `${facilityCount} hospital dots visible` : `Zoom to ${H3_FACILITY_DOT_ZOOM}+ to see hospital dots`}</small>
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

function facilityPointsForRegions(regions: RegionAggregate[]): H3FacilityPoint[] {
  const seen = new Set<string>();
  const points: H3FacilityPoint[] = [];
  regions.forEach((region) => {
    region.facilities.forEach((facility) => {
      if (!Number.isFinite(facility.latitude) || !Number.isFinite(facility.longitude)) return;
      const key = facility.uniqueId ?? facility.id ?? `${facility.facilityName}-${facility.latitude}-${facility.longitude}`;
      if (seen.has(key)) return;
      seen.add(key);
      points.push({ facility, region });
    });
  });
  return points;
}

function h3Cells(regions: RegionAggregate[]): H3Cell[] {
  const indiaCells = indiaCoverageCells();
  const groups = new Map<string, RegionAggregate[]>();

  regions
    .filter((region) => insideIndia(region.latitude, region.longitude))
    .forEach((region) => {
      const rawH3 = region.facilities.find((facility) => facility.h3Index7 && isValidCell(facility.h3Index7))?.h3Index7;
      const id = rawH3 ? cellToParent(rawH3, H3_DISPLAY_RESOLUTION) : latLngToCell(region.latitude, region.longitude, H3_DISPLAY_RESOLUTION);
      const current = groups.get(id) ?? [];
      current.push(region);
      groups.set(id, current);
    });

  return Array.from(new Set([...indiaCells, ...groups.keys()]))
    .map((id) => h3CellSummary(id, groups.get(id) ?? []))
    .sort((a, b) => b.averageRisk - a.averageRisk);
}

function h3CellSummary(id: string, cellRegions: RegionAggregate[]): H3Cell {
  const [centerLat, centerLng] = cellToLatLng(id);
  const topRegion = cellRegions.length ? [...cellRegions].sort((a, b) => b.riskScore - a.riskScore || a.trustScore - b.trustScore)[0] : undefined;
  return {
    id,
    hasData: cellRegions.length > 0,
    centerLat,
    centerLng,
    vertices: cellToBoundary(id).map(([latitude, longitude]) => ({ latitude, longitude })),
    regions: cellRegions,
    topRegion,
    averageRisk: cellRegions.length ? Math.round(cellRegions.reduce((sum, region) => sum + region.riskScore, 0) / cellRegions.length) : 0,
    averageTrust: cellRegions.length ? Math.round(cellRegions.reduce((sum, region) => sum + region.trustScore, 0) / cellRegions.length) : 0,
    population: cellRegions.reduce((sum, region) => sum + region.population, 0),
  };
}

function projectHeatCells(cells: H3Cell[]) {
  return cells.map((cell) => ({
    ...cell,
    x: ((cell.centerLng - INDIA_BOUNDS.minLng) / (INDIA_BOUNDS.maxLng - INDIA_BOUNDS.minLng)) * 100,
    y: 100 - ((cell.centerLat - INDIA_BOUNDS.minLat) / (INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat)) * 100,
    width: cell.hasData ? 4.2 : 3.2,
    height: cell.hasData ? 4.6 : 3.5,
  }));
}

function insideIndia(latitude: number, longitude: number) {
  if (latitude < INDIA_BOUNDS.minLat || latitude > INDIA_BOUNDS.maxLat || longitude < INDIA_BOUNDS.minLng || longitude > INDIA_BOUNDS.maxLng) {
    return false;
  }
  return [INDIA_POLYGON, ...INDIA_ISLAND_POLYGONS].some((polygon) => pointInPolygon([longitude, latitude], polygon));
}

function heatColor(risk: number) {
  if (risk >= 78) return "#dc2626";
  if (risk >= 64) return "#f97316";
  if (risk >= 48) return "#f59e0b";
  if (risk >= 32) return "#84cc16";
  return "#10b981";
}

function markerColor(status: string): string {
  if (status === "Verified Care Desert") return "#ef4444";
  if (status === "Data-Poor Region") return "#f59e0b";
  if (status === "Monitored Access") return "#10b981";
  return "#2563eb";
}

const INDIA_POLYGON: Array<[number, number]> = [
  [68.1, 23.7],
  [69.3, 22.2],
  [70.2, 20.7],
  [72.0, 19.0],
  [72.8, 15.4],
  [74.0, 12.7],
  [75.5, 9.4],
  [77.3, 8.1],
  [79.6, 8.8],
  [80.3, 13.1],
  [80.1, 15.9],
  [82.2, 17.5],
  [84.8, 19.2],
  [86.9, 20.8],
  [88.4, 21.7],
  [89.8, 22.1],
  [92.1, 21.7],
  [94.5, 24.0],
  [97.2, 27.0],
  [95.5, 29.3],
  [92.4, 27.9],
  [89.1, 26.4],
  [88.0, 27.9],
  [84.1, 27.5],
  [80.3, 30.2],
  [78.0, 32.4],
  [75.2, 34.9],
  [73.4, 34.0],
  [74.2, 31.4],
  [72.2, 28.8],
  [70.1, 27.0],
  [68.1, 23.7],
];

const INDIA_ISLAND_POLYGONS: Array<Array<[number, number]>> = [
  [
    [71.4, 8.0],
    [74.2, 8.0],
    [74.2, 12.9],
    [71.4, 12.9],
    [71.4, 8.0],
  ],
  [
    [92.0, 6.4],
    [94.4, 6.4],
    [94.4, 14.3],
    [92.0, 14.3],
    [92.0, 6.4],
  ],
];

let cachedIndiaCoverageCells: string[] | undefined;

function indiaCoverageCells() {
  cachedIndiaCoverageCells ??= [INDIA_POLYGON, ...INDIA_ISLAND_POLYGONS].flatMap((polygon) => polygonToCells([polygon], H3_DISPLAY_RESOLUTION, true));
  return cachedIndiaCoverageCells;
}

function pointInPolygon(point: [number, number], polygon: Array<[number, number]>) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
