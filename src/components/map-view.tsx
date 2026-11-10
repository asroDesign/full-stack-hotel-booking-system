"use client";

import { useEffect, useRef } from "react";
import type { Map as LMap } from "leaflet";
import { escapeHtml } from "@/lib/sanitize";

export type MapMarker = {
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  kind?: "hotel" | "poi";
};

export function MapView({
  center,
  markers,
  zoom = 12,
  className = "h-96",
  fitBounds = false,
}: {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  zoom?: number;
  className?: string;
  fitBounds?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const key = JSON.stringify({ center, markers, zoom, fitBounds });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true, dragging: !L.Browser.mobile, tapHold: false }).setView(
        [center.lat, center.lng],
        zoom,
      );
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const pts: [number, number][] = [];
      markers.forEach((m) => {
        const isHotel = m.kind === "hotel";
        const html = isHotel
          ? `<div style="position:relative;width:46px;height:46px"><span style="position:absolute;inset:0;border-radius:9999px;background:rgba(233,187,87,.35);animation:ping 1.6s cubic-bezier(0,0,.2,1) infinite"></span><div style="position:relative;display:grid;place-items:center;width:46px;height:46px;border-radius:16px;background:linear-gradient(135deg,#f3d38a,#d9a03a);color:#062826;font-weight:900;font-size:20px;box-shadow:0 10px 25px rgba(0,0,0,.25);border:3px solid #fff">آ</div></div>`
          : `<div style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:#17665e;color:#fff;border:3px solid #fff;box-shadow:0 6px 16px rgba(0,0,0,.25);font-size:15px">★</div>`;
        const icon = L.divIcon({
          className: "atalar-pin",
          html,
          iconSize: isHotel ? [46, 46] : [34, 34],
          iconAnchor: isHotel ? [23, 23] : [17, 17],
        });
        if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;
        L.marker([m.lat, m.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:Vazirmatn,Tahoma;direction:rtl;text-align:right"><b>${escapeHtml(m.title)}</b>${m.subtitle ? `<br/><span style="color:#64748b;font-size:12px">${escapeHtml(m.subtitle)}</span>` : ""}</div>`,
          );
        pts.push([m.lat, m.lng]);
      });
      if (fitBounds && pts.length > 1) map.fitBounds(pts, { padding: [40, 40] });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-slate-200 ${className}`}>
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>
      <div ref={ref} className="absolute inset-0" />
    </div>
  );
}
