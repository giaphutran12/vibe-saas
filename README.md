# Vibe - AI-Powered Code Generation Platform

A web app that enables users to build complete applications and websites through natural language conversations with AI. Built with modern web technologies and featuring a sandboxed development environment for safe, isolated code execution.

## 🚀 Key Features

### AI-Powered Code Generation

- **Conversational Interface**: Build applications by describing requirements in natural language
- **Multi-Agent Architecture**: Sophisticated AI agent system with specialized roles for code generation, title creation, and response formatting
- **Context-Aware Development**: AI maintains conversation history and project context across sessions
- **Production-Ready Output**: Generates complete, functional applications with proper TypeScript, React, and Tailwind CSS
  What, you really believe that? AI? Generating production-ready code? Take your meds.

### Sandboxed Development Environment

- **Isolated Execution**: E2B Code Interpreter provides secure, containerized development environments
- **Real-time Preview**: Live application preview with hot reload capabilities
- **File System Management**: Full file creation, modification, and deletion capabilities
- **Package Installation**: Automated npm package management within sandboxed environments

### Advanced Architecture

- **Modular Design**: Feature-based module organization with clear separation of concerns
- **Rate Limiting**: Intelligent usage tracking with flexible point-based system
- **Error Handling**: Comprehensive error boundaries and graceful degradation
- **Real-time Updates**: Optimistic UI updates with React Query integration

## 🛠 Technology Stack

### Frontend

- **React 19**: Latest React with concurrent features
- **Next.js 15.3.4**: Full-stack React framework
- **TypeScript 5**: Static type checking
- **Tailwind CSS 4**: Utility-first CSS framework
- **Shadcn/ui**: Component library with 40+ components
- **Lucide React**: Icon library
- **React Hook Form**: Form management with validation
- **Zod**: Schema validation

### Backend

- **tRPC**: End-to-end type-safe API layer, combined with safe querying using _TanStack Query_
- **Prisma**: Typesafe database ORM with PostgreSQL (Neon)
- **Inngest**: Background job processing
- **Clerk**: Authentication, billing and user management
- **Rate Limiter Flexible**: Usage tracking and rate limiting

### AI & Development

- **E2B Code Interpreter**: Sandboxed development environments
- **Anthropic Claude 3.5 Sonnet**: AI model for code generation
- **Inngest Agent Kit**: Multi-agent orchestration framework

### Infrastructure

- **PostgreSQL**: Primary database
- **Vercel**: Deployment platform
- **TypeScript**: Full-stack type safety

## Database Schema

```sql
-- Projects: User-created development projects
-- Messages: Conversation history with AI
-- Fragments: Generated code artifacts with sandbox URLs
-- Usage: Rate limiting and usage tracking
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Clerk account for authentication
- E2B account for sandbox environments
- Anthropic API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/vibe.git
   cd vibe
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Configure the following variables:

   ```env
   DATABASE_URL="postgresql://..."
   CLERK_SECRET_KEY="sk_..."
   CLERK_PUBLISHABLE_KEY="pk_..."
   ANTHROPIC_API_KEY="sk-ant-..."
   E2B_API_KEY="..."
   INNGEST_EVENT_KEY="..."
   INNGEST_SIGNING_KEY="..."
   ```

4. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Run Inngest dev server**

```bash
npx inngest-cli@latest dev
```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) and [http://localhost:8288](http://localhost:8288)

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (home)/            # Landing page and pricing
│   ├── projects/          # Project management
│   └── api/               # API routes
├── components/            # Reusable UI components
│   └── ui/               # Shadcn/ui components (40+)
├── modules/              # Feature-based modules
│   ├── home/             # Landing page features
│   ├── projects/         # Project management
│   ├── messages/         # AI conversation handling
│   └── usage/            # Rate limiting and usage
├── inngest/              # Background job processing
├── trpc/                 # Type-safe API layer
├── lib/                  # Utility functions
└── generated/            # Generated Prisma client
```

## 🔧 Configuration

### Rate Limiting

- **Free Tier**: 2 generations per 30 days
- **Pro Tier**: 100 generations per 30 days
- **Configurable**: Easy adjustment of limits and durations

### AI Model Configuration

- **Model**: Claude 3.5 Haiku
- **Max Tokens**: 4096
- **Temperature**: 0.5
- **Timeout**: Configurable sandbox timeout

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables

Ensure all required environment variables are configured in your deployment platform.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Shoutout to Code With Antonio for helping me with this project
