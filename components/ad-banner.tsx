"use client";

import { useEffect, useRef } from "react";

const AD_KEY = "be1a6e88263543f800888d44d479ffcd";
const AD_WIDTH = 300;
const AD_HEIGHT = 250;

export function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const optionsScript = document.createElement("script");
    optionsScript.type = "text/javascript";
    optionsScript.text = `atOptions = {
      'key' : '${AD_KEY}',
      'format' : 'iframe',
      'height' : ${AD_HEIGHT},
      'width' : ${AD_WIDTH},
      'params' : {}
    };`;

    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = `//www.highperformanceformat.com/${AD_KEY}/invoke.js`;
    invokeScript.async = true;

    container.appendChild(optionsScript);
    container.appendChild(invokeScript);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex justify-center"
      style={{ minHeight: AD_HEIGHT, minWidth: AD_WIDTH }}
    />
  );
}
