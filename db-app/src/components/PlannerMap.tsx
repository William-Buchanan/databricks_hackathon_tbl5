import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Route } from "lucide-react";
import { logPlannerEvent } from "../lib/auditLog";
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
const INDIA_BOUNDS = { minLat: 6.5, maxLat: 37.5, minLng: 68, maxLng: 98.5 };
type MapLayerMode = "points" | "h3";

interface FakeH3Cell {
  id: string;
  centerLat: number;
  centerLng: number;
  vertices: Array<{ latitude: number; longitude: number }>;
  regions: RegionAggregate[];
  topRegion: RegionAggregate;
  averageRisk: number;
  averageTrust: number;
  population: number;
}

export function PlannerMap({ regions, selected, onSelect, onHover, showRouting, onToggleRouting, onRouteSummary }: PlannerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMap = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const heatPolygons = useRef<any[]>([]);
  const originMarker = useRef<any>(null);
  const destinationMarker = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const originRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);
  const selectedRef = useRef<RegionAggregate | undefined>(selected);
  const showRoutingRef = useRef(showRouting);
  const lastCenteredRegionId = useRef<string | undefined>(undefined);
  const [mapError, setMapError] = useState<string | null>(apiKey ? null : "Google Maps key missing. Showing mock spatial geometry.");
  const [layerMode, setLayerMode] = useState<MapLayerMode>("points");
  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(5);

  const center = selected ?? regions[0];
  const heatCells = useMemo(() => fakeH3Cells(regions), [regions]);

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
        setMapReady(true);
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
      if (showRoutingRef.current) {
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
      const scaledVertices = scaleVertices(cell, polygonScaleForZoom(mapZoom));
      const polygon = new window.google.maps.Polygon({
        paths: scaledVertices.map((point) => ({ lat: point.latitude, lng: point.longitude })),
        strokeColor: heatColor(cell.averageRisk),
        strokeOpacity: 0.86,
        strokeWeight: selected?.id && cell.regions.some((region) => region.id === selected.id) ? 3 : 1,
        fillColor: heatColor(cell.averageRisk),
        fillOpacity: 0.34 + Math.min(0.28, cell.averageRisk / 360),
        map: googleMap.current,
      });
      polygon.addListener("click", () => onSelect(cell.topRegion));
      polygon.addListener("mouseover", () => onHover(cell.topRegion));
      heatPolygons.current.push(polygon);
    });
  }, [heatCells, layerMode, mapReady, mapZoom, onHover, onSelect, selected?.id]);

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
              Current map
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
            onHover={onHover}
            onRouteSummary={onRouteSummary}
          />
        )}
        {layerMode === "h3" && <HeatmapLegend cells={heatCells} />}
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
}

function FallbackMap({ points, cells, selected, showRouting, layerMode, onSelect, onHover, onRouteSummary }: { points: Array<{ region: RegionAggregate; x: number; y: number }>; cells: Array<FakeH3Cell & { x: number; y: number; width: number; height: number }>; selected?: RegionAggregate; showRouting: boolean; layerMode: MapLayerMode; onSelect: (region: RegionAggregate) => void; onHover: (region: RegionAggregate) => void; onRouteSummary: (summary: RouteSummary | undefined) => void }) {
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
            className={`fake-h3-cell ${selected && cell.regions.some((region) => region.id === selected.id) ? "selected" : ""}`}
            style={{
              left: `${cell.x}%`,
              top: `${cell.y}%`,
              width: `${cell.width}%`,
              height: `${cell.height}%`,
              backgroundColor: heatColor(cell.averageRisk),
              opacity: 0.34 + Math.min(0.32, cell.averageRisk / 320),
            }}
            title={`${cell.id}: risk ${cell.averageRisk}, trust ${cell.averageTrust}, ${cell.regions.length} zones`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(cell.topRegion);
            }}
            onMouseEnter={() => onHover(cell.topRegion)}
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

function HeatmapLegend({ cells }: { cells: FakeH3Cell[] }) {
  const highRiskCells = cells.filter((cell) => cell.averageRisk >= 70).length;
  return (
    <div className="heatmap-legend">
      <strong>H3 risk heatmap</strong>
      <span>{cells.length} India cells · {highRiskCells} high-risk</span>
      <div>
        <i className="low" />
        <i className="mid" />
        <i className="high" />
      </div>
      <small>Aggregated by table H3 index, risk, trust, and population.</small>
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

function fakeH3Cells(regions: RegionAggregate[]): FakeH3Cell[] {
  const latStep = 2.65;
  const lngStep = 3.05;
  const groups = new Map<string, RegionAggregate[]>();

  regions
    .filter((region) => insideIndia(region.latitude, region.longitude))
    .forEach((region) => {
      const id = region.facilities.find((facility) => facility.h3Index7)?.h3Index7 ?? fakeH3Id(region.latitude, region.longitude, latStep, lngStep);
      const current = groups.get(id) ?? [];
      current.push(region);
      groups.set(id, current);
    });

  return Array.from(groups.entries())
    .map(([id, cellRegions]) => {
      const centerLat = avg(cellRegions.map((region) => region.latitude));
      const centerLng = avg(cellRegions.map((region) => region.longitude));
      const topRegion = [...cellRegions].sort((a, b) => b.riskScore - a.riskScore || a.trustScore - b.trustScore)[0];
      return {
        id,
        centerLat,
        centerLng,
        vertices: hexVertices(centerLat, centerLng, latStep * 0.28, lngStep * 0.28),
        regions: cellRegions,
        topRegion,
        averageRisk: Math.round(cellRegions.reduce((sum, region) => sum + region.riskScore, 0) / cellRegions.length),
        averageTrust: Math.round(cellRegions.reduce((sum, region) => sum + region.trustScore, 0) / cellRegions.length),
        population: cellRegions.reduce((sum, region) => sum + region.population, 0),
      };
    })
    .sort((a, b) => b.averageRisk - a.averageRisk);
}

function fakeH3Id(latitude: number, longitude: number, latStep: number, lngStep: number) {
  const row = Math.floor((latitude - INDIA_BOUNDS.minLat) / latStep);
  const offset = row % 2 ? lngStep / 2 : 0;
  const col = Math.floor((longitude - INDIA_BOUNDS.minLng - offset) / lngStep);
  return `fake-h3-ind-r${String(row).padStart(2, "0")}-c${String(col).padStart(2, "0")}`;
}

function projectHeatCells(cells: FakeH3Cell[]) {
  return cells.map((cell) => ({
    ...cell,
    x: ((cell.centerLng - INDIA_BOUNDS.minLng) / (INDIA_BOUNDS.maxLng - INDIA_BOUNDS.minLng)) * 100,
    y: 100 - ((cell.centerLat - INDIA_BOUNDS.minLat) / (INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat)) * 100,
    width: 5.6,
    height: 6.1,
  }));
}

function scaleVertices(cell: FakeH3Cell, scale: number) {
  return cell.vertices.map((vertex) => ({
    latitude: cell.centerLat + (vertex.latitude - cell.centerLat) * scale,
    longitude: cell.centerLng + (vertex.longitude - cell.centerLng) * scale,
  }));
}

function polygonScaleForZoom(zoom: number) {
  if (zoom >= 10) return 0.32;
  if (zoom >= 8) return 0.42;
  if (zoom >= 6) return 0.58;
  return 0.72;
}

function hexVertices(centerLat: number, centerLng: number, latRadius: number, lngRadius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index + 30);
    return {
      latitude: centerLat + Math.sin(angle) * latRadius,
      longitude: centerLng + Math.cos(angle) * lngRadius,
    };
  });
}

function insideIndia(latitude: number, longitude: number) {
  return latitude >= INDIA_BOUNDS.minLat && latitude <= INDIA_BOUNDS.maxLat && longitude >= INDIA_BOUNDS.minLng && longitude <= INDIA_BOUNDS.maxLng;
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

function avg(values: number[]): number {
  return Number((values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)).toFixed(5));
}
