"use client";

import {
  useEffect,
} from "react";

import {
  registerWebMCPTools,
} from "@/lib/webmcp/register-tools";

import {
  registerConversationWebMCPTools,
} from "@/lib/webmcp/register-conversation-tools";

import {
  registerLordWebMCPTools,
} from "@/lib/webmcp/register-lord-tools";

import {
  registerPoliticsWebMCPTools,
} from "@/lib/webmcp/register-politics-tools";

import {
  registerBorderWebMCPTools,
} from "@/lib/webmcp/register-border-tools";

import {
  installWebMcpIdentityGuard,
} from "@/lib/webmcp/identity-guard";

export default function WebMCPProvider() {
  useEffect(() => {
    let alive =
      true;

    const guard =
      installWebMcpIdentityGuard();

    if (
      guard ===
      "failed"
    ) {
      console.error(
        "[WebMCP] refusing to register gameplay tools without identity binding"
      );

      return;
    }

    if (
      guard ===
      "unavailable"
    ) {
      console.log(
        "[WebMCP] unavailable"
      );

      return;
    }

    void Promise.all([
      registerWebMCPTools(),
      registerConversationWebMCPTools(),
      registerLordWebMCPTools(),
      registerPoliticsWebMCPTools(),
      registerBorderWebMCPTools(),
    ])
      .then(
        ([
          coreRegistered,
          conversationRegistered,
          lordRegistered,
          politicsRegistered,
          borderRegistered,
        ]) => {
          if (!alive) {
            return;
          }

          console.log(
            "[WebMCP] identity-bound registration:",
            {
              guard,
              coreRegistered,
              conversationRegistered,
              lordRegistered,
              politicsRegistered,
              borderRegistered,
            }
          );
        }
      )
      .catch(
        (error) => {
          if (!alive) {
            return;
          }

          console.error(
            "[WebMCP] tool registration failed:",
            error
          );
        }
      );

    /*
     * Intentionally do NOT abort/unregister here.
     *
     * React development StrictMode mounts/effect-cleans/remounts components.
     * Aborting WebMCP registrations during that synthetic cleanup produced
     * AbortError races and duplicate-registration instability.
     *
     * All register modules are already idempotent for the page lifetime and
     * this provider lives at the application root.
     */
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
