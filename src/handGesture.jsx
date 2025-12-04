// GestureSlidePrototype.jsx
// React component prototype for gesture-based slide navigation & annotation

import React, { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export default function GestureSlidePrototype() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // for MediaPipe drawing
  const drawCanvasRef = useRef(null); // for annotations
  const cameraRef = useRef(null);
  const lastXRef = useRef(null);
  const lastTimeRef = useRef(null);
  const lastDrawPosRef = useRef({ x: null, y: null }); // store last drawing position
  const [slideIndex, setSlideIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [slides] = useState([
    { title: "Slide 1", content: "Welcome to the lesson" },
    { title: "Slide 2", content: "Gesture controls: swipe to change slides" },
    { title: "Slide 3", content: "Pinch to draw annotations" },
  ]);

  useEffect(() => {
    if (!videoRef.current) return;

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });

    hands.onResults(onResults);

    cameraRef.current = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    cameraRef.current.start();

    return () => {
      cameraRef.current && cameraRef.current.stop();
      hands && hands.close();
    };
  }, []);

  function onResults(results) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      drawLandmarks(ctx, landmarks);

      const wrist = landmarks[0];
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];

      detectSwipe(wrist.x);
      detectPinch(indexTip, thumbTip);
    } else {
      setIsDrawing(false);
      lastXRef.current = null;
      lastDrawPosRef.current = { x: null, y: null };
    }

    ctx.restore();
  }

  function drawLandmarks(ctx, landmarks) {
    ctx.fillStyle = "rgba(0,255,0,0.7)";
    for (let i = 0; i < landmarks.length; i++) {
      const x = landmarks[i].x * ctx.canvas.width;
      const y = landmarks[i].y * ctx.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  function detectSwipe(xNorm) {
    const now = performance.now();
    const lastX = lastXRef.current;
    const lastTime = lastTimeRef.current;

    if (lastX != null && lastTime != null) {
      const dx = xNorm - lastX;
      const dt = (now - lastTime) / 1000;
      const vx = dx / dt;
      const vxPx = vx * 640;

      if (vxPx > 120) {
        goPrevSlide();
        lastXRef.current = null;
        lastTimeRef.current = null;
        return;
      } else if (vxPx < -120) {
        goNextSlide();
        lastXRef.current = null;
        lastTimeRef.current = null;
        return;
      }
    }

    lastXRef.current = xNorm;
    lastTimeRef.current = now;
  }

  function goNextSlide() {
    setSlideIndex((s) => Math.min(s + 1, slides.length - 1));
  }
  function goPrevSlide() {
    setSlideIndex((s) => Math.max(s - 1, 0));
  }

  function detectPinch(indexTip, thumbTip) {
    const dx = indexTip.x - thumbTip.x;
    const dy = indexTip.y - thumbTip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const pinchThreshold = 0.05;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const x = indexTip.x * canvas.width;
    const y = indexTip.y * canvas.height;

    if (dist < pinchThreshold) {
      setIsDrawing(true);
      ctx.strokeStyle = "rgba(255,0,0,0.95)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      if (
        lastDrawPosRef.current.x !== null &&
        lastDrawPosRef.current.y !== null
      ) {
        ctx.beginPath();
        ctx.moveTo(lastDrawPosRef.current.x, lastDrawPosRef.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      lastDrawPosRef.current = { x, y };
    } else {
      if (isDrawing) setIsDrawing(false);
      lastDrawPosRef.current = { x: null, y: null };
    }
  }

  function clearAnnotations() {
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function exportAnnotations() {
    const canvas = drawCanvasRef.current;
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = `annotations-slide-${slideIndex}.png`;
    a.click();
  }

  useEffect(() => {
    function fitCanvases() {
      const video = videoRef.current;
      const c = canvasRef.current;
      const d = drawCanvasRef.current;
      if (!video || !c || !d) return;
      // Use displayed size for overlays
      const rect = video.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      c.width = w;
      c.height = h;
      d.width = w;
      d.height = h;
      c.style.width = "100%";
      c.style.height = "100%";
      d.style.width = "100%";
      d.style.height = "100%";
    }

    window.addEventListener("resize", fitCanvases);
    fitCanvases();
    return () => window.removeEventListener("resize", fitCanvases);
  }, []);

  return (
    <div style={{ padding: "20px", background: "#f9f9f9", minHeight: "100vh" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Teacher Camera Section */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}
          >
            Teacher Camera (gesture input)
          </h2>
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "480px",
              aspectRatio: "4/3",
              margin: "0 auto",
            }}
          >
            <video
              ref={videoRef}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "8px",
                display: "block",
                maxWidth: "100%",
              }}
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            />
            <canvas
              ref={drawCanvasRef}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            />
          </div>
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button onClick={goPrevSlide}>Prev Slide</button>
            <button onClick={goNextSlide}>Next Slide</button>
            <button onClick={clearAnnotations}>Clear Annotations</button>
            <button onClick={exportAnnotations}>Export Annotations</button>
          </div>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "#555" }}>
            Tip: quick swipe with your hand changes slides. Pinch (thumb+index)
            to draw.
          </p>
        </div>

        {/* Slides Section */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2
            style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}
          >
            Slides & Annotations
          </h2>
          <div
            style={{
              flex: 1,
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: "16px", top: "16px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "700" }}>
                {slides[slideIndex].title}
              </h3>
            </div>
            <div style={{ marginTop: "48px", color: "#333" }}>
              <p style={{ fontSize: "16px" }}>{slides[slideIndex].content}</p>
            </div>
            <div
              style={{
                position: "absolute",
                right: "16px",
                bottom: "16px",
                fontSize: "14px",
                color: "#888",
              }}
            >
              Slide {slideIndex + 1} / {slides.length}
            </div>
          </div>

          <div
            style={{
              marginTop: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              Mode:{" "}
              {isDrawing ? (
                <span style={{ color: "green" }}>Drawing</span>
              ) : (
                <span style={{ color: "gray" }}>Idle</span>
              )}
            </div>
            <div style={{ fontSize: "14px", color: "#888" }}>
              (Swipe to change slides, Pinch to draw)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
