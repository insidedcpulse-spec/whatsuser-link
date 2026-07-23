"use client";

import { useEffect } from "react";

export function AdBanner() {
  useEffect(() => {
    try {
      // @ts-expect-error window.adsbygoogle is defined by Google AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignore if adsbygoogle hasn't loaded yet
    }
  }, []);

  return (
    <div className="flex justify-center my-6 min-h-[90px] w-full max-w-3xl overflow-hidden rounded-xl border border-dashed bg-muted/20 p-2 text-center">
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight: "90px" }}
        data-ad-client="ca-pub-5219655673819952"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
