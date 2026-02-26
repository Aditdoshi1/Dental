"use client";

import { useEffect, useRef } from "react";

interface Props {
  srcCode: string | undefined;
}

export default function TrackScanOnLanding({ srcCode }: Props) {
  const sent = useRef(false);

  useEffect(() => {
    if (!srcCode || sent.current) return;
    sent.current = true;
    fetch("/api/track-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: srcCode }),
    }).catch(() => {});
  }, [srcCode]);

  return null;
}
