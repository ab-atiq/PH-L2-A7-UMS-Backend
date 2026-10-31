import z from "zod";

export const AssistantChatValidation = z.object({
  message: z.string().trim().min(2).max(500),
});
