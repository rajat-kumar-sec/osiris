"use client";

import type { Map as MapLibreMap } from "maplibre-gl";

type Draw = (ctx: CanvasRenderingContext2D) => void;

const PATHS: Record<string, Draw> = {
  plane: (c) => {
    c.beginPath();
    c.moveTo(24, 3);
    c.lineTo(28, 17);
    c.lineTo(44, 27);
    c.lineTo(44, 32);
    c.lineTo(27, 28);
    c.lineTo(27, 39);
    c.lineTo(34, 44);
    c.lineTo(34, 47);
    c.lineTo(24, 45);
    c.lineTo(14, 47);
    c.lineTo(14, 44);
    c.lineTo(21, 39);
    c.lineTo(21, 28);
    c.lineTo(4, 32);
    c.lineTo(4, 27);
    c.lineTo(20, 17);
    c.closePath();
    c.fill();
  },
  ship: (c) => {
    c.beginPath();
    c.moveTo(24, 4);
    c.lineTo(31, 20);
    c.lineTo(43, 25);
    c.lineTo(43, 43);
    c.lineTo(32, 38);
    c.lineTo(16, 38);
    c.lineTo(5, 43);
    c.lineTo(5, 25);
    c.lineTo(17, 20);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = "destination-out";
    c.fillRect(21, 12, 6, 8);
    c.fillRect(19, 28, 10, 5);
    c.globalCompositeOperation = "source-over";
  },
  satellite: (c) => {
    c.fillRect(18, 18, 12, 12);
    c.fillRect(2, 20, 13, 8);
    c.fillRect(33, 20, 13, 8);
    c.fillRect(22, 2, 4, 12);
    c.beginPath();
    c.moveTo(24, 34);
    c.lineTo(30, 46);
    c.lineTo(18, 46);
    c.closePath();
    c.fill();
  },
  camera: (c) => {
    c.beginPath();
    c.roundRect(5, 14, 38, 24, 3);
    c.fill();
    c.beginPath();
    c.arc(24, 26, 8, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.arc(24, 26, 4, 0, Math.PI * 2);
    c.fill();
    c.fillRect(2, 10, 14, 5);
    c.globalCompositeOperation = "source-over";
  },
  radiation: (c) => {
    c.save();
    c.translate(24, 24);
    for (let i = 0; i < 3; i++) {
      c.rotate((Math.PI * 2) / 3);
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, 19, -Math.PI / 2 + 0.32, -Math.PI / 2 + 0.32 + 1.35);
      c.closePath();
      c.fill();
    }
    c.beginPath();
    c.arc(0, 0, 5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  },
  quake: (c) => {
    c.lineWidth = 4;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(3, 26);
    c.lineTo(12, 26);
    c.lineTo(17, 12);
    c.lineTo(23, 38);
    c.lineTo(29, 18);
    c.lineTo(34, 26);
    c.lineTo(45, 26);
    c.stroke();
  },
  fire: (c) => {
    c.beginPath();
    c.moveTo(24, 3);
    c.bezierCurveTo(34, 15, 40, 21, 40, 31);
    c.bezierCurveTo(40, 40, 33, 46, 24, 46);
    c.bezierCurveTo(15, 46, 8, 40, 8, 31);
    c.bezierCurveTo(8, 23, 13, 18, 18, 12);
    c.bezierCurveTo(18, 20, 22, 23, 24, 23);
    c.bezierCurveTo(27, 17, 26, 9, 24, 3);
    c.fill();
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.moveTo(24, 28);
    c.bezierCurveTo(30, 34, 31, 38, 28, 42);
    c.bezierCurveTo(26, 44, 22, 44, 20, 42);
    c.bezierCurveTo(17, 38, 19, 33, 24, 28);
    c.fill();
    c.globalCompositeOperation = "source-over";
  },
  storm: (c) => {
    c.lineWidth = 4;
    c.lineCap = "round";
    c.beginPath();
    c.arc(24, 24, 16, 0.3, Math.PI * 1.5);
    c.stroke();
    c.beginPath();
    c.arc(24, 24, 9, Math.PI * 1.2, Math.PI * 2.6);
    c.stroke();
    c.beginPath();
    c.arc(24, 24, 3.5, 0, Math.PI * 2);
    c.fill();
  },
  train: (c) => {
    c.beginPath();
    c.roundRect(10, 5, 28, 32, 5);
    c.fill();
    c.globalCompositeOperation = "destination-out";
    c.fillRect(15, 10, 18, 11);
    c.fillRect(15, 26, 18, 3);
    c.globalCompositeOperation = "source-over";
    c.fillRect(14, 39, 6, 7);
    c.fillRect(28, 39, 6, 7);
  },
  anchor: (c) => {
    c.lineWidth = 4;
    c.lineCap = "round";
    c.beginPath();
    c.arc(24, 9, 5, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(24, 14);
    c.lineTo(24, 40);
    c.moveTo(14, 20);
    c.lineTo(34, 20);
    c.stroke();
    c.beginPath();
    c.arc(24, 26, 14, 0.35, Math.PI - 0.35);
    c.stroke();
  },
  airport: (c) => {
    c.fillRect(8, 8, 32, 32);
    c.globalCompositeOperation = "destination-out";
    c.fillRect(12, 12, 24, 24);
    c.globalCompositeOperation = "source-over";
    c.fillRect(21, 14, 6, 20);
    c.fillRect(14, 21, 20, 6);
  },
  cyber: (c) => {
    c.beginPath();
    c.moveTo(24, 3);
    c.lineTo(42, 10);
    c.lineTo(42, 24);
    c.bezierCurveTo(42, 36, 33, 43, 24, 46);
    c.bezierCurveTo(15, 43, 6, 36, 6, 24);
    c.lineTo(6, 10);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.moveTo(24, 12);
    c.lineTo(32, 16);
    c.lineTo(32, 25);
    c.bezierCurveTo(32, 31, 28, 35, 24, 37);
    c.bezierCurveTo(20, 35, 16, 31, 16, 25);
    c.lineTo(16, 16);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = "source-over";
  },
  volcano: (c) => {
    c.beginPath();
    c.moveTo(4, 42);
    c.lineTo(18, 18);
    c.lineTo(24, 26);
    c.lineTo(30, 14);
    c.lineTo(44, 42);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.moveTo(24, 4);
    c.bezierCurveTo(28, 10, 26, 16, 24, 18);
    c.bezierCurveTo(20, 14, 20, 8, 24, 4);
    c.fill();
    c.globalCompositeOperation = "source-over";
  },
  outage: (c) => {
    c.lineWidth = 4;
    c.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(24, 34, 8 + i * 8, Math.PI * 1.25, Math.PI * 1.75);
      c.stroke();
    }
    c.beginPath();
    c.arc(24, 36, 4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#000";
    c.beginPath();
    c.moveTo(6, 6);
    c.lineTo(42, 42);
    c.stroke();
  },
  pin: (c) => {
    c.beginPath();
    c.arc(24, 18, 12, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(14, 26);
    c.lineTo(34, 26);
    c.lineTo(24, 46);
    c.closePath();
    c.fill();
  },
};

export function addOsirisIcons(map: MapLibreMap) {
  for (const [name, draw] of Object.entries(PATHS)) {
    const id = `osiris-${name}`;
    if (map.hasImage(id)) continue;
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    draw(ctx);
    const data = ctx.getImageData(0, 0, size, size);
    map.addImage(id, { width: size, height: size, data: new Uint8Array(data.data) }, { sdf: true, pixelRatio: 2 });
  }
}

export const ICON = {
  plane: "osiris-plane",
  ship: "osiris-ship",
  satellite: "osiris-satellite",
  camera: "osiris-camera",
  radiation: "osiris-radiation",
  quake: "osiris-quake",
  fire: "osiris-fire",
  storm: "osiris-storm",
  train: "osiris-train",
  anchor: "osiris-anchor",
  airport: "osiris-airport",
  cyber: "osiris-cyber",
  volcano: "osiris-volcano",
  outage: "osiris-outage",
  pin: "osiris-pin",
};
