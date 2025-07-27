import { AgentResult, TextMessage } from "@inngest/agent-kit";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function lastAssistantTextMessageContent(result: AgentResult) {
  const assistantMessages = result.output.filter(
    (message) => message.role === "assistant"
  );
  const lastMessage = assistantMessages[assistantMessages.length - 1] as
    | TextMessage
    | undefined;
  return lastMessage?.content
    ? typeof lastMessage.content === "string"
      ? lastMessage.content
      : lastMessage.content.map((c) => c.text).join("")
    : undefined;
}
