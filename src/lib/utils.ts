import { TreeItem } from "@/types";
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

/**
 * Convert a record of files to a tree structure.
 * @param files - Record of file paths to content
 * @returns Tree structure for TreeView component
 *
 * @example
 * Input:{"src/Button.tsx":"...","README.md":"..."}
 * Output:[["src","Button.tsx"],"README.md"]
 */
export function convertFilesToTreeItems(files: {
  [path: string]: string;
}): TreeItem[] {
  interface TreeNode {
    [key: string]: TreeNode | null;
  }
  const tree: TreeNode = {};
  const sortedPaths = Object.keys(files).sort();
  for (const filePath of sortedPaths) {
    const parts = filePath.split("/");
    let current = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {}; //create folder if it doesn't exist
      }
      current = current[part];
    }
    const fileName = parts[parts.length - 1];
    current[fileName] = null;
  }
  function convertNode(node: TreeNode, name?: string): TreeItem[] | TreeItem {
    const entries = Object.entries(node);
    if (entries.length === 0) {
      return name || "";
    }
    const children: TreeItem[] = [];
    for (const [key, value] of entries) {
      if (value === null) {
        //this is a file
        children.push(key);
      } else {
        //this is a folder
        const subTree = convertNode(value, key);
        if (Array.isArray(subTree)) {
          children.push([key, ...subTree]);
        } else {
          children.push([key, subTree]);
        }
      }
    }
    return children;
  }
  const result = convertNode(tree);
  return Array.isArray(result) ? result : [result];
}
