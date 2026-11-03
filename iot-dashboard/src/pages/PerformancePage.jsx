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
import { Card, CardContent } from "@/components/ui/card";
import { PerformanceAPI } from "@/apis/apis";

function PerformancePage() {
  const { mac: macParam } = useParams();
  // const [readings, setReadings] = useState([]);
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
  // const [logsByMac, setLogsByMac] = useState({});
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

  // FETCH PERFORMANCE DATA
  async function getPerformance() {
    const result = await fetch(`${NMS_URL.VITE_API_NMS_URL}/${PerformanceAPI}`);

    const jsonData = await result.json();

    const data = jsonData.data.cabinetData;
    console.log("Performance Data:", data);
    setCabinets(data);
  }

  useEffect(() => {
    getPerformance();
  }, []);

  return (
    <>
      <div className="dashboard">
        {/* CABINET SERVICES */}
        <div>
          <h1>Cabinet Services</h1>

          {cabinets.map((device) => (
            <Card className="mb-4" key={device.cabinetId}>
              {/* <p>{device.deviceId}</p> */}
              <p>Cabinet ID: {device.cabinetId}</p>
              <p>Cabinet Name: {device.cabinetName}</p>

              {/* SERVICES */}
              <CardContent>
                <h1>Services:</h1>
                {device.services.map((service) => (
                  <div>
                    <p>{service.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

export default PerformancePage;
