// Creted initially to test connection with prisma db
import { PrismaClient } from "./generated/prisma";

const prisma = new PrismaClient();

async function testDbConnection() {
  try {
    await prisma.$connect();
    console.log("Successfully connected to the database!");

    const contactCount = await prisma.contact.count();
    console.log(`Found ${contactCount} contacts in the database.`);
  } catch (error) {
    console.error("Failed to connect to the database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDbConnection();
