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
  registerArmyManagementWebMCPTools,
} from "@/lib/webmcp/register-army-management-tools";

import {
  registerAudienceWebMCPTools,
} from "@/lib/webmcp/register-audience-tools";

import {
  registerWarWebMCPTools,
} from "@/lib/webmcp/register-war-tools";

import {
  registerMapWebMCPTools,
} from "@/lib/webmcp/register-map-tools";

import {
  installWebMcpIdentityGuard,
} from "@/lib/webmcp/identity-guard";

export default function WebMCPProvider() {
  useEffect(
    () => {
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
        registerArmyManagementWebMCPTools(),
        registerAudienceWebMCPTools(),
        registerWarWebMCPTools(),
        registerMapWebMCPTools(),
      ])
        .then(
          ([
            coreRegistered,
            conversationRegistered,
            lordRegistered,
            politicsRegistered,
            borderRegistered,
            armyManagementRegistered,
            audienceRegistered,
            warRegistered,
            mapRegistered,
          ]) => {
            if (
              !alive
            ) {
              return;
            }

            console.log(
              "[WebMCP] identity-bound facade registration:",
              {
                guard,
                coreRegistered,
                conversationRegistered,
                lordRegistered,
                politicsRegistered,
                borderRegistered,
                armyManagementRegistered,
                audienceRegistered,
                warRegistered,
                mapRegistered,
              }
            );
          }
        )
        .catch(
          (
            error
          ) => {
            if (
              !alive
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
        alive =
          false;
      };
    },
    []
  );

  return null;
}
