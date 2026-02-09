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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area";

const defaultLocation = [28.6139, 77.209];

function DashboardView() {
  const { mac: macParam } = useParams();
  const [readings, setReadings] = useState([]);
  const [_devices, setDevices] = useState([]);
  const [deviceMeta, setDeviceMeta] = useState([]);
  const [selectedMac, setSelectedMac] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState("gauges");
  const [activeFanBtns, setActiveFanBtns] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [snapshots, setSnapshots] = useState([]);

  // SNAPSHOTS
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState("");

  // LOGS
  const [logsByMac, setLogsByMac] = useState({});
  const currentLogs = logsByMac[selectedMac] || [];
  const _viewportRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const bottomRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);


  // MAP and MARKER refs
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  // ALARMS
  const [alarmToggle, setAlarmToggle] = useState(false);
  // const isFetchingRef = useRef(false); // TIMING TESTING

  // const latestReadingsByMac = {};
  // readings.forEach((r) => {
  //   const existing = latestReadingsByMac[r.mac];
  //   if (!existing || new Date(r.timestamp) > new Date(existing.timestamp)) {
  //     latestReadingsByMac[r.mac] = r;
  //   }
  // });

  // In this code 'latestReadingsByMac' this only computed only when readings change
  const latestReadingsByMac = useMemo(() => {
    const map = {};
    for (const r of readings) {
      const existing = map[r.mac];
      if (!existing || new Date(r.timestamp) > new Date(existing.timestamp)) {
        map[r.mac] = r;
      }
    }
    return map;
  }, [readings]);

  const _frontendAlarmsByMac = useMemo(() => {
    const map = {};
    for (const mac in latestReadingsByMac) {
      map[mac] = alarmComputation(
        latestReadingsByMac[mac],
        thresholds
      );
    }
    return map;
  }, [latestReadingsByMac]);


  const _selectedDeviceMeta = deviceMeta.find((d) => d.mac === selectedMac);
  const latestReading = readings.find((r) => r.mac === selectedMac);

  // Auto-select device when arriving via /device/:mac
  useEffect(() => {
    if (!macParam) return;
    const decoded = decodeURIComponent(macParam);
    if (decoded && decoded !== selectedMac) {
      setSelectedMac(decoded);
      const meta = deviceMeta.find((d) => d.mac === decoded);
      if (meta?.locationId) setSelectedDevice(meta.locationId);
    }
  }, [macParam, deviceMeta, selectedMac]);

  // console.log(import.meta.env.VITE_API_URL)
  // console.log("latestR", latestReading.mainStatus)
  // console.log('All properties:', Object.keys(latestReading));

  // // WebSocket connection - FIXED VERSION
  // useEffect(() => {
  //   const connectWebSocket = () => {
  //     console.log('🔄 Attempting WebSocket connection...');

  //     // Use wss:// if in production, ws:// for development
  //     const wsUrl = process.env.NODE_ENV === 'production'
  //       ? `wss://${window.location.host}`
  //       : 'ws://localhost:8080';

  //     const ws = new WebSocket(wsUrl);
  //     wsRef.current = ws;

  //     ws.onopen = () => {
  //       console.log('✅ WebSocket connected successfully');
  //     };

  //     ws.onmessage = (event) => {
  //       try {
  //         const message = JSON.parse(event.data);
  //         console.log('📨 WebSocket message:', message.type);

  //         if (message.type === 'NEW_READING') {
  //           const newReading = message.data;
  //           setReadings(prev => {
  //             const filtered = prev.filter(r => r.mac !== newReading.mac);
  //             return [...filtered, newReading].slice(-400);
  //           });
  //         }
  //       } catch (err) {
  //         console.error('❌ WebSocket message parse error:', err);
  //       }
  //     };

  //     ws.onerror = (error) => {
  //       console.error('❌ WebSocket connection error:', error);
  //     };

  //     ws.onclose = (event) => {
  //       console.log(`🔌 WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);

  //       // Auto-reconnect after 3 seconds
  //       setTimeout(() => {
  //         console.log('🔄 Attempting to reconnect WebSocket...');
  //         connectWebSocket();
  //       }, 3000);
  //     };
  //   };

  //   // Initial connection
  //   connectWebSocket();

  //   // Cleanup
  //   return () => {
  //     if (wsRef.current) {
  //       console.log('🛑 Closing WebSocket connection');
  //       wsRef.current.close(1000, 'Component unmounting');
  //     }
  //   };
  // }, []);

  // UseEffect for fetching Data
  useEffect(() => {
    // console.log('🚨Starting data fetch interval (5s)🚨');
    const interval = setInterval(fetchData, 5000);

    fetchData();

    // console.log('🚨Fetching Data🚨')
    // return () => clearInterval(interval);
    return () => {
      // console.log('🛑Clearing data fetch interval');
      clearInterval(interval);
    };

  }, []);

  // 🔄 Auto-focus map on selected device
  useEffect(() => {
    if (mapRef.current && selectedMac) {
      const selectedDevice = deviceMeta.find((d) => d.mac === selectedMac);
      const lat = parseFloat(selectedDevice?.latitude);
      const lon = parseFloat(selectedDevice?.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        mapRef.current.flyTo([lat, lon], 15, { duration: 1.5 });
        // console.log(`🔍 Flying to ${selectedMac} at [${lat}, ${lon}]`);
      }
    }
  }, [selectedMac, deviceMeta]);

  // Map Zooming
  useEffect(() => {
    const iframe = document.querySelector(".camera-iframe");
    if (iframe) {
      iframe.style.transform = `scale(${zoom}) rotate(${rotation}deg)`;
    }
  }, [zoom, rotation]);

  // Function to Fetch data from backend
  const fetchData = async () => {
    // if (isFetchingRef.current) return;   // ⛔ prevent overlap
    // isFetchingRef.current = true;

    try {
      const [readingsRes, devicesRes, deviceMetaRes] = await Promise.all([
        fetch(`/api/readings`),
        fetch(`/api/all-devices`),
        fetch(`/api/devices-info`),
      ]);

      // Fallback to [] if any response fails
      let readingsData = [],
        devicesData = [],
        metadata = [];

      if (readingsRes.ok) readingsData = await readingsRes.json();
      if (devicesRes.ok) devicesData = await devicesRes.json();
      if (deviceMetaRes.ok) metadata = await deviceMetaRes.json();

      setReadings(Array.isArray(readingsData) ? readingsData : []);
      setDevices(Array.isArray(devicesData) ? devicesData : []);
      setDeviceMeta(Array.isArray(metadata) ? metadata : []);
      // console.log("readingData", readingsData);
    } catch (err) {
      console.error("❌Error fetching data:", err);
    } finally {
      // isFetchingRef.current = false
    }
  };

  const handleMapCreated = (mapInstance) => {
    if (!mapRef.current) {
      mapRef.current = mapInstance;
      // console.log("Map ref set:", mapRef.current); // <--- You should see this log ONCE
    }
  };

  // added by vats
  // A synchronous function to format the date and time.
  function getFormattedDateTime() {
    const today = new Date();
    const addLeadingZero = (num) => String(num).padStart(2, "0");

    const dd = addLeadingZero(today.getDate());
    const mm = addLeadingZero(today.getMonth() + 1);
    const yy = String(today.getFullYear()).slice(-2);
    const HH = addLeadingZero(today.getHours());
    const MM = addLeadingZero(today.getMinutes());
    const SS = addLeadingZero(today.getSeconds());

    return `${dd}/${mm}/${yy} ${HH}:${MM}:${SS}`;
  }

  // Function to log-commands in system
  const sendToLog = async (status, message, command = "") => {
    const logData = {
      date: new Date().toLocaleString(),
      mac: selectedMac,
      command: command,
      status: status,
      message: message,
    };

    try {
      await fetch(`/api/log-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData),
      });
    } catch (err) {
      console.error("Failed to log ", err);
    }
  };

  // Sending commands to backend
  const sendCommand = async (cmdToSend) => {
    if (!selectedMac || !cmdToSend) {
      setStatus("Please select a device and enter a command.");
      return;
    }
    try {
      const res = await fetch(`/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac: selectedMac, command: cmdToSend }),
      });
      const data = await res.json();
      setStatus(data.message);
    } catch (error) {
      console.error("Command error:", error);
      setStatus("Error sending command");
    }
  };

  // Function to handle Fan Button Clicks
  const handleFanClick = (level) => {
    const isActive = activeFanBtns.includes(level);
    const command = isActive
      ? `%R0${level}F${getFormattedDateTime()}$`
      : `%R0${level}N${getFormattedDateTime()}$`;

    if (level !== 5) {
      sendToLog(
        `Fan Group ${level} clicked ${isActive ? "off" : "on "}`,
        "",
        command
      );
    } else {
      sendToLog(
        `LOAD Clicked ${isActive ? "off" : "on "}`,
        "",
        command
      );

    }
    sendCommand(command);

    // Update UI immediately (optional, for instant feedback)
    setActiveFanBtns((prev) =>
      isActive ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  // New code for Open Lock (using Sweetalert2)
  const handleOpenLock = async () => {
    const { value: password } = await swal.fire({
      title: "Enter Admin password",
      input: "password",
      inputLabel: "Password",
      inputPlaceholder: "Enter admin password",
      showCancelButton: true,
      confirmButtonText: "Open Lock",
      cancelButtonText: "Cancel",
      background: "#292929",
      color: "#fff",
      confirmButtonColor: "#2f2f2fff",
      width: "20em",
    });

    if (password) {
      if (password === "admin123") {
        sendCommand(`%L00O${getFormattedDateTime()}$`);
        sendToLog("Password Open Button Clicked");
        setStatus("Lock opened successfully!");
      } else {
        setStatus("Wrong password!");
      }
    }
  };

  const handleResetLock = () => {
    const pwd = window.prompt("Enter admin password to reset lock:");
    if (pwd === "admin123") {
      const newLock = window.prompt("Enter new lock value:");

      if (/^\d{9}$/.test(newLock)) {
        if (newLock && newLock.trim() !== "") {
          sendToLog(`Lock Reset ${newLock} clicked`);
          sendCommand(`%L00R${newLock}${getFormattedDateTime()}$$`);
          setStatus(`New password ${newLock} `)
        } else {
          setStatus("New lock value cannot be empty!");
        }
      } else {
        alert("Enter Numeric Password of 9 Digits")
      }
    } else {
      setStatus("Wrong password for resetting lock!");
    }
  };

  function FlyToLocation({ center }) {
    const map = useMap();

    useEffect(() => {
      if (center) {
        map.flyTo(center, map.getZoom(), { duration: 1.2 });
      }
    }, [center, map]);

    return null;
  }

  // Function to handle Open Lock with prompt
  const openPassword = () => {
    const pwd = window.prompt("Enter admin password to Open Lock:");
    // const today = new Date();
    if (pwd === "admin123") sendCommand(`%L00P${getFormattedDateTime()}$`);
    else setStatus("Wrong password for opening lock!");
  };

  // Centralized alarm computation function
  function alarmComputation(reading, thresholds) {
    if (!reading) return { active: false, alarms: [] };

    const alarms = [];

    if (reading.fireAlarm) alarms.push("Fire Alarm");
    if (reading.waterLeakage) alarms.push("Water Leakage");
    if (reading.waterLogging) alarms.push("Water Logging");
    if (reading.lockStatus === "OPEN") alarms.push("Lock Open");
    if (reading.doorStatus === "OPEN") alarms.push("Door Open");

    // threshold-based (same logic as backend)
    if (reading.insideTemperature > thresholds.insideTemperature.max) {
      // setLogs([...logs, "High Inside Temperature"]);
      alarms.push("High Inside Temperature");
    }

    if (reading.inputVoltage < thresholds.inputVoltage.min) {
      // setLogs([...logs, "Low Input Voltage"]);
      alarms.push("Low Input Voltage");
    }

    return {
      active: alarms.length > 0,
      alarms,
    };
  }

  // UseEffect for storing Logs based on selectedMac 
  useEffect(() => {
    // If no device is selected
    if (!selectedMac) return;

    // Getting reading of selected mac
    const reading = latestReadingsByMac[selectedMac];
    if (!reading) return;

    // Getting alarms for the selectedMac
    const alarmResult = alarmComputation(reading, thresholds);

    if (alarmResult.alarms.length === 0) return;

    // Updating logs for selectedMac seperately
    setLogsByMac(prev => {
      const prevLogs = prev[selectedMac] || [];

      return {
        ...prev,
        [selectedMac]: [
          ...prevLogs,
          ...alarmResult.alarms.map(
            alarm => `[${new Date().toLocaleTimeString()}] [${selectedMac}] ${alarm}`
          )
        ]
      };
    });


  }, [latestReadingsByMac, selectedMac]);

  // UseEffect for resetting logs every 1 hour
  useEffect(() => {
    const resetLogTime = 60 * 60 * 1000; // 1 hour

    // Reseting Logs after every 1 hour
    const logTimer = setInterval(() => {
      setLogsByMac({});
    }, resetLogTime);

    // Stops timer after resetting log =
    return () => clearInterval(logTimer);
  }, []);

  useEffect(() => {
    if (!autoScroll) return;

    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [currentLogs, autoScroll]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const currentScrollTop = el.scrollTop;

    // user scrolled UP → lock auto-scroll OFF
    if (currentScrollTop < lastScrollTopRef.current) {
      setAutoScroll(false);
    }

    // user scrolled to bottom → re-enable
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceFromBottom <= 2) {
      setAutoScroll(true);
    }
    lastScrollTopRef.current = currentScrollTop;

  }

  const _toggleFullscreen = () => {
    const iframe = document.querySelector(".camera-iframe");
    if (iframe.requestFullscreen) iframe.requestFullscreen();
    else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
    else if (iframe.msRequestFullscreen) iframe.msRequestFullscreen();
  };

  const _zoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const _zoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 1));
  const _rotateFeed = () => setRotation((prev) => (prev + 90) % 360);

  const isAlarmActive = (reading) =>
    reading.fireAlarm || reading.waterLeakage || reading.waterLogging || reading.lockStatus === "OPEN" || reading.doorStatus === "OPEN" || [1, 2, 3].includes(reading.password);


  // const CHART_DELAY_MS = 2 * 60 * 1000; // 2 minutes
  // const chartCutoffTime = Date.now() - CHART_DELAY_MS;
  const _historicalData = readings

    .filter((r) => r.mac === selectedMac && r.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // oldest to latest
    .slice(-15)
    .map((r) => {
      const d = new Date(r.timestamp);

      return {
        time:
          `${d.getHours().toString().padStart(2, "0")}:` +
          `${d.getMinutes().toString().padStart(2, "0")}:` +
          `${d.getSeconds().toString().padStart(2, "0")}.` +
          `${d.getMilliseconds().toString().padStart(3, "0")}`, // tenths of a second,
        insideTemperature: Number(r.insideTemperature.toFixed(2)),
        outsideTemperature: Number(r.outsideTemperature.toFixed(2)),
        humidity: Number(r.humidity.toFixed(2)),
        inputVoltage: Number(r.inputVoltage.toFixed(2)),
        outputVoltage: Number(r.outputVoltage.toFixed(2)),
        batteryBackup: Number(r.batteryBackup.toFixed(2)),
      }
    });

  // UPDATED FOR TIMING ISSUE TESTING
  // const historicalData = useMemo(() => {
  //   return readings
  //     .filter(r =>
  //       r.mac === selectedMac &&
  //       r.timestamp &&
  //       new Date(r.timestamp).getTime() <= chartCutoffTime
  //     )
  //     .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  //     .slice(-15);
  // }, [readings, selectedMac, chartCutoffTime]);


  const fetchSnapshots = async (selectedMac) => {
    try {
      // setActiveTab("snapshots");
      if (selectedMac) {
        let response = await fetch(
          `/api/snapshots/?mac=${selectedMac}`
        );
        const snapshotFiles = await response.json();
        setSnapshots(snapshotFiles);
      } else {
        setSnapshots([]);
      }
    } catch (err) {
      console.error("Error fetching snapshots:", err);
    }
  };


  // Fetch snapshots on component mount
  useEffect(() => {
    fetchSnapshots(selectedMac);

    const snapshotInterval = setInterval(() => {
      fetchSnapshots(selectedMac);
    }, 240000); // ✅ Set up timer

    return () => clearInterval(snapshotInterval); // ✅ Cleanup
  }, [selectedMac]);

  const alarmKeys = [
    {
      key: "fireAlarm",
      Name: "Fire Alarm",
    },
    {
      key: "waterLogging",
      Name: "Logging",
    },
    {
      key: "waterLeakage",
      Name: "Leakage",
    },
  ];

  const statusKeys = [
    {
      key: "lockStatus",
      Name: "Lock",
    },
    {
      key: "doorStatus",
      Name: "Door",
    },
    {
      key: "pwsFailCount",
      Name: "Password",
    },
  ];

  const hupsKeys = [
    {
      key: "mainStatus",
      Name: "Main",
    },
    {
      key: "rectStatus",
      Name: "Rectfier",
    },
    {
      key: "inveStatus",
      Name: "Inverter",
    },
    {
      key: "overStatus",
      Name: "O.Load",
    },
    {
      key: "mptStatus",
      Name: "MPT",
    },
    {
      key: "mosfStatus",
      Name: "MOSFET",
    },
  ]

  // const tempCalibrationTable = [
  //   { min: 0, max: 10, factor: 0 },
  //   { min: 11, max: 20, factor: 0 },
  //   { min: 21, max: 30, factor: 0 },
  //   { min: 31, max: 40, factor: 0.05 },
  //   { min: 41, max: 50, factor: 0.07 },
  //   { min: 51, max: 60, factor: 0.09 },
  //   { min: 61, max: 70, factor: 0.10 },
  // ];

  // function calibrateTemperature(temp) {
  //   if (typeof temp !== "number") return temp;

  //   const range = tempCalibrationTable.find(
  //     r => temp >= r.min && temp <= r.max
  //   );

  //   if (!range) return temp;

  //   return temp * (1 + range.factor);
  // }

  return (
    <>
      {/* Logo */}
      <div className="logo-panel">

        <div
          style={{
            display: "flex"
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 300,
              display: "flex",
              alignItems: "center",
              gap: 10,
              zIndex: 99
            }}
          >
            <img
              src="/bharatnet_logo.png"
              alt="BharatNet"
              style={{ height: "40px", width: "100px", left: "100px" }}
            />
            <img
              src="/BSNL_logo.png"
              alt="BSNL"
              style={{ height: "40px", width: "100px", left: "100px" }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              right: 60,
              display: "flex",
              alignItems: "center",
              gap: 10,
              zIndex: 99
            }}

          >
            <img
              src="/ITI.png"
              alt="ITI"
              style={{ height: "40px", width: "100px" }}
            />
            <img
              src="/technotrendz.png"
              alt="Technotrendz Logo"
              style={{ height: "40px", width: "100px" }}
            />
          </div>
        </div>
      </div>

      <div className="dashboard">
        <div className="panel">
          <h2 className="selected-heading">
            📟 Selected Rack: {selectedMac && <span> {selectedDevice}</span>}
            <div className="flex items-center gap-2">
              <Switch
                id="alarm-mode"
                checked={alarmToggle}
                onCheckedChange={setAlarmToggle}
              />
              <Label htmlFor="alarm-mode">Alarm</Label>
            </div>
          </h2>
          {latestReading && (
            <div>
              <div className="tabs">
                <button
                  className={activeTab === "gauges" ? "active" : ""}
                  onClick={() => setActiveTab("gauges")}
                >
                  Gauges
                </button>
                <button
                  className={activeTab === "status" ? "active" : ""}
                  onClick={() => setActiveTab("status")}
                >
                  Status
                </button>
                <button
                  className={activeTab === "snapshots" ? "active" : ""}
                  onClick={() => { setActiveTab("snapshots"); fetchSnapshots(selectedMac); }}
                >
                  Snapshots
                </button>
              </div>

              {/* GAUGES TAB */}
              {activeTab === "gauges" && (
                <div className="gauges grid-3x3">
                  <Gauge
                    label="Inside Temp"
                    value={(latestReading.insideTemperature).toFixed(2)}
                    max={100}
                    color="#e63946"
                    alarm={alarmToggle ? latestReading.insideTemperatureAlarm : false}
                  />
                  <Gauge
                    label="Outside Temp"
                    // value={calibrateTemperature(latestReading.outsideTemperature).toFixed(2)}
                    value={(latestReading.outsideTemperature).toFixed(2)}
                    max={100}
                    color="#fca311"
                    alarm={alarmToggle ? latestReading.outsideTemperatureAlarm : false}
                  />
                  <Gauge
                    label="Humidity"
                    value={latestReading.humidity}
                    max={100}
                    color="#1d3557"
                    alarm={alarmToggle ? latestReading.humidityAlarm : false}
                  />
                  <Gauge
                    label="Input Volt"
                    value={(latestReading.inputVoltage).toFixed(2)}
                    max={100}
                    color="#06d6a0"
                    alarm={alarmToggle ? latestReading.inputVoltageAlarm : false}
                  />
                  <Gauge
                    label="Output Volt"
                    value={(latestReading.outputVoltage).toFixed(2)}
                    max={100}
                    color="#118ab2"
                    alarm={alarmToggle ? latestReading.outputVoltageAlarm : false}
                  />
                  <Gauge
                    label="DV Current"
                    value={latestReading.batteryBackup}
                    max={45}
                    color="#ffc107"
                    alarm={alarmToggle ? latestReading.batteryBackupAlarm : false}
                  />
                  <Gauge
                    label="Battery %"
                    value={(latestReading.batteryBackup * 1.5).toFixed(2)}
                    max={120}
                    color="#ffc107"
                    alarm={alarmToggle ? latestReading.batteryBackupAlarm : false}
                  />
                  <Gauge
                    label="Battery(Hours)"
                    value={(latestReading.batteryBackup).toFixed(2)}
                    max={120}
                    color="#ffc107"
                    alarm={alarmToggle ? latestReading.batteryBackupAlarm : false}
                  />
                  {latestReading.batteryBackup <= 10 ?
                    <Gauge
                      label="LockBat(Left..)"
                      value={0}
                      max={12}
                      color="#ffc107"
                      alarm={alarmToggle ? latestReading.batteryBackupAlarm : false}
                    /> :
                    <Gauge
                      label="LockBat(Left..)"
                      value={Math.floor(((latestReading.batteryBackup - 9) * 4))}
                      // value={6}
                      max={12}
                      color="#ffc107"
                      hoverTitle={"LockBat Left Hours"}
                      alarm={alarmToggle ? latestReading.batteryBackupAlarm : false}
                    />
                  }
                </div>
              )}

              {/* STATUS TAB */}
              {activeTab === "status" && (
                <div className="fan-status">
                  <div className="fan-status-line">
                    <h4>Fan Running Status</h4>
                    {[...Array(6)].map((_, i) => {
                      const statusVal = latestReading[`fan${i + 1}Status`]; // 0=off, 1=healthy, 2=faulty
                      // console.log('statusVal', statusVal);

                      // console.log("statusC");
                      let statusClass = "off";
                      if (statusVal === 1) {
                        statusClass = "running"; // green
                      } else if (statusVal === 2) {
                        statusClass = "faulty"; // red
                      }
                      // console.log(statusClass);

                      return (
                        <div key={i} className="fan-light">
                          <div className={`fan-light-circle ${statusClass}`} />
                          <div className="fan-label">F{i + 1}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="alarm-line">
                    <h4>Alarms</h4>
                    {alarmKeys.map((alarm, i) => (
                      <div key={i} className="alarm-indicator">
                        <div
                          className={`alarm-led ${(
                            alarm.key === "fireAlarm" &&
                              latestReading.doorStatus === "CLOSED" &&
                              latestReading.insideTemperature >= 48 &&
                              latestReading.insideTemperature < 70
                              ? ""
                              : latestReading[alarm.key] === 87
                                ? "wait"
                                : latestReading[alarm.key]
                                  ? "active"
                                  : ""
                          )}`}
                        />
                        <div className="alarm-label">{alarm.Name}</div>
                      </div>
                    ))}
                    {statusKeys.map((status, i) => {
                      if (status.key !== "pwsFailCount") {
                        return (
                          <div key={i} className="alarm-indicator">
                            <div
                              className={`alarm-led ${latestReading[status.key] === "OPEN"
                                ? "active"
                                : ""
                                }`}
                            />
                            <div className="alarm-label">{status.Name}</div>
                          </div>
                        );
                      } else {
                        return (
                          <>
                            <div key={i} className="alarm-indicator">
                              {/* <div className={`alarm-led ${latestReading[status.key] === 1 ? 'active' : ''}`} /> */}
                              <div
                                className={`alarm-led 
                            ${latestReading[status.key] === 1
                                    ? "danger"
                                    : latestReading[status.key] === 2
                                      ? "warn"
                                      : latestReading[status.key] === 3
                                        ? "active"
                                        : ""
                                  }`}
                              />
                              <div className="alarm-label">{status.Name}</div>
                              <div className="alarm-attempt">{3 - latestReading[status.key]} Attempt Left</div>
                            </div>
                          </>
                        );
                      }
                    })}
                  </div>

                  <div className="alarm-line">
                    <h4>HUPS</h4>
                    {hupsKeys.map((hups, i) => (
                      <div key={i} className="alarm-indicator">
                        <div
                          className={`alarm-led ${latestReading[hups.key] ? "active" : ""
                            }`}
                        />
                        <div className="alarm-label">
                          {hups.Name}
                        </div>
                      </div>
                    ))}
                    {/* {["O.Load", "MPT", "MOSFET"].map((key, i) => (
                      <div key={i} className="alarm-indicator">
                        <div
                          className={`alarm-led ${latestReading[key] === "OPEN" ? "active" : ""
                            }`}
                        />
                        <div className="alarm-label">
                          {key.replace("Status", "")}
                        </div>
                      </div>
                    ))} */}
                  </div>

                  <h4>🛠 Commands</h4>
                  <div className="fan-power-buttons aligned">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div key={level} className="fan-light">
                        <button
                          className={`power-btn ${activeFanBtns.includes(level) ||
                            (latestReading &&
                              latestReading[`fanLevel${level}Running`] === true)
                            ? "active"
                            : ""
                            }`}
                          onClick={() => handleFanClick(level)}
                        />
                        <div className="fan-label">
                          {level >= 1 && level <= 4 ? `FG ${level}` : "NON-CRITICAL LOAD"}
                        </div>
                      </div>
                    ))}
                    <div className="fan-light">
                      <button className="lock-btn" onClick={handleOpenLock}>
                        🔓
                      </button>
                      <div className="fan-label">Lock</div>
                    </div>
                    <div className="fan-light">
                      <button className="lock-btn" onClick={handleResetLock}>
                        🔐
                      </button>
                      <div className="fan-label">Reset</div>
                    </div>
                    <div className="fan-light">
                      <button className="lock-btn" onClick={openPassword}>
                        🔐
                      </button>
                      <div className="fan-label">Open PWD</div>
                    </div>
                  </div>
                  <span>SysId: {selectedMac.slice(8)}</span>
                  {status && <p>{status}</p>}
                </div>
              )}


              {/* Full Screen Image Modal with Navigation */}
              {selectedImage && (
                <div
                  className="fullscreen-modal"
                  onClick={() => setSelectedImage(null)}
                >
                  <div className="modal-header">
                    <button
                      className="close-btn-fullscreen"
                      onClick={() => setSelectedImage(null)}
                    >
                      ✕
                    </button>
                    <div className="image-title">
                      {selectedImage.split("/").pop()} (
                      {snapshots.findIndex(
                        (img) =>
                          `/api/snapshots/${img}` ===
                          selectedImage
                      ) + 1}{" "}
                      of {snapshots.length})
                    </div>
                  </div>

                  {/* Navigation Arrows */}
                  {snapshots.length > 1 && (
                    <>
                      <button
                        className="nav-arrow left-arrow"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = snapshots.findIndex(
                            (img) =>
                              `/api/snapshots/${img}` ===
                              selectedImage
                          );
                          const prevIndex =
                            (currentIndex - 1 + snapshots.length) %
                            snapshots.length;
                          setSelectedImage(
                            `/api/snapshots/${snapshots[prevIndex]}`
                          );
                        }}
                      >
                        ‹
                      </button>
                      <button
                        className="nav-arrow right-arrow"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = snapshots.findIndex(
                            (img) =>
                              `/api/snapshots/${img}` ===
                              selectedImage
                          );
                          const nextIndex =
                            (currentIndex + 1) % snapshots.length;
                          setSelectedImage(
                            `/api/snapshots/${snapshots[nextIndex]}`
                          );
                        }}
                      >
                        ›
                      </button>
                    </>
                  )}

                  <div className="modal-body">
                    <img
                      src={selectedImage}
                      alt="Enlarged view"
                      className="fullscreen-image"
                    />
                  </div>
                </div>
              )}

              {/* Snapshots */}
              {activeTab === "snapshots" && (
                <div className="camera-tab">
                  <h4>🖼️ Snapshots</h4>
                  <div className="snapshots-grid">
                    {snapshots.length > 0 ? (
                      snapshots.map((filename, i) => (
                        <div
                          key={i}
                          className="snapshot-item"
                          onClick={() =>
                            setSelectedImage(
                              `/api/snapshots/${filename}?mac=${selectedMac}`
                            )
                          }
                        >
                          <img
                            key={i}
                            src={`/api/snapshots/${filename}?mac=${selectedMac}`}
                            alt={`snapshot-${i + 1}`}
                            onError={(e) => {
                              e.target.src =
                                "https://via.placeholder.com/120x90?text=Error";
                            }}
                          />
                          <div className="snapshot-label">{filename}</div>
                        </div>
                      ))
                    ) : (
                      <p>No snapshots available</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel 2: Chart */}
        <div className="panel">
          <h2>📈 LIVE LOGS</h2>
          {/* {selectedMac && historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 10, fill: "#ccc" }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="insideTemperature"
                  stroke="#ff4d4f"
                  dot={false}
                  isAnimationActive={true}
                  name="insideTemp"
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#1d3557"
                  dot={false}
                  isAnimationActive={true}
                />
                <Line
                  type="monotone"
                  dataKey="inputVoltage"
                  stroke="#00b894"
                  dot={false}
                  isAnimationActive={true}
                  name="I/P volt"
                />
                <Line
                  type="monotone"
                  dataKey="outputVoltage"
                  stroke="#0984e3"
                  dot={false}
                  isAnimationActive={true}
                  name="O/P volt"
                />
                <Line
                  type="monotone"
                  dataKey="batteryBackup"
                  stroke="#2205ffff"
                  dot={false}
                  isAnimationActive={true}
                  name="Battery"
                />
                <Line
                  type="monotone"
                  dataKey="outsideTemperature"
                  stroke="#0b6517ff"
                  dot={false}
                  isAnimationActive={true}
                  name="outsideTemp"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>Select a device to see its historical chart</p>
          )} */}


          {/* LOG SECTION */}
          <div className="log-scroll h-64 w-full rounded-md border bg-black overflow-y-auto"
              onScroll={handleScroll}
          >
            {/* <div
              className="p-3 "
            > */}
              <div className="log-panel">
                {Object.keys(logsByMac).length === 0 ? (
                  <p>No logs in last 1 hour</p>
                ) : (
                  currentLogs.map((line, i) => (
                    <pre key={i} className="log-line">{line}</pre>
                  ))
                )}
              </div>

              <div ref={bottomRef} />
            {/* </div> */}
          </div>

        </div>

        {/* Panel 3: Device Tiles */}
        <div className="panel device-list">
          <h2>🟢 Devices</h2>
          <div className="grid">
            {(() => {
              const latestReadingsByMac = {};
              readings.forEach((r) => {
                const existing = latestReadingsByMac[r.mac];
                if (
                  !existing ||
                  new Date(r.timestamp) > new Date(existing.timestamp)
                ) {
                  latestReadingsByMac[r.mac] = r;
                }
              });

              return deviceMeta.map((device) => {
                const mac = device.mac;
                const reading = latestReadingsByMac[mac];
                let colorClass = "disconnected"; // default

                if (reading && reading.timestamp) {
                  const age =
                    Date.now() - new Date(reading.timestamp).getTime();
                  const staleThreshold = 30000; // 30 seconds

                  if (age <= staleThreshold) {
                    // Use status from latest valid reading
                    const hasStatusAlarm = isAlarmActive(reading);
                    const hasGaugeAlarm =
                      reading.insideTemperatureAlarm ||
                      reading.outsideTemperatureAlarm ||
                      reading.humidityAlarm ||
                      reading.inputVoltageAlarm ||
                      reading.outputVoltageAlarm ||
                      reading.batteryBackupAlarm;

                    colorClass = hasStatusAlarm
                      ? "status-alarm"
                      : hasGaugeAlarm
                        ? "gauge-alarm"
                        : "connected";
                  } else {
                    // Reading is stale — treat as disconnected
                    colorClass = "disconnected";
                  }
                }

                return (
                  <div
                    key={mac}
                    className={`device-tile ${colorClass} ${selectedMac === mac ? "selected" : ""
                      }`}
                    onClick={() => { setSelectedMac(mac); setSelectedDevice(device.locationId) }}
                  >
                    {device.locationId || mac}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Panel 4: Map */}
        <div className="panel device-map">
          <h2>🗺️ Device Map</h2>

          {(() => {
            const selectedDevice = deviceMeta.find(
              (d) => d.mac === selectedMac
            );
            const lat = parseFloat(selectedDevice?.latitude);
            const lon = parseFloat(selectedDevice?.longitude);
            const selectedCenter =
              !isNaN(lat) && !isNaN(lon) ? [lat, lon] : defaultLocation;

            return (
              <MapContainer
                // key={selectedMac || "default-map"}
                key="device-map"
                center={selectedCenter}
                zoom={15}
                scrollWheelZoom={true}
                style={{ height: "315px", width: "100%" }}
                whenCreated={handleMapCreated}
              >
                <TileLayer
                  url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
                />

                <FlyToLocation center={selectedCenter} />

                {deviceMeta.map((device) => {
                  const mac = device.mac;
                  const reading = latestReadingsByMac[mac];

                  let dotClass = "disconnected"; // Default state

                  if (reading) {
                    const timeDiff =
                      Date.now() - new Date(reading.timestamp).getTime();
                    const isStale = timeDiff > 30000;

                    if (!isStale) {
                      const hasStatusAlarm = isAlarmActive(reading);
                      const hasGaugeAlarm =
                        reading.insideTemperatureAlarm ||
                        reading.outsideTemperatureAlarm ||
                        reading.humidityAlarm ||
                        reading.inputVoltageAlarm ||
                        reading.outputVoltageAlarm ||
                        reading.batteryBackupAlarm;

                      dotClass = hasStatusAlarm
                        ? "status-alarm"
                        : hasGaugeAlarm
                          ? "gauge-alarm"
                          : "connected";
                    }
                  }

                  const icon = L.divIcon({
                    className: "custom-marker",
                    html: `<div class="marker-dot ${dotClass}"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                  });

                  const lat = parseFloat(device.latitude);
                  const lon = parseFloat(device.longitude);
                  if (isNaN(lat) || isNaN(lon)) return null;

                  return (
                    <Marker
                      key={mac}
                      position={[lat, lon]}
                      icon={icon}
                      ref={(ref) => {
                        markerRefs.current[mac] = ref;
                      }}
                      eventHandlers={{
                        mouseover: (e) => {
                          e.target.openPopup();
                        },
                        mouseout: (e) => {
                          e.target.closePopup();
                        },
                        click: () => setSelectedMac(mac),
                      }}
                    >
                      <Popup>
                        {device.locationId || mac}
                        <br />
                        {device.address || ""}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            );
          })()}

          <div
            style={{
              marginTop: "8px",
              fontSize: "0.8rem",
              color: "#aaa",
              textAlign: "right",
            }}
          >
            Best viewed on{" "}
            {navigator.userAgent.includes("Chrome")
              ? "Chrome"
              : navigator.userAgent.includes("Firefox")
                ? "Firefox"
                : "your browser"}{" "}
            @ {window.innerWidth}x{window.innerHeight}
          </div>
        </div>
      </div>
    </>
  );
}

function Gauge({ label, value, max, color, alarm = false, hoverTitle }) {

  return (
    <div className={`gauge-box small ${alarm ? "alarm" : ""}`}>
      <CircularProgressbar
        value={value}
        maxValue={max}
        text={`${value}`}
        styles={buildStyles({
          pathColor: color,
          textColor: "#fff",
          trailColor: "#333",
        })}
      />
      <div
        className="gauge-label"
        style={hoverTitle ? { cursor: "pointer" } : {}}
        title={hoverTitle}
      >
        {label}
      </div>
    </div>
  );
}

export default DashboardView;
