import { inngest } from "./client";

export const helloWorld2 = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    //imagine this is the download step
    await step.sleep("wait-a-moment", "30s");

    //imagine this is the transcribing step
    await step.sleep("wait-a-moment", "10s");

    //imagine this is the summarizing step
    await step.sleep("wait-a-moment", "50s");
    return { message: `Hello ${event.data.email}!` };
  }
);
