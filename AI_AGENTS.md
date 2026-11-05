# My Work Chat AI Assistants

This document describes the AI assistants available to users in My Work Chat. It is intended for recruiters, reviewers, and developers evaluating the product. These are prompt-guided assistants; they do not use autonomous tools or take actions on a user's behalf.

## Product assistants

| Assistant | Purpose | Guardrails |
| --- | --- | --- |
| Code Mentor (`coder`) | Explains programming concepts, debugging steps, and small implementation examples. | Does not invent project files or unseen context. Requests relevant code or errors when needed. |
| Learning Navigator (`study`) | Breaks down academic or professional topics, creates study plans, and checks understanding. | Adapts to the user's stated level and timeline. Supports independent learning instead of completing work without explanation. |
| Writing Assistant (`writer`) | Improves clarity, structure, tone, and correctness in professional, academic, and personal writing. | Preserves the author's intent and voice. Does not fabricate personal facts or achievements. |
| Career Navigator (`career`) | Supports interview preparation, job-description analysis, and practical skill planning. | Uses only experience the user has shared. Does not promise employment or invent company information. |
| Profile Editor (`profile`) | Produces a concise profile bio from facts explicitly supplied by the user. | Limited to 500 characters. Does not add unsupported education, skills, experience, achievements, goals, or availability. Returns a draft for review; it never saves the profile itself. |
| Reply Assistant (`reply`) | Drafts one concise reply based on a conversation excerpt. | Does not invent facts or commitments and never sends the draft for the user. |
| Chat Secretary (`summary`) | Extracts key topics, explicit decisions, and stated action items from a conversation excerpt. | Does not invent owners, dates, decisions, or commitments. |

## Response standards

- Internal role definitions and operating instructions are maintained in English in `server/src/services/GrokService.js`.
- The default response language is Russian to match the product interface. An assistant switches languages when the user explicitly requests it.
- Assistants should be concise, factual, respectful, and clear about uncertainty.
- User-facing profile, reply, and summary content is always a draft. The user reviews it before saving or sending.
- Assistants must not present medical, legal, or investment guidance as professional advice, or facilitate dangerous, illegal, or harmful activity.

## Request and data flow

1. The client sends the selected assistant ID and message to `POST /api/ai/chat` through the authenticated API client.
2. The Express API validates the request, applies the per-user daily limit, and selects the corresponding server-side prompt.
3. The server calls the configured Grok-compatible provider. The API key is held by the server and is never sent to the browser.
4. The response returns to the client. Profile drafts are inserted into the editable bio field only after a successful response; the user must explicitly save the profile.

The reply and summary assistants may receive a limited excerpt of the active chat supplied by the client. Profile generation receives the name and facts entered in its profile form. The server caps the optional context excerpt at 3,000 characters and the user message at 1,500 characters.

## Implementation map

- Assistant names and user-facing descriptions: `client/src/shared/lib/aiAgents.ts`
- Profile draft flow: `client/src/app/profile/page.tsx`
- AI request client: `client/src/shared/lib/botAiApi.ts`
- Authenticated AI route and validation: `server/src/routes/aiRoute.js`, `server/src/controllers/AiController.js`
- Prompts, provider configuration, timeout handling, and model calls: `server/src/services/GrokService.js`

## Operational note

AI generation depends on the availability and response time of the configured provider and the server's outbound connection. A provider timeout is returned to the client as an error; it is not treated as a successful draft. Production diagnostics should be taken from the API service logs without exposing API keys or user chat content.
