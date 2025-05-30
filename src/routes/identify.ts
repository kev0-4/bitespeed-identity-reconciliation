//@ts-nocheck
import { Router, Request, Response } from "express";
import { z } from "zod";
import { identifySchema } from "../validation/zodSchemas";
import {
  findMatchingContacts,
  createPrimaryContact,
  createSecondaryContact,
  mergePrimaryContacts,
  buildConsolidatedContact,
} from "../utils/databaseOperations";
// import { LinkPrecedence } from "../generated/prisma";
import { LinkPrecedence } from "@prisma/client";
export const identifyRouter = Router();

identifyRouter.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = identifySchema.parse(req.body);
    const { email, phoneNumber } = validatedData;

    const matchingContacts = await findMatchingContacts(email, phoneNumber);

    if (matchingContacts.length === 0) {
      const newContact = await createPrimaryContact(email, phoneNumber);
      const response = await buildConsolidatedContact(newContact.id);
      return res.status(200).json({ contact: response });
    }

    let primaryContact = matchingContacts.reduce((oldest, current) =>
      oldest.createdAt < current.createdAt ? oldest : current
    );

    const primaryContacts = matchingContacts.filter(
      (c) => c.linkPrecedence === LinkPrecedence.primary && c.linkedId === null
    );

    if (primaryContacts.length > 1) {
      const sortedPrimaries = primaryContacts.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      primaryContact = sortedPrimaries[0];

      for (const otherPrimary of sortedPrimaries.slice(1)) {
        await mergePrimaryContacts(otherPrimary.id, primaryContact.id);
      }
    }

    const hasNewInfo = !matchingContacts.some(
      (c) =>
        (c.email?.toLowerCase() === email?.toLowerCase() ||
          (!c.email && !email)) &&
        (c.phoneNumber === phoneNumber || (!c.phoneNumber && !phoneNumber))
    );

    if (hasNewInfo) {
      await createSecondaryContact(email, phoneNumber, primaryContact.id);
    }

    const response = await buildConsolidatedContact(primaryContact.id);
    return res.status(200).json({ contact: response });
  } catch (error) {
    console.error("Error in /identify endpoint:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
        details: error.errors,
      });
    }
    return res.status(500).json({
      error: "Internal server error",
      message: (error as Error).message,
    });
  }
});
