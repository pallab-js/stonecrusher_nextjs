import { feature } from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";
import topoJson from "world-atlas/countries-110m.json";

interface Feature {
  id?: string | number;
  properties?: { name?: string };
}

let cachedOutline: { w: number; h: number; path: string } | null = null;

function indiaFeature(): Feature | null {
  const topo = topoJson as unknown as { objects: { countries: unknown } };
  const fc = feature(topo as never, topo.objects.countries as never) as unknown as {
    features: Feature[];
  };
  return fc.features.find((f) => String(f.id) === "356" || f.properties?.name === "India") ?? null;
}

function projectionFor(width: number, height: number) {
  const india = indiaFeature();
  if (!india) return null;
  return geoMercator().fitSize([width, height], india as never);
}

/** Pre-projected India outline (offline, from bundled world-atlas TopoJSON). */
export function indiaOutline(width = 560, height = 620): { w: number; h: number; path: string } {
  if (cachedOutline && cachedOutline.w === width && cachedOutline.h === height) {
    return cachedOutline;
  }
  const india = indiaFeature();
  if (!india) return { w: width, h: height, path: "" };

  const projection = geoMercator().fitSize([width, height], india as never);
  const path = geoPath(projection);
  const d = path(india as never) ?? "";

  cachedOutline = { w: width, h: height, path: d };
  return cachedOutline;
}

export interface GeoPoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
  value: number;
  qty: number;
  detail: string;
}

export function projectPoints(
  points: GeoPoint[],
  width = 560,
  height = 620
): (GeoPoint & { x: number; y: number })[] {
  const projection = projectionFor(width, height);
  if (!projection) return [];
  const out: (GeoPoint & { x: number; y: number })[] = [];
  for (const p of points) {
    const xy = projection([p.lng, p.lat]);
    if (!xy) continue;
    out.push({ ...p, x: xy[0], y: xy[1] });
  }
  return out;
}
