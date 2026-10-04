import { Agent } from "@openai/agents";
import { z } from "zod";
import { aiConfig } from "../config/ai.js";

const emailOutput = z.object({
  subject: z
    .string()
    .min(1)
    .max(200),

  body: z
    .string()
    .min(1)
    .max(10000),
});

const emailGenerationAgent = new Agent({
  name: "OSCAR Email Writer",

  model: aiConfig.model,

  instructions: `
You are OSCAR's professional business outreach writer.

Create concise, personalized business emails using only the lead information and website intelligence provided.

Rules:

1. Never invent facts about the company or recipient.
2. Do not claim to have spoken with or researched the recipient beyond the supplied information.
3. Use website intelligence only when it is actually provided.
4. Keep the email professional and human.
5. Avoid generic mass-marketing language.
6. Do not make deceptive claims.
7. Do not include unsupported statistics.
8. Do not include unnecessary personal information.
9. Return only the requested structured email.
`,

  outputType: emailOutput,
});

export default emailGenerationAgent;