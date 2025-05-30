import { Router, Request, Response } from "express";
import { identifySchema } from "../validation/zodSchemas";
import { z } from 'zod';
export const identifyRouter = Router();

identifyRouter.post('/', (req: Request, res: Response) => {
  try {
    const validatedData = identifySchema.parse(req.body);
    res.status(200).json({
      message: 'Input validated successfully',
      contact: {
        email: validatedData.email,
        phoneNumber: validatedData.phoneNumber,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid input',
        //@ts-ignore
        details: error.errors,
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});