/*Basic Jest test cases,
to validate all utils works before implementing them in route */
import {
  PrismaClient,
  Contact as PrismaContact,
  LinkPrecedence,
} from "@prisma/client";
import {
  findMatchingContacts,
  createPrimaryContact,
  createSecondaryContact,
  mergePrimaryContacts,
  buildConsolidatedContact,
} from "../utils/databaseOperations";

const prisma = new PrismaClient();

describe("Database Operations", () => {
  let testPrimaryContact: PrismaContact;
  let testSecondaryContact: PrismaContact;

  beforeEach(async () => {
    await prisma.contact.deleteMany({
      where: {
        OR: [
          { email: { contains: "hillvalley.edu", mode: "insensitive" } },
          { phoneNumber: { in: ["123456", "789012"] } },
        ],
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("findMatchingContacts should find contacts by email or phoneNumber", async () => {
    testPrimaryContact = await prisma.contact.create({
      data: {
        email: "test1@hillvalley.edu",
        phoneNumber: "123456",
        linkPrecedence: LinkPrecedence.primary,
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const contacts = await findMatchingContacts("test1@hillvalley.edu", null);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].email).toBe("test1@hillvalley.edu");

    const contactsByPhone = await findMatchingContacts(null, "123456");
    expect(contactsByPhone).toHaveLength(1);
    expect(contactsByPhone[0].phoneNumber).toBe("123456");
  });

  test("createPrimaryContact should create a new primary contact", async () => {
    const contact = await createPrimaryContact(
      "test2@hillvalley.edu",
      "789012"
    );
    expect(contact).toHaveProperty("id");
    expect(contact.linkPrecedence).toBe(LinkPrecedence.primary);
    expect(contact.email).toBe("test2@hillvalley.edu");
    expect(contact.phoneNumber).toBe("789012");
    expect(contact.linkedId).toBe(null);
  });

  test("createSecondaryContact should create a secondary contact linked to a contact with primaryContatctId", async () => {
    testPrimaryContact = await createPrimaryContact(
      "test1@hillvalley.edu",
      "123456"
    );
    const secondaryContact = await createSecondaryContact(
      "test2@hillvalley.edu.au",
      "1234567",
      testPrimaryContact.id
    );
    expect(secondaryContact.linkPrecedence).toBe(LinkPrecedence.secondary);
    expect(secondaryContact.linkedId).toBe(testPrimaryContact.id);
    expect(secondaryContact.email).toBe("test2@hillvalley.edu.au");
    expect(secondaryContact.phoneNumber).toBe("1234567");
  });

  test("mergePrimaryContacts should link newer primary to older primary", async () => {
    const primary1 = await prisma.contact.create({
      data: {
        email: "test1@hillvalley.edu",
        phoneNumber: "123456",
        linkPrecedence: "primary",
        createdAt: new Date("2023-04-01"),
      },
    });

    const newerPrimary = await prisma.contact.create({
      data: {
        email: "test2@hillvalley.edu",
        phoneNumber: "789012",
        linkPrecedence: "primary",
        createdAt: new Date("2023-04-20"),
      },
    });

    await mergePrimaryContacts(newerPrimary.id, primary1.id);

    const updatedContact = await prisma.contact.findUnique({
      where: { id: newerPrimary.id },
    });
    expect(updatedContact?.linkPrecedence).toBe(LinkPrecedence.secondary);
    expect(updatedContact?.linkedId).toBe(primary1.id);
  });

  test("buildConsolidatedContact should return consolidated contact data", async () => {
    testPrimaryContact = await prisma.contact.create({
      data: {
        email: "test1@hillvalley.edu",
        phoneNumber: "123456",
        linkPrecedence: LinkPrecedence.primary,
      },
    });

    testSecondaryContact = await prisma.contact.create({
      data: {
        email: "test2@hillvalley.edu",
        phoneNumber: "123456",
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: testPrimaryContact.id,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await buildConsolidatedContact(testPrimaryContact.id);
    expect(result.primaryContatctId).toBe(testPrimaryContact.id);
    expect(result.emails).toContain("test1@hillvalley.edu");
    expect(result.emails).toContain("test2@hillvalley.edu");
    expect(result.phoneNumbers).toContain("123456");
    expect(result.secondaryContactIds).toContain(testSecondaryContact.id);
  });
});
