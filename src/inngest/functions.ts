import { Sandbox } from "@e2b/code-interpreter";
import { inngest } from "./client";
import { grok, createAgent } from "@inngest/agent-kit";
import { getSandbox } from "./utils";

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
      system:
        "You are an expert code agent in Next.js.  You write readable and maintainable code. You create short Next.js code snippet",
      model: grok({ model: "grok-3" }),
    });

    const { output } = await codeAgent.run(
      `Code the following snippet: ${event.data.value}`
    );
    console.log(output);

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    return { output, sandboxUrl };
  }
);
