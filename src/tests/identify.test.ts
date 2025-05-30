/*Testing identify and all dbOperations, this is fo rtesting as it will reset datbase 
after each iteration and indexing will still grow.
Suggested to go with postman collection "identify_postman_collection.json"  */
import { Application } from 'express';
import express from 'express';
import request from 'supertest';
import { PrismaClient, Contact as PrismaContact } from '../generated/prisma';
import { identifyRouter } from '../routes/identify';

// Initialize Express app
const app: Application = express();
app.use(express.json());
app.use('/identify', identifyRouter);

// Initialize Prisma Client
const prisma = new PrismaClient();

describe('POST /identify', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.contact.deleteMany({
      where: {
        OR: [
          { email: { contains: 'hillvalley.edu', mode: 'insensitive' } },
          { phoneNumber: { in: ['123456', '717171', '919191'] } },
        ],
      },
    });
    // Wait to ensure cleanup is complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should create a new primary contact', async () => {
    const response = await request(app)
      .post('/identify')
      .set('Content-Type', 'application/json')
      .send({
        email: 'lorraine@hillvalley.edu',
        phoneNumber: '123456',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      contact: {
        primaryContatctId: expect.any(Number),
        emails: ['lorraine@hillvalley.edu'],
        phoneNumbers: ['123456'],
        secondaryContactIds: [],
      },
    });
  });

  test('should return existing contact for matching email', async () => {
    // Create primary contact
    const primary = await prisma.contact.create({
      data: {
        email: 'lorraine@hillvalley.edu',
        phoneNumber: '123456',
        linkPrecedence: 'primary',
      },
    });

    // Wait to ensure contact is persisted
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await request(app)
      .post('/identify')
      .set('Content-Type', 'application/json')
      .send({
        email: 'lorraine@hillvalley.edu',
        phoneNumber: null,
      });

    expect(response.status).toBe(200);
    expect(response.body.contact).toMatchObject({
      primaryContatctId: primary.id,
      emails: ['lorraine@hillvalley.edu'],
      phoneNumbers: ['123456'],
    });
  });

  test('should create a secondary contact for new email with same phoneNumber', async () => {
    // Create primary contact
    const primary = await prisma.contact.create({
      data: {
        email: 'lorraine@hillvalley.edu',
        phoneNumber: '123456',
        linkPrecedence: 'primary',
      },
    });

    const response = await request(app)
      .post('/identify')
      .set('Content-Type', 'application/json')
      .send({
        email: 'mcfly@hillvalley.edu',
        phoneNumber: '123456',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      contact: {
        primaryContatctId: primary.id,
        emails: ['lorraine@hillvalley.edu', 'mcfly@hillvalley.edu'],
        phoneNumbers: ['123456'],
        secondaryContactIds: [expect.any(Number)],
      },
    });
  });

  test('should handle duplicate contact without creating new', async () => {
    // Create primary and secondary contacts
    const primary = await prisma.contact.create({
      data: {
        email: 'lorraine@hillvalley.edu',
        phoneNumber: '123456',
        linkPrecedence: 'primary',
      },
    });
    const secondary = await prisma.contact.create({
      data: {
        email: 'mcfly@hillvalley.edu',
        phoneNumber: '123456',
        linkPrecedence: 'secondary',
        linkedId: primary.id,
      },
    });

    const response = await request(app)
      .post('/identify')
      .set('Content-Type', 'application/json')
      .send({
        email: 'mcfly@hillvalley.edu',
        phoneNumber: '123456',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      contact: {
        primaryContatctId: primary.id,
        emails: ['lorraine@hillvalley.edu', 'mcfly@hillvalley.edu'],
        phoneNumbers: ['123456'],
        secondaryContactIds: [secondary.id],
      },
    });
  });

  test('should merge two primary contacts', async () => {
    // Create two primary contacts
    const primary1 = await prisma.contact.create({
      data: {
        email: 'george@hillvalley.edu',
        phoneNumber: '919191',
        linkPrecedence: 'primary',
        createdAt: new Date('2023-04-11'),
      },
    });
    const primary2 = await prisma.contact.create({
      data: {
        email: 'biffsucks@hillvalley.edu',
        phoneNumber: '717171',
        linkPrecedence: 'primary',
        createdAt: new Date('2023-04-20'),
      },
    });

    const response = await request(app)
      .post('/identify')
      .set('Content-Type', 'application/json')
      .send({
        email: 'george@hillvalley.edu',
        phoneNumber: '717171',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      contact: {
        primaryContatctId: primary1.id,
        emails: ['george@hillvalley.edu', 'biffsucks@hillvalley.edu'],
        phoneNumbers: ['919191', '717171'],
        secondaryContactIds: [primary2.id, expect.any(Number)],
      },
    });
  });

  test('should return 400 for invalid input', async () => {
    const response = await request(app)
      .post('/identify')
      .set('Content-Type', 'application/json')
      .send({
        email: null,
        phoneNumber: null,
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid input');
    expect(response.body.details).toBeTruthy();
  });
});