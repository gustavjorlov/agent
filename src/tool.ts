import { z } from "zod";

export interface Tool<InputSchema extends z.ZodTypeAny = any> {
  name: string;
  description: string;
  schema: InputSchema;
  execute: (input: z.infer<InputSchema>) => Promise<string> | string;
}
