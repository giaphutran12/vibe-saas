import { Sandbox } from "@e2b/code-interpreter";
import { inngest } from "./client";
import {
  grok,
  anthropic,
  createAgent,
  createTool,
  createNetwork,
} from "@inngest/agent-kit";
import { getSandbox } from "./utils";
import { PROMPT } from "../prompt";

import z from "zod";
import { lastAssistantTextMessageContent } from "../lib/utils";
import { kMaxLength } from "buffer";

export const helloWorld2 = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-next-js-test5");
      return sandbox.sandboxId;
    });
    const codeAgent = createAgent({
      name: "code agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: anthropic({
        model: "claude-3-5-sonnet-latest",
        defaultParameters: {
          max_tokens: 4096,
          temperature: 0.1,
        },
      }),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffers = { stdout: "", stderror: "" };

              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffers.stderror += data;
                  },
                });
                return result.stdout;
              } catch (error) {
                console.error(
                  `Command failed ${error} \n stdout: ${buffers.stdout}\n stderror: ${buffers.stderror}`
                );
                return `Command failed ${error} \n stdout: ${buffers.stdout}\n stderror: ${buffers.stderror}`;
              }
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "create or update files in this sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            ),
          }),
          handler: async ({ files }, { step, network }) => {
            let parsedFiles = files;

            // Handle case where files is sent as a JSON string
            if (typeof files === "string") {
              try {
                parsedFiles = JSON.parse(files);
              } catch (error) {
                throw new Error(
                  `Failed to parse files JSON string: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
              }
            }

            if (
              !parsedFiles ||
              !Array.isArray(parsedFiles) ||
              parsedFiles.length === 0
            ) {
              throw new Error(
                "Files parameter is required and must be a non-empty array"
              );
            }

            const newFiles = await step?.run(
              "createOrUpdateFiles",
              async () => {
                try {
                  const updatedFiles = network.state.data.files || {};
                  const sandbox = await getSandbox(sandboxId);
                  for (const file of parsedFiles) {
                    if (!file.path || !file.content) {
                      throw new Error(
                        "Each file must have path and content properties"
                      );
                    }
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[file.path] = file.content;
                  }
                  return updatedFiles;
                } catch (error) {
                  console.error("Error in createOrUpdateFiles:", error);
                  throw error;
                }
              }
            );
            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),
        createTool({
          name: "readFiles",
          description: "read files from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (error) {
                console.error("Error in readFiles:", error);
                throw error;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);
          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }
          return result;
        },
      },
    });

    const network = createNetwork({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }
        return codeAgent;
      },
    });

    const result = await network.run(event.data.value);

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  }
);
