"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { landCoordinates } from "../lib/globe-land";

type Vector = readonly [number, number, number];
type Projected = { x: number; y: number; depth: number; scale: number };
const radians = Math.PI / 180;
function sphere(lon: number, lat: number): Vector {
  return [
    Math.cos(lat * radians) * Math.sin(lon * radians),
    Math.sin(lat * radians),
    Math.cos(lat * radians) * Math.cos(lon * radians),
  ];
}
// Approximate country hubs are illustrative, not merchant locations.
const countries = [
  { name: "Nigeria", lon: 8, lat: 9 },
  { name: "Ghana", lon: -1, lat: 7 },
  { name: "Portugal", lon: -8, lat: 39 },
  { name: "United Kingdom", lon: -2, lat: 54 },
  { name: "United States", lon: -90, lat: 38 },
  { name: "Brazil", lon: -48, lat: -16 },
  { name: "South Africa", lon: 25, lat: -29 },
  { name: "Kenya", lon: 38, lat: 0 },
  { name: "UAE", lon: 54, lat: 24 },
  { name: "India", lon: 78, lat: 22 },
  { name: "Singapore", lon: 104, lat: 1 },
  { name: "Japan", lon: 138, lat: 36 },
  { name: "Australia", lon: 134, lat: -25 },
].map((country) => ({ ...country, point: sphere(country.lon, country.lat) }));
const connections = countries.map((_, index) => [
  index,
  (index + 1) % countries.length,
]);
const events = [
  "Demo route · Nigeria → Ghana → Portugal",
  "Demo route · United Kingdom → United States → Brazil",
  "Demo route · South Africa → Kenya → UAE",
  "Demo route · India → Singapore → Japan → Australia",
];
function route(a: Vector, b: Vector) {
  const angle = Math.acos(
    Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])),
  );
  const sine = Math.sin(angle);
  return Array.from({ length: 49 }, (_, index): Vector => {
    const t = index / 48;
    const lift = 1 + Math.sin(t * Math.PI) * 0.19;
    const first = Math.sin((1 - t) * angle) / sine;
    const second = Math.sin(t * angle) / sine;
    return [
      (a[0] * first + b[0] * second) * lift,
      (a[1] * first + b[1] * second) * lift,
      (a[2] * first + b[2] * second) * lift,
    ];
  });
}
const routes = connections.map(([a, b]) =>
  route(countries[a].point, countries[b].point),
);
const land = landCoordinates.map(([lon, lat]) => sphere(lon, lat));
const grid: Vector[][] = [];
for (let lat = -60; lat <= 60; lat += 30)
  grid.push(Array.from({ length: 91 }, (_, i) => sphere(i * 4 - 180, lat)));
for (let lon = -180; lon < 180; lon += 30)
  grid.push(Array.from({ length: 46 }, (_, i) => sphere(lon, i * 4 - 90)));

export function Globe() {
  const ref = useRef<HTMLCanvasElement>(null);
  const controls = useRef<
    | {
        rotate: (delta: number) => void;
        pause: (value: boolean) => void;
      }
    | undefined
  >(undefined);
  const [event, setEvent] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let size = 500,
      yaw = -20 * radians,
      frame = 0,
      last = 0,
      previousTime = 0,
      drag = false,
      pointer = 0;
    let inView = false,
      visible = !document.hidden,
      manuallyPaused = false;
    let cos = Math.cos(yaw),
      sin = Math.sin(yaw);
    const tilt = -0.18,
      tiltCos = Math.cos(tilt),
      tiltSin = Math.sin(tilt);
    const project = ([x, y, z]: Vector): Projected => {
      const horizontal = x * cos + z * sin,
        depth = z * cos - x * sin;
      const vertical = y * tiltCos - depth * tiltSin,
        tiltedDepth = y * tiltSin + depth * tiltCos;
      const scale = 3.6 / (3.6 - tiltedDepth);
      return {
        x: size * 0.5 + horizontal * size * 0.36 * scale,
        y: size * 0.48 - vertical * size * 0.36 * scale,
        depth: tiltedDepth,
        scale,
      };
    };
    const moving = () => !reduced.matches && !manuallyPaused;
    function stroke(points: readonly Vector[], color: string, width: number) {
      ctx!.strokeStyle = color;
      ctx!.lineWidth = width;
      ctx!.beginPath();
      let started = false;
      for (const point of points) {
        const p = project(point);
        if (p.depth < 0.025) {
          started = false;
          continue;
        }
        if (!started) {
          ctx!.moveTo(p.x, p.y);
          started = true;
        } else ctx!.lineTo(p.x, p.y);
      }
      ctx!.stroke();
    }
    function draw(time: number, force = false) {
      if (!visible) return;
      if (!force && time - last < 42) {
        frame = requestAnimationFrame((t) => draw(t));
        return;
      }
      const elapsed = previousTime ? Math.min(64, time - previousTime) : 0;
      previousTime = time;
      last = time;
      if (moving() && !drag) yaw += elapsed * 0.000035;
      cos = Math.cos(yaw);
      sin = Math.sin(yaw);
      ctx!.clearRect(0, 0, size, size);
      const center = size * 0.48,
        radius = size * 0.375;
      const atmosphere = ctx!.createRadialGradient(
        size * 0.5,
        center,
        radius * 0.5,
        size * 0.5,
        center,
        radius * 1.38,
      );
      atmosphere.addColorStop(0, "#1a2b1b");
      atmosphere.addColorStop(0.62, "#172616");
      atmosphere.addColorStop(1, "#0a0f0d00");
      ctx!.fillStyle = atmosphere;
      ctx!.fillRect(0, 0, size, size);
      const ocean = ctx!.createRadialGradient(
        size * 0.4,
        size * 0.28,
        0,
        size * 0.5,
        center,
        radius,
      );
      ocean.addColorStop(0, "#15241d");
      ocean.addColorStop(0.8, "#0d1712");
      ocean.addColorStop(1, "#111d16");
      ctx!.fillStyle = ocean;
      ctx!.beginPath();
      ctx!.arc(size * 0.5, center, radius, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.strokeStyle = "#9bb77a28";
      ctx!.lineWidth = 1;
      ctx!.stroke();
      grid.forEach((points) => stroke(points, "#829c7220", 0.65));
      for (const point of land) {
        const p = project(point);
        if (p.depth < 0) continue;
        ctx!.fillStyle = `rgba(166,197,145,${0.24 + 0.56 * p.depth})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, Math.max(0.7, size / 530) * p.scale, 0, Math.PI * 2);
        ctx!.fill();
      }
      routes.forEach((points, index) => {
        stroke(points, "#c6f43210", 5);
        stroke(points, "#c6f432a0", 1.15);
        if (moving()) {
          const progress = (time / 6500 + index * 0.127) % 1;
          const p = project(points[Math.floor(progress * (points.length - 1))]);
          if (p.depth > 0.03) {
            ctx!.shadowColor = "#c6f432";
            ctx!.shadowBlur = 10;
            ctx!.fillStyle = "#f0ffb3";
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx!.fill();
            ctx!.shadowBlur = 0;
          }
        }
      });
      // Draw labels only on the visible hemisphere, with collision avoidance.
      const boxes: { x: number; y: number; width: number; height: number }[] =
        [];
      const ordered = countries
        .map((c, index) => ({ ...c, index, p: project(c.point) }))
        .filter((c) => c.p.depth > 0.12)
        .sort((a, b) =>
          a.index === 0 ? -1 : b.index === 0 ? 1 : b.p.depth - a.p.depth,
        );
      for (const country of ordered) {
        const { p } = country;
        ctx!.fillStyle = "#c6f43218";
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 10 * p.scale, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = "#c6f43266";
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 6 * p.scale, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.fillStyle = "#dcff73";
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 2.8 * p.scale, 0, Math.PI * 2);
        ctx!.fill();
        const font = size < 400 ? 13 : 15;
        ctx!.font = `600 ${font}px Figtree, sans-serif`;
        const width =
          Math.max(
            ctx!.measureText(country.name).width,
            country.index === 0 ? ctx!.measureText("Kaduna · Lagos").width : 0,
          ) + 18;
        const height = country.index === 0 ? 47 : 28;
        let x = p.x + 12,
          y = p.y - 26;
        if (x + width > size - 8) x = p.x - width - 12;
        if (y < 12) y = p.y + 10;
        const box = { x, y, width, height };
        if (
          boxes.some(
            (b) =>
              x < b.x + b.width + 5 &&
              x + width + 5 > b.x &&
              y < b.y + b.height + 5 &&
              y + height + 5 > b.y,
          )
        )
          continue;
        boxes.push(box);
        ctx!.fillStyle = "#0a0f0dea";
        ctx!.strokeStyle = "#8ba76544";
        ctx!.lineWidth = 0.8;
        ctx!.beginPath();
        ctx!.roundRect(x, y, width, height, 7);
        ctx!.fill();
        ctx!.stroke();
        ctx!.textBaseline = "top";
        ctx!.fillStyle = "#f3f7e9";
        ctx!.fillText(country.name, x + 9, y + 7);
        if (country.index === 0) {
          ctx!.font = `400 ${font - 1}px Figtree, sans-serif`;
          ctx!.fillStyle = "#c6f432";
          ctx!.fillText("Kaduna · Lagos", x + 9, y + 25);
        }
      }
      // Two local demo points anchor the worldwide illustration to the original cities.
      for (const point of [sphere(7.4, 10.5), sphere(3.4, 6.5)]) {
        const p = project(point);
        if (p.depth > 0) {
          ctx!.fillStyle = "#fff9f0";
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      if (moving() && inView) frame = requestAnimationFrame((t) => draw(t));
    }
    function render() {
      cancelAnimationFrame(frame);
      draw(performance.now(), true);
    }
    function resize() {
      size = canvas.clientWidth;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    }
    controls.current = {
      rotate: (delta) => {
        yaw += delta;
        render();
      },
      pause: (value) => {
        manuallyPaused = value;
        previousTime = 0;
        render();
      },
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      previousTime = 0;
      cancelAnimationFrame(frame);
      if (inView) render();
    });
    intersection.observe(canvas);
    function visibility() {
      visible = !document.hidden;
      previousTime = 0;
      cancelAnimationFrame(frame);
      if (visible) render();
    }
    function down(e: PointerEvent) {
      drag = true;
      pointer = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    }
    function move(e: PointerEvent) {
      if (!drag) return;
      yaw += (e.clientX - pointer) * 0.006;
      pointer = e.clientX;
      render();
    }
    function up() {
      drag = false;
    }
    function key(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      controls.current?.rotate(e.key === "ArrowLeft" ? -0.25 : 0.25);
    }
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      controls.current = undefined;
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", render);
    };
  }, []);
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const id = setInterval(() => {
      if (!document.hidden) setEvent((v) => (v + 1) % events.length);
    }, 5500);
    return () => clearInterval(id);
  }, [paused]);
  return (
    <div className="globe-wrap">
      <div className="globe-heading">
        <span>
          <i aria-hidden="true" />
          Demo network
        </span>
        <span>13 countries · one illustrative loop</span>
      </div>
      <canvas
        ref={ref}
        tabIndex={0}
        role="img"
        aria-label="Illustrative globe showing a demo loop connecting 13 countries across Africa, Europe, the Americas, Asia, and Australia. Nigeria includes Kaduna and Lagos. Drag or use arrow keys to rotate."
      />
      <div className="globe-toolbar">
        <span>Drag to explore</span>
        <div>
          <button
            type="button"
            className="globe-control"
            aria-label="Rotate globe left"
            onClick={() => controls.current?.rotate(-0.3)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            className="globe-control"
            aria-label={
              paused ? "Resume globe animation" : "Pause globe animation"
            }
            aria-pressed={paused}
            onClick={() => {
              const next = !paused;
              setPaused(next);
              controls.current?.pause(next);
            }}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            type="button"
            className="globe-control"
            aria-label="Rotate globe right"
            onClick={() => controls.current?.rotate(0.3)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <p className="globe-caption">
        Illustrative demo connections, not a live merchant map.
      </p>
      <div className="ticker">
        <b>● Demo data</b>
        <span>{events[event]}</span>
      </div>
    </div>
  );
}
