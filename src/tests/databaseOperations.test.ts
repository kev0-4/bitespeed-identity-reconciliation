/*Basic Jest test cases,
to validate all utils works before implementing them in route */
import { PrismaClient, Contact as PrismaContact, LinkPrecedence } from '../generated/prisma';
import {
  findMatchingContacts,
  createPrimaryContact,
  createSecondaryContact,
  mergePrimaryContacts,
  buildConsolidatedContact,
} from '../utils/databaseOperations';

// Initialize Prisma Client
const prisma = new PrismaClient();

describe('Database Operations', () => {
  let testPrimaryContact: PrismaContact;
  let testSecondaryContact: PrismaContact;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.contact.deleteMany({
      where: {
        OR: [
          { email: { in: ['test1@hillvalley.edu', 'test2@hillvalley.edu'] } },
          { phoneNumber: { in: ['123456', '789012'] } },
        ],
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('findMatchingContacts should find contacts by email or phoneNumber', async () => {
    // Create test contact
    testPrimaryContact = await prisma.contact.create({
      data: {
        email: 'test1@hillvalley.edu',
        phoneNumber: '123456',
        linkPrecedence: LinkPrecedence.primary,
      },
    });

    const contacts = await findMatchingContacts('test1@hillvalley.edu', null);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].email).toBe('test1@hillvalley.edu');

    const contactsByPhone = await findMatchingContacts(null, '123456');
    expect(contactsByPhone).toHaveLength(1);
    expect(contactsByPhone[0].phoneNumber).toBe('123456');
  });

  test('createPrimaryContact should create a new primary contact', async () => {
    const contact = await createPrimaryContact('test2@hillvalley.edu', '789012');
    expect(contact).toHaveProperty('id');
    expect(contact.linkPrecedence).toBe(LinkPrecedence.primary);
    expect(contact.email).toBe('test2@hillvalley.edu');
    expect(contact.phoneNumber).toBe('789012');
    expect(contact.linkedId).toBeNull();
  });

  test('createSecondaryContact should create a secondary contact linked to primary', async () => {
    const secondary = await createSecondaryContact('test2@hillvalley.edu', '123456', testPrimaryContact.id);
    expect(secondary.linkPrecedence).toBe(LinkPrecedence.secondary);
    expect(secondary.linkedId).toBe(testPrimaryContact.id);
    expect(secondary.email).toBe('test2@hillvalley.edu');
    expect(secondary.phoneNumber).toBe('123456');
  });

  test('mergePrimaryContacts should link newer primary to older primary', async () => {
    const newerPrimary = await prisma.contact.create({
      data: {
        email: 'test2@hillvalley.edu',
        phoneNumber: '789012',
        linkPrecedence: LinkPrecedence.primary,
      },
    });

    await mergePrimaryContacts(newerPrimary.id, testPrimaryContact.id);

    const updatedContact = await prisma.contact.findUnique({
      where: { id: newerPrimary.id },
    });
    expect(updatedContact?.linkPrecedence).toBe(LinkPrecedence.secondary);
    expect(updatedContact?.linkedId).toBe(testPrimaryContact.id);
  });

  test('buildConsolidatedContact should return consolidated contact data', async () => {
    // Create additional secondary contact
    testSecondaryContact = await prisma.contact.create({
      data: {
        email: 'test2@hillvalley.edu',
        phoneNumber: '123456',
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: testPrimaryContact.id,
      },
    });

    const result = await buildConsolidatedContact(testPrimaryContact.id);
    expect(result.primaryContatctId).toBe(testPrimaryContact.id);
    expect(result.emails).toContain('test1@hillvalley.edu');
    expect(result.emails).toContain('test2@hillvalley.edu');
    expect(result.phoneNumbers).toContain('123456');
    expect(result.secondaryContactIds).toContain(testSecondaryContact.id);
  });
});