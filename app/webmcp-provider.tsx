"use client";

import { useEffect } from "react";

import {
  registerWebMCPTools,
  unregisterWebMCPTools,
} from "@/lib/webmcp/register-tools";

export default function WebMCPProvider() {
  useEffect(() => {
    let disposed = false;

    void registerWebMCPTools()
      .then((registered) => {
        console.log("[WebMCP] registration result:", registered);
      })
      .catch((error) => {
        if (
          disposed &&
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("[WebMCP] tool registration failed:", error);
      });

    return () => {
      disposed = true;
      unregisterWebMCPTools();
    };
  }, []);

  return null;
}