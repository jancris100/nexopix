"use client";

import { useState } from "react";

/** Copies an example as it is shown, so it can be pasted in a terminal or in code. */
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className="code__copy" onClick={copy} aria-live="polite">
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
