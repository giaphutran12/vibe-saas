import { Sandbox } from "@e2b/code-interpreter";
import { inngest } from "./client";
import {
  anthropic,
  createAgent,
  createTool,
  createNetwork,
  type Tool,
  type Message,
  createState,
} from "@inngest/agent-kit";
import { getSandbox, parseAgentOutput } from "./utils";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "../prompt";

import z from "zod";
import { lastAssistantTextMessageContent } from "../lib/utils";
import { prisma } from "@/lib/db";
import { Assistant } from "next/font/google";
import { create } from "domain";

interface AgentState {
  summary: string;
  files: { [path: string]: string };
}

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    //external service side-effect: Creating a code sandbox environment for AI
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-next-js-test5");
      return sandbox.sandboxId;
    });
    const previousMessages = await step.run(
      "get-previous-messages",
      async () => {
        const formattedMessages: Message[] = [];
        const messages = await prisma.message.findMany({
          where: {
            projectId: event.data.projectId,
          },
          orderBy: {
            createdAt: "asc", //TODO: Change to "asc" if AI doesn't understand it very well
          },
        });
        for (const message of messages) {
          formattedMessages.push({
            type: "text",
            role: message.role === "ASSISTANT" ? "assistant" : "user",
            content: message.content,
          });
        }
        return formattedMessages;
      }
    );

    const state = createState<AgentState>(
      {
        summary: "",
        files: {},
      },
      { messages: previousMessages }
    );
    const codeAgent = createAgent<AgentState>({
      name: "code agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: anthropic({
        model: "claude-3-5-sonnet-20241022",
        defaultParameters: {
          max_tokens: 4096,
          temperature: 0.5,
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
          handler: async (
            { files },
            { step, network }: Tool.Options<AgentState>
          ) => {
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

                  // Validate imports before creating files
                  for (const file of parsedFiles) {
                    if (!file.path || !file.content) {
                      throw new Error(
                        "Each file must have path and content properties"
                      );
                    }

                    // Check for relative imports and validate they exist
                    const relativeImportRegex =
                      /import\s+.*\s+from\s+['"](\.\/[^'"]+)['"]/g;
                    const matches = file.content.match(relativeImportRegex);

                    if (matches) {
                      for (const match of matches) {
                        const importPath =
                          match.match(/['"](\.\/[^'"]+)['"]/)?.[1];
                        if (importPath) {
                          const fullPath =
                            file.path.replace(/\/[^\/]+$/, "") +
                            importPath.replace("./", "/") +
                            ".tsx";
                          const exists =
                            parsedFiles.some((f) => f.path === fullPath) ||
                            Object.keys(updatedFiles).some(
                              (path) => path === fullPath
                            );
                          if (!exists) {
                            throw new Error(
                              `Import error: ${file.path} imports ${importPath} but ${fullPath} does not exist. Create imported files first.`
                            );
                          }
                        }
                      }
                    }
                  }

                  // Create files after validation
                  for (const file of parsedFiles) {
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

    const network = createNetwork<AgentState>({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      defaultState: state,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }
        return codeAgent;
      },
    });

    const result = await network.run(event.data.value, { state });
    const fragmentTitleGenerator = createAgent({
      name: "fragment-title-generator",
      description: "A fragment title generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: anthropic({
        model: "claude-3-5-sonnet-20241022",
        defaultParameters: {
          max_tokens: 4096,
          temperature: 0.5,
        },
      }),
    });
    const responseGenerator = createAgent({
      name: "response-generator",
      description: "A response generator",
      system: RESPONSE_PROMPT,
      model: anthropic({
        model: "claude-3-5-sonnet-20241022",
        defaultParameters: {
          max_tokens: 4096,
          temperature: 0.5,
        },
      }),
    });
    const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(
      result.state.data.summary
    );
    const { output: responseOutput } = await responseGenerator.run(
      result.state.data.summary
    );

    const isError =
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;
    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });
    //database side-effect: saving results
    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: "Something went wrong. Please try again",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: parseAgentOutput(responseOutput),
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl: sandboxUrl,
              title: parseAgentOutput(fragmentTitleOutput),
              files: result.state.data.files,
            },
          },
        },
      });
    });
    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  }
);
