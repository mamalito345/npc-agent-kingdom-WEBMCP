"use client";

import { useEffect } from "react";

import {
  registerWebMCPTools,
  unregisterWebMCPTools,
} from "@/lib/webmcp/register-tools";

import {
  registerConversationWebMCPTools,
  unregisterConversationWebMCPTools,
} from "@/lib/webmcp/register-conversation-tools";

export default function WebMCPProvider() {
  useEffect(() => {
    let disposed = false;

    void Promise.all([
      registerWebMCPTools(),
      registerConversationWebMCPTools(),
    ])
      .then(([coreRegistered, conversationRegistered]) => {
        console.log("[WebMCP] core registration:", coreRegistered);
        console.log(
          "[WebMCP] conversation registration:",
          conversationRegistered
        );
      })
      .catch((error) => {
        if (
          disposed &&
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[WebMCP] tool registration failed:",
          error
        );
      });

    return () => {
      disposed = true;
      unregisterConversationWebMCPTools();
      unregisterWebMCPTools();
    };
  }, []);

  return null;
}
