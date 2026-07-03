"use client";

import { useState } from "react";

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  function copyWithExecCommand(text: string): boolean {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    let success = false;
    try {
      success = document.execCommand("copy");
    } catch {
      success = false;
    }

    document.body.removeChild(textarea);
    return success;
  }

  async function copy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else if (!copyWithExecCommand(text)) {
        throw new Error("execCommand copy failed");
      }
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
