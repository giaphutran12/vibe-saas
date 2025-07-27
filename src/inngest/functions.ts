import { inngest } from "./client";
import { grok, createAgent } from "@inngest/agent-kit";

export const helloWorld2 = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event }) => {
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
    return { output };
  }
);
