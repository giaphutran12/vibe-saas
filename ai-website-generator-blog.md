# Building an AI Website Generator: From Sandboxed Code Execution to Real-Time Web Apps

_How we built a system that generates fully functional web applications using AI agents, code sandboxes, and background processing_

---

## The Vision: AI That Builds Real Websites

Imagine describing a website to an AI and watching it materialize before your eyes. Not just mockups or wireframes, but actual, running web applications with real code, real functionality, and real deployment. This isn't science fiction—it's what we built at Vibe, an AI-powered website generator that turns natural language into working web apps.

In this deep dive, I'll walk you through the architecture, the challenges we faced, and the innovative solutions we implemented to make this vision a reality.

## The Core Architecture: AI Agents + Code Sandboxes

At the heart of our system lies a sophisticated orchestration of AI agents, code sandboxes, and background processing. Let me break down how it all works together.

### 1. The Inngest Background Processing Engine

We chose [Inngest](https://inngest.com/) as our background job processor for its reliability and developer experience. Here's how we set it up:

```
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "vibe-development" });
```

The beauty of Inngest is its simplicity—just a few lines to get a robust background processing system running. But the real magic happens in our function definitions.

### 2. The AI Agent Orchestration

Our system uses multiple AI agents working in concert. The main orchestrator is the `codeAgentFunction`, which coordinates the entire website generation process:

```
export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    // Create sandbox environment
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-next-js-test5", {
        timeoutMs: SANDBOX_TIMEOUT,
      });
      return sandbox.sandboxId;
    });

    // ... rest of the function
  }
);
```

Notice the `step.run()` pattern—this is Inngest's way of ensuring each operation is tracked, retried, and monitored. If any step fails, the entire process can be retried from that point.

### 3. The Sandboxed Development Environment

One of our biggest challenges was creating a safe, isolated environment where AI could generate and execute code. We solved this using [E2B's code interpreter](https://e2b.dev/), which provides:

- **Isolation**: Each generation request gets its own sandbox
- **Security**: No access to the host system or other users' data
- **Real-time execution**: The generated code actually runs and can be tested

```
const sandboxId = await step.run("get-sandbox-id", async () => {
  const sandbox = await Sandbox.create("vibe-next-js-test5", {
    timeoutMs: SANDBOX_TIMEOUT,
  });
  return sandbox.sandboxId;
});
```

## The AI Agent Toolkit: Tools That Actually Work

What makes our AI agents powerful isn't just their language model—it's the tools we give them. Let me show you the three core tools that enable real website generation:

### 1. Terminal Access (With Safety)

```
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
        console.error(`Command failed ${error}`);
        return `Command failed ${error}`;
      }
    });
  },
})
```

This tool allows the AI to install packages, run build commands, and execute any necessary terminal operations. The key insight here is that we're not just simulating terminal access—we're giving the AI real, functional terminal access within the sandbox.

### 2. File Creation and Management

The most sophisticated tool is our `createOrUpdateFiles` function, which handles the complex task of creating multiple interdependent files:

```
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
    // Handle case where files is sent as a JSON string
    if (typeof files === "string") {
      try {
        parsedFiles = JSON.parse(files);
      } catch (error) {
        throw new Error(`Failed to parse files JSON string: ${error}`);
      }
    }

    // Validate imports before creating files
    for (const file of parsedFiles) {
      const relativeImportRegex = /import\s+.*\s+from\s+['"](\.\/[^'"]+)['"]/g;
      const matches = file.content.match(relativeImportRegex);

      if (matches) {
        // Validate that imported files exist or will be created in the same batch
        // ... validation logic
      }
    }

    // Create files after validation
    for (const file of parsedFiles) {
      await sandbox.files.write(file.path, file.content);
      updatedFiles[file.path] = file.content;
    }
  },
})
```

This tool is particularly clever because it:

- **Validates imports**: Ensures that when the AI creates a file that imports another file, the dependency actually exists
- **Handles batch creation**: Allows multiple files to be created simultaneously, preventing import errors
- **Maintains state**: Keeps track of all created files for future reference

### 3. File Reading for Context

```
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
})
```

This tool allows the AI to read existing files, understand the current state of the project, and make informed decisions about what to create or modify.

## The Multi-Agent System: Specialization and Coordination

We didn't build one monolithic AI agent—we built a network of specialized agents that work together:

```
const network = createNetwork<AgentState>({
  name: "coding-agent-network",
  agents: [codeAgent],
  maxIter: 15,
  defaultState: state,
  router: async ({ network }) => {
    const summary = network.state.data.summary;
    if (summary) {
      return; // Task complete
    }
    return codeAgent; // Continue with coding agent
  },
});
```

After the main coding agent completes its work, we have specialized agents for:

1. **Fragment Title Generator**: Creates descriptive titles for the generated code
2. **Response Generator**: Formats user-friendly responses explaining what was built

```
const fragmentTitleGenerator = createAgent({
  name: "fragment-title-generator",
  description: "A fragment title generator",
  system: FRAGMENT_TITLE_PROMPT,
  model: anthropic({
    model: "claude-3-5-haiku-latest",
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
    model: "claude-3-5-haiku-latest",
    defaultParameters: {
      max_tokens: 4096,
      temperature: 0.5,
    },
  }),
});
```

## The Frontend: Real-Time Code Visualization

Now let's talk about the user experience. How do users see what the AI is building? We've created a sophisticated code viewer that displays the generated code in real-time.

### The Code View Component

```
import Prism from "prismjs";
import { useEffect, useRef } from "react";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";
import "./code-theme.css";

interface Props {
  code: string;
  lang: string;
}

export const CodeView = ({ code, lang }: Props) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, lang]);

  return (
    <pre className="p-2 bg-transparent border-none rounded-none m-0 text-xs">
      <code ref={codeRef} className={`language-${lang}`}>
        {code}
      </code>
    </pre>
  );
};
```

This component uses Prism.js for syntax highlighting and automatically re-highlights when the code or language changes. The beauty is in its simplicity—it's just a wrapper around Prism.js that handles the React lifecycle properly.

### Custom Syntax Themes

We've created a custom theme that works in both light and dark modes:

```
/* Light mode tokens */
.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol {
  color: #005cc5;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin {
  color: #032f62;
}

/* Dark mode overrides */
.dark .token.property,
.dark .token.tag,
.dark .token.boolean,
.dark .token.number,
.dark .token.constant,
.dark .token.symbol,
.dark .token.deleted {
  color: #79b8ff;
}

.dark .token.selector,
.dark .token.attr-name,
.dark .token.string,
.dark .token.char,
.dark .token.builtin,
.dark .token.inserted {
  color: #9ecbff;
}
```

The theme provides excellent contrast and readability in both modes, making code easy to read regardless of the user's preference.

## The Prompt Engineering: Teaching AI to Build Real Apps

One of the most critical aspects of our system is the prompt engineering. We've spent countless hours refining prompts that teach the AI not just to generate code, but to generate _working_ code.

### The Main System Prompt

```
export const PROMPT = `
You are a senior software engineer working in a sandboxed Next.js 15.3.3 environment.

Environment:
- Writable file system via createOrUpdateFiles
- Command execution via terminal (use "npm install <package> --yes")
- Read files via readFiles
- Do not modify package.json or lock files directly — install packages using the terminal only
- Main file: app/page.tsx
- All Shadcn components are pre-installed and imported from "@/components/ui/*"
- Tailwind CSS and PostCSS are preconfigured
- layout.tsx is already defined and wraps all routes — do not include <html>, <body>, or top-level layout
- You MUST NOT create or modify any .css, .scss, or .sass files — styling must be done strictly using Tailwind CSS classes

File Safety Rules:
- ALWAYS add "use client" to the TOP, THE FIRST LINE of app/page.tsx and any other relevant files which use browser APIs or react hooks
- When creating multiple files that import each other, try to create them in a single createOrUpdateFiles call to avoid import validation errors

Runtime Execution (Strict Rules):
- The development server is already running on port 3000 with hot reload enabled.
- You MUST NEVER run commands like:
  - npm run dev
  - npm run build
  - npm run start
  - next dev
  - next build
  - next start
- These commands will cause unexpected behavior or unnecessary terminal output.
- Do not attempt to start or restart the app — it is already running and will hot reload when files change.

Instructions:
1. Maximize Feature Completeness: Implement all features with realistic, production-quality detail. Avoid placeholders or simplistic stubs. Every component or page should be fully functional and polished.
2. Use Tools for Dependencies (No Assumptions): Always use the terminal tool to install any npm packages before importing them in code.
3. Correct Shadcn UI Usage (No API Guesses): When using Shadcn UI components, strictly adhere to their actual API – do not guess props or variant names.
`;
```

The key insights in this prompt are:

1. **Specificity**: We tell the AI exactly what environment it's working in
2. **Constraints**: We explicitly forbid certain actions that could break the system
3. **Tools**: We clearly explain what tools are available and how to use them
4. **Quality**: We emphasize production-quality, not just working code

## The Challenges We Solved

### 1. Import Validation

One of the trickiest problems was ensuring that when the AI creates multiple files that import each other, the imports are valid. Our solution:

```
// Check for relative imports and validate they exist
const relativeImportRegex = /import\s+.*\s+from\s+['"](\.\/[^'"]+)['"]/g;
const matches = file.content.match(relativeImportRegex);

if (matches) {
  for (const match of matches) {
    const importPath = match.match(/['"](\.\/[^'"]+)['"]/)?.[1];
    if (importPath) {
      // Try multiple possible extensions
      const possibleExtensions = [".tsx", ".ts", ".jsx", ".js", ""];
      const basePath = file.path.replace(/\/[^\/]+$/, "") + importPath.replace("./", "/");

      const exists = possibleExtensions.some((ext) => {
        const fullPath = basePath + ext;
        return (
          parsedFiles.some((f) => f.path === fullPath) ||
          Object.keys(updatedFiles).some((path) => path === fullPath)
        );
      });

      if (!exists) {
        console.warn(`Warning: ${file.path} imports ${importPath} but file may not exist yet. This is allowed for files created in the same batch.`);
      }
    }
  }
}
```

This validation ensures that imports are valid while allowing the AI to create multiple files in a single batch.

### 2. State Management Across Agents

We use a shared state object that persists across all agent interactions:

```
const state = createState<AgentState>(
  {
    summary: "",
    files: {},
  },
  { messages: previousMessages }
);
```

This state object tracks:

- **Summary**: What the AI has accomplished
- **Files**: All generated files and their contents
- **Messages**: The conversation history for context

### 3. Error Handling and Recovery

Our system is designed to be resilient. If any step fails, the entire process can be retried:

```
const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;

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
```

## The User Experience: From Prompt to Live Website

Here's what happens when a user requests a website:

1. **User Input**: User describes what they want (e.g., "A landing page for a SaaS company")
2. **Event Trigger**: The request triggers an Inngest event
3. **Sandbox Creation**: A new, isolated sandbox environment is created
4. **AI Generation**: The AI agent network generates the website code
5. **File Creation**: Files are created in the sandbox
6. **Package Installation**: Dependencies are installed via terminal
7. **Live Preview**: The website becomes available at a unique URL
8. **User Feedback**: User can interact with the live website and request changes

## Performance and Scalability

### Timeout Management

We've implemented intelligent timeout management:

```
export const SANDBOX_TIMEOUT = 300000; // 5 minutes
```

This ensures that runaway AI processes don't consume resources indefinitely.

### Iteration Limits

```
const network = createNetwork<AgentState>({
  name: "coding-agent-network",
  agents: [codeAgent],
  maxIter: 15, // Maximum 15 iterations
  defaultState: state,
  // ... rest of config
});
```

We limit the AI to 15 iterations to prevent infinite loops while allowing complex multi-step generation.

## The Future: What's Next?

As we continue to develop this system, we're exploring:

1. **Multi-language Support**: Beyond Next.js, we want to support React, Vue, and vanilla JavaScript
2. **Database Integration**: Allowing AI to create full-stack applications with databases
3. **Deployment Integration**: One-click deployment to Vercel, Netlify, or other platforms
4. **Collaborative Editing**: Multiple users working on the same AI-generated project
5. **Version Control**: Git integration for AI-generated projects

## Lessons Learned

### 1. AI Agents Need Clear Boundaries

The more specific and constrained the AI's environment, the better the results. Vague instructions lead to unpredictable behavior.

### 2. Tool Integration is Critical

Giving AI access to real tools (terminal, file system, package manager) produces much better results than simulated environments.

### 3. State Management is Everything

Maintaining context across multiple AI agents and processing steps requires careful state design.

### 4. Error Handling is Non-Negotiable

In a system where AI generates code, robust error handling and recovery mechanisms are essential.

### 5. User Experience Trumps Technical Complexity

No matter how sophisticated the backend, the user experience must be simple and intuitive.

## Conclusion

Building an AI website generator isn't just about stringing together some APIs—it's about creating a system that can reliably generate working, production-quality web applications. The combination of:

- **AI agents** with specialized tools
- **Sandboxed execution environments**
- **Background processing** with Inngest
- **Real-time code visualization**
- **Careful prompt engineering**

Creates a system that feels like magic to users while being robust and maintainable for developers.

The future of web development isn't just AI-assisted coding—it's AI-generated applications that users can describe in natural language and see come to life in real-time. We're building that future, one website at a time.

---

_What would you build if you could describe it to an AI and watch it materialize? The possibilities are endless, and we're just getting started._

_Follow our journey as we continue to push the boundaries of what's possible with AI-powered development at [Vibe](https://vibe.dev)._
