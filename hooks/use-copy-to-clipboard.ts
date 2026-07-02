"use client";

import { useState } from "react";

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }

  return { copied, copy };
}
