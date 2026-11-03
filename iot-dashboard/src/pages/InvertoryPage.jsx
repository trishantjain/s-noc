import React, { useEffect, useState, useRef } from "react";
import "../App.css";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
// } from "recharts";
import swal from "sweetalert2";
import { useMemo } from "react";
import thresholds from "./thresholds";
import { useParams } from "react-router-dom";

// SHADCN UI COMPONENTS
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { InventoryAPI } from "@/apis/apis";

function InventoryPage() {
  const { mac: macParam } = useParams();
  const [readings, setReadings] = useState([]);
  const [_devices, setDevices] = useState([]);
  // const [deviceMeta, setDeviceMeta] = useState([]);
  // const [selectedMac, setSelectedMac] = useState("");
  // const [status, setStatus] = useState("");
  // const [activeTab, setActiveTab] = useState("gauges");
  // const [activeFanBtns, setActiveFanBtns] = useState([]);
  // const [zoom, setZoom] = useState(1);
  // const [rotation, setRotation] = useState(0);
  // const [snapshots, setSnapshots] = useState([]);

  const [cabinets, setCabinets] = useState([]);
  // const deviceData = cabinets.devices || [];

  // SNAPSHOTS
  // const [selectedImage, setSelectedImage] = useState(null);
  // const [selectedDevice, setSelectedDevice] = useState("");

  // LOGS
  const [logsByMac, setLogsByMac] = useState({});
  // const currentLogs = logsByMac[selectedMac] || [];
  // const _viewportRef = useRef(null);
  // const lastScrollTopRef = useRef(0);
  // const bottomRef = useRef(null);
  // const [autoScroll, setAutoScroll] = useState(true);

  // MAP and MARKER refs
  // const mapRef = useRef(null);
  // const markerRefs = useRef({});

  // ALARMS
  // const [alarmToggle, setAlarmToggle] = useState(false);

  var NMS_URL = import.meta.env;

  // FETCH INVENTORY DATA
  async function getInventory() {
    const result = await fetch(`${NMS_URL.VITE_API_NMS_URL}/${InventoryAPI}`);

    const jsonData = await result.json();

    const data = jsonData.data.cabinetData;
    console.log("Inventory Data:", data);
    setCabinets(data);
  }

  useEffect(() => {
    getInventory();
  }, []);

  return (
    <>
      <div className="dashboard">
        {/* CABINET DATA */}
        <div>
          <h1>Device Data</h1>

          {cabinets.map((device) => (
            <Card className="mb-4" key={device.deviceId}>
              {/* <p>{device.deviceId}</p> */}
              <p>Device ID: {device.deviceId}</p>
              <p>Device Name: {device.deviceName}</p>
              <p>State: {device.state}</p>
              <p>Device Ip: {device.deviceIp}</p>
              <p>Latitude: {device.latitude}</p>
              <p>Longitude: {device.longitude}</p>
              <p>Device Status: {device.deviceStatus}</p>
              <p>Status Changed At: {device.lastStatusChangeTimeTicks}</p>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

export default InventoryPage;
