"use client";

import {
  useEffect,
} from "react";

import {
  registerWebMCPTools,
  unregisterWebMCPTools,
} from "@/lib/webmcp/register-tools";

import {
  registerConversationWebMCPTools,
  unregisterConversationWebMCPTools,
} from "@/lib/webmcp/register-conversation-tools";

import {
  registerLordWebMCPTools,
  unregisterLordWebMCPTools,
} from "@/lib/webmcp/register-lord-tools";

import {
  registerPoliticsWebMCPTools,
  unregisterPoliticsWebMCPTools,
} from "@/lib/webmcp/register-politics-tools";

export default function WebMCPProvider() {
  useEffect(() => {
    let disposed =
      false;

    void Promise.all([
      registerWebMCPTools(),
      registerConversationWebMCPTools(),
      registerLordWebMCPTools(),
      registerPoliticsWebMCPTools(),
    ])
      .then(
        ([
          coreRegistered,
          conversationRegistered,
          lordRegistered,
          politicsRegistered,
        ]) => {
          console.log(
            "[WebMCP] core registration:",
            coreRegistered
          );
          console.log(
            "[WebMCP] conversation registration:",
            conversationRegistered
          );
          console.log(
            "[WebMCP] lord registration:",
            lordRegistered
          );
          console.log(
            "[WebMCP] politics registration:",
            politicsRegistered
          );
        }
      )
      .catch(
        (error) => {
          if (
            disposed &&
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "[WebMCP] tool registration failed:",
            error
          );
        }
      );

    return () => {
      disposed = true;
      unregisterPoliticsWebMCPTools();
      unregisterLordWebMCPTools();
      unregisterConversationWebMCPTools();
      unregisterWebMCPTools();
    };
  }, []);

  return null;
}
