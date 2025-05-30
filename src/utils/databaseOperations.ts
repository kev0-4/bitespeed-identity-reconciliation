/*
THis file provides utils for database operations 
findMatchingCOntacts does by email OR phoneNumber matching
createPrimaryContact in case of new user makes a new user
createSecondaryContact craetes a linked contact linked based on email/phone
mergePrimaryContacts in case of 2 primary, merges with oldest createdAT
buildConsolidatedContact builds a backtracked response json
*/
import {
  PrismaClient,
  Contact as PrismaContact,
  LinkPrecedence,
} from  "@prisma/client";
const prisma = new PrismaClient();

interface ConsolidatedContact {
  primaryContatctId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

async function findMatchingContacts(
  email: string | null,
  phoneNumber: string | null
): Promise<PrismaContact[]> {
  try {
    console.log("Finding matching contacts");
    if (!email && !phoneNumber) {
      throw new Error("At least one of email or phoneNumber must be provided");
    }

    const conditions: any[] = [];
    if (email) {
      conditions.push({ email: { equals: email, mode: "insensitive" } });
    }
    if (phoneNumber) {
      conditions.push({ phoneNumber });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        OR: conditions,
        deletedAt: null,
      },
    });

    return contacts;
  } catch (error) {
    console.error("Error finding matching contacts:", error);
    throw new Error(
      `Failed to find matching contacts: ${(error as Error).message}`
    );
  }
}

async function createPrimaryContact(
  email: string | null,
  phoneNumber: string | null
): Promise<PrismaContact> {
  try {
    console.log("Creating primary contact");
    const contact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.primary,
      },
    });
    return contact;
  } catch (error) {
    console.error("Error creating primary contact:", error);
    throw new Error(
      `Failed to create primary contact: ${(error as Error).message}`
    );
  }
}

async function createSecondaryContact(
  email: string | null,
  phoneNumber: string | null,
  primaryId: number
): Promise<PrismaContact> {
  try {
    console.log("Creating secondary contact");
    const contact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: primaryId,
      },
    });
    return contact;
  } catch (error) {
    console.error("Error creating secondary contact:", error);
    throw new Error(
      `Failed to create secondary contact: ${(error as Error).message}`
    );
  }
}

async function mergePrimaryContacts(
  newerContactId: number,
  olderPrimaryId: number
): Promise<void> {
  try {
    console.log("Merging primary contacts");
    await prisma.contact.update({
      where: { id: newerContactId },
      data: {
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: olderPrimaryId,
        updatedAt: new Date(),
      },
    });

    await prisma.contact.updateMany({
      where: {
        linkedId: newerContactId,
        deletedAt: null,
      },
      data: {
        linkedId: olderPrimaryId,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error merging primary contacts:", error);
    throw new Error(
      `Failed to merge primary contacts: ${(error as Error).message}`
    );
  }
}

async function buildConsolidatedContact(
  primaryId: number
): Promise<ConsolidatedContact> {
  try {
    console.log("Building consolidated contact");
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [{ id: primaryId }, { linkedId: primaryId }],
        deletedAt: null,
      },
    });

    const primaryContact = contacts.find(
      (c: PrismaContact) => c.id === primaryId
    );
    if (!primaryContact) {
      throw new Error("Primary contact not found");
    }

    const emails = Array.from(
      new Set(
        contacts
          .map((c: PrismaContact) => c.email?.toLowerCase())
          .filter((e: string | undefined): e is string => !!e)
      )
    );
    const phoneNumbers = Array.from(
      new Set(
        contacts
          .map((c: PrismaContact) => c.phoneNumber)
          .filter((p: string | null): p is string => !!p)
      )
    );
    const secondaryContactIds = contacts
      .filter(
        (c: PrismaContact) => c.linkPrecedence === LinkPrecedence.secondary
      )
      .map((c: PrismaContact) => c.id);

    if (primaryContact.email) {
      const emailIndex = emails.indexOf(primaryContact.email.toLowerCase());
      if (emailIndex > 0) {
        emails.splice(emailIndex, 1);
        emails.unshift(primaryContact.email.toLowerCase());
      }
    }
    if (primaryContact.phoneNumber) {
      const phoneIndex = phoneNumbers.indexOf(primaryContact.phoneNumber);
      if (phoneIndex > 0) {
        phoneNumbers.splice(phoneIndex, 1);
        phoneNumbers.unshift(primaryContact.phoneNumber);
      }
    }

    return {
      primaryContatctId: primaryId,
      emails,
      phoneNumbers,
      secondaryContactIds,
    };
  } catch (error) {
    console.error("Error building consolidated contact:", error);
    throw new Error(
      `Failed to build consolidated contact: ${(error as Error).message}`
    );
  }
}

export {
  findMatchingContacts,
  createPrimaryContact,
  createSecondaryContact,
  mergePrimaryContacts,
  buildConsolidatedContact,
};
