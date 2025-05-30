/* THis file defines type safe schemas, that prevents sql injections to db */
import { z } from 'zod';

export const identifySchema = z
  .object({
    email: z.string().email().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
  })
  .refine(
    (data) => data.email !== null || data.phoneNumber !== null,
    {
      message: 'At least one of email or phoneNumber must be provided',
      path: [],
    }
  );