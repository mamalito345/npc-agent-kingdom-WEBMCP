import {
  endConversation,
  inspectConversation,
  inspectPresentCharacters,
  startConversation,
  talkToCharacter,
} from "@/lib/conversation/service";

/*
 * Human UI deliberately calls the exact same canonical services
 * that WebMCP conversation tools call.
 */
export const humanInspectPresentCharacters = inspectPresentCharacters;
export const humanStartConversation = startConversation;
export const humanTalkToCharacter = talkToCharacter;
export const humanInspectConversation = inspectConversation;
export const humanEndConversation = endConversation;
