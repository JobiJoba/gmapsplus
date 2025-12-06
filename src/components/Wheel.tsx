import { useEffect, useRef, useState } from "react";

interface WheelItem {
  id: string;
  label: string;
}

interface WheelProps {
  items: WheelItem[];
  isSpinning: boolean;
  onSpinComplete?: (item: WheelItem) => void;
}

export function Wheel({ items, isSpinning, onSpinComplete }: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current || items.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = Math.min(400, window.innerWidth - 64);
    canvas.width = size;
    canvas.height = size;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 20;

    const drawWheel = (currentRotation: number) => {
      ctx.clearRect(0, 0, size, size);

      const anglePerItem = (2 * Math.PI) / items.length;

      items.forEach((item, index) => {
        const startAngle = index * anglePerItem + currentRotation;
        const endAngle = (index + 1) * anglePerItem + currentRotation;

        // Alternate colors
        ctx.fillStyle = index % 2 === 0 ? "#a855f7" : "#ec4899";
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + anglePerItem / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        const text = item.label.length > 15 ? item.label.substring(0, 15) + "..." : item.label;
        ctx.fillText(text, radius * 0.6, 0);
        ctx.restore();
      });

      // Draw center circle
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
      ctx.fill();

      // Draw pointer
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius - 10);
      ctx.lineTo(centerX - 10, centerY - radius);
      ctx.lineTo(centerX + 10, centerY - radius);
      ctx.closePath();
      ctx.fill();
    };

    if (isSpinning) {
      let currentRotation = rotation;
      const targetRotation = rotation + 4 * Math.PI + Math.random() * 2 * Math.PI;
      const startTime = Date.now();
      const duration = 2000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentRotation = rotation + (targetRotation - rotation) * easeOut;
        setRotation(currentRotation);
        drawWheel(currentRotation);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Determine which item was selected
          const normalizedRotation = ((currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          const anglePerItem = (2 * Math.PI) / items.length;
          const pointerAngle = (3 * Math.PI) / 2; // Pointer is at top
          let selectedIndex = Math.floor((pointerAngle - normalizedRotation + 2 * Math.PI) % (2 * Math.PI) / anglePerItem);
          selectedIndex = items.length - 1 - selectedIndex;
          if (selectedIndex < 0) selectedIndex = 0;
          if (selectedIndex >= items.length) selectedIndex = items.length - 1;
          
          onSpinComplete?.(items[selectedIndex]);
        }
      };

      animate();
    } else {
      drawWheel(rotation);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [items, isSpinning, rotation, onSpinComplete]);

  if (items.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-muted-foreground">
        No places selected
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} className="max-w-full" />
    </div>
  );
}

