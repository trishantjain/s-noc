import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ScrollArea } from "@/components/ui/scroll-area";

function isDeviceOnlineFromReading(reading, staleThresholdMs = 30_000) {
  if (!reading?.timestamp) return false;
  const age = Date.now() - new Date(reading.timestamp).getTime();
  return age >= 0 && age <= staleThresholdMs;
}

function formatFanStatus(value) {
  if (value === 1) return "RUNNING";
  if (value === 2) return "FAULT";
  return "OFF";
}

function yesNo(value) {
  return value ? "YES" : "NO";
}

function toFixedMaybe(value, digits = 2) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(digits);
}

function getDeviceLabel(device) {
  return device?.locationId || device?.mac || "Device";
}

function buildTerminalText({ device, reading }) {
  const lines = [];

  lines.push(`DEVICE: ${getDeviceLabel(device)}${device?.mac ? ` (${device.mac})` : ""}`);
  lines.push(`ADDRESS: ${device?.address || "—"}`);
  lines.push(`LAST SEEN: ${reading?.timestamp ? new Date(reading.timestamp).toLocaleString() : "—"}`);
  lines.push("");

  lines.push("READINGS");
  lines.push(`- insideTemperature: ${toFixedMaybe(reading?.insideTemperature)} °C`);
  lines.push(`- outsideTemperature: ${toFixedMaybe(reading?.outsideTemperature)} °C`);
  lines.push(`- humidity: ${toFixedMaybe(reading?.humidity)} %`);
  lines.push("");

  lines.push("POWER");
  lines.push(`- inputVoltage: ${toFixedMaybe(reading?.inputVoltage)} V`);
  lines.push(`- outputVoltage: ${toFixedMaybe(reading?.outputVoltage)} V`);
  // In your existing UI this value is used for DV current / battery; keep it visible as-is.
  lines.push(`- batteryBackup: ${toFixedMaybe(reading?.batteryBackup)} (raw)`);
  lines.push("");

  lines.push("FANS");
  for (let i = 1; i <= 6; i += 1) {
    const key = `fan${i}Status`;
    lines.push(`- Fan${i}: ${formatFanStatus(reading?.[key])} (${reading?.[key] ?? "—"})`);
  }
  lines.push("");

  lines.push("ALARMS");
  lines.push(`- fireAlarm: ${yesNo(Boolean(reading?.fireAlarm))}`);
  lines.push(`- waterLeakage: ${yesNo(Boolean(reading?.waterLeakage))}`);
  lines.push(`- waterLogging: ${yesNo(Boolean(reading?.waterLogging))}`);
  lines.push("");

  lines.push("STATUS");
  lines.push(`- lockStatus: ${reading?.lockStatus ?? "—"}`);
  lines.push(`- doorStatus: ${reading?.doorStatus ?? "—"}`);
  if (reading?.pwsFailCount !== undefined) {
    const count = Number(reading.pwsFailCount);
    if (!Number.isNaN(count)) {
      lines.push(`- pwsFailCount: ${count} (attempts left: ${Math.max(0, 3 - count)})`);
    } else {
      lines.push(`- pwsFailCount: ${String(reading.pwsFailCount)}`);
    }
  }
  lines.push("");

  lines.push("HUPS");
  lines.push(`- mainStatus: ${reading?.mainStatus ?? "—"}`);
  lines.push(`- rectStatus: ${reading?.rectStatus ?? "—"}`);
  lines.push(`- inveStatus: ${reading?.inveStatus ?? "—"}`);
  lines.push(`- overStatus: ${reading?.overStatus ?? "—"}`);
  lines.push(`- mptStatus: ${reading?.mptStatus ?? "—"}`);
  lines.push(`- mosfStatus: ${reading?.mosfStatus ?? "—"}`);

  return lines.join("\n");
}

export default function Dashboard() {
  const { mac: macParam } = useParams();
  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMac, setSelectedMac] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      try {
        const [metaRes, readingsRes] = await Promise.all([
          fetch("/api/devices-info"),
          fetch("/api/noc/readings"),
        ]);

        const metaJson = metaRes.ok ? await metaRes.json() : [];
        const readingsJson = readingsRes.ok ? await readingsRes.json() : [];

        if (cancelled) return;
        setDevices(Array.isArray(metaJson) ? metaJson : []);
        setReadings(Array.isArray(readingsJson) ? readingsJson : []);
        setLastRefresh(new Date());
      } catch {
        if (cancelled) return;
        setDevices([]);
        setReadings([]);
        setLastRefresh(new Date());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const latestReadingsByMac = useMemo(() => {
    const map = {};
    for (const r of readings) {
      if (!r?.mac) continue;
      const existing = map[r.mac];
      if (!existing || new Date(r.timestamp) > new Date(existing.timestamp)) {
        map[r.mac] = r;
      }
    }
    return map;
  }, [readings]);

  const connectedDevices = useMemo(() => {
    return devices
      .map((d) => {
        const mac = d?.mac;
        const reading = mac ? latestReadingsByMac[mac] : undefined;
        const connected = isDeviceOnlineFromReading(reading);
        return { ...d, _connected: connected, _lastSeen: reading?.timestamp || null };
      })
      .filter((d) => d._connected)
      .sort((a, b) => getDeviceLabel(a).localeCompare(getDeviceLabel(b)));
  }, [devices, latestReadingsByMac]);

  // Pick selected device from route param, otherwise first connected device
  useEffect(() => {
    if (!connectedDevices.length) {
      setSelectedMac("");
      return;
    }

    const decoded = macParam ? decodeURIComponent(macParam) : "";
    const exists = decoded && connectedDevices.some((d) => d.mac === decoded);
    if (exists) {
      setSelectedMac(decoded);
      return;
    }

    if (!selectedMac || !connectedDevices.some((d) => d.mac === selectedMac)) {
      setSelectedMac(connectedDevices[0].mac);
    }
  }, [connectedDevices, macParam, selectedMac]);

  const selectedDevice = useMemo(
    () => connectedDevices.find((d) => d.mac === selectedMac) || null,
    [connectedDevices, selectedMac]
  );

  const selectedReading = useMemo(
    () => (selectedMac ? latestReadingsByMac[selectedMac] : null),
    [latestReadingsByMac, selectedMac]
  );

  const terminalText = useMemo(() => {
    if (!selectedDevice || !selectedReading) return "";
    return buildTerminalText({ device: selectedDevice, reading: selectedReading });
  }, [selectedDevice, selectedReading]);

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      <div className="border-b bg-card px-4 py-3">
        <div className="text-sm font-semibold">Readings Monitor</div>
        <div className="text-xs text-muted-foreground">
          Connected devices: {connectedDevices.length} · Refresh: {loading ? "Loading..." : (lastRefresh ? lastRefresh.toLocaleTimeString() : "—")}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 p-3 min-h-0">
        {/* Compact device selector strip */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-3 py-2 text-xs font-semibold">CONNECTED DEVICES</div>
          <ScrollArea className="w-full">
            <div className="flex gap-2 p-2">
              {connectedDevices.length === 0 ? (
                <div className="text-xs text-muted-foreground">No connected devices.</div>
              ) : (
                connectedDevices.map((d) => (
                  <button
                    key={d.mac}
                    type="button"
                    onClick={() => setSelectedMac(d.mac)}
                    className={
                      "min-w-[180px] rounded-md px-2 py-2 text-left text-xs transition-colors " +
                      (d.mac === selectedMac
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60")
                    }
                  >
                    <div className="font-medium truncate">{getDeviceLabel(d)}</div>
                    <div className="text-[11px] text-muted-foreground break-all">{d.mac}</div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Full-page output */}
        <div className="rounded-lg border bg-card flex flex-col flex-1 min-h-0">
          <div className="border-b px-3 py-2 text-xs font-semibold">READING OUTPUT</div>
          <ScrollArea className="flex-1">
            <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-words">
              {selectedDevice && selectedReading
                ? terminalText
                : "Select a connected device to view readings."}
            </pre>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
