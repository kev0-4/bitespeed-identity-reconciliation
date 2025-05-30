/*
THis file provides utils for database operations 
findMatchingCOntacts does by email OR phoneNumber matching
createPrimaryContact in case of new user makes a new user
createSecondaryContact craetes a linked contact linked based on email/phone
mergePrimaryContacts in case of 2 primary, merges with oldest createdAT
buildConsolidatedContact builds a backtracked response json
*/
import { PrismaClient, Contact, LinkPrecedence } from '@prisma/client'

const prisma = new PrismaClient()

interface ConsolidatedContact {
  primaryContatctId: number
  emails: string[]
  phoneNumbers: string[]
  secondaryContactIds: number[]
}

async function findMatchingContacts(email: string | null, phoneNumber: string | null): Promise<Contact[]> {
  if (!email && !phoneNumber) throw new Error('At least one of email or phoneNumber must be provided')
  const conditions: any[] = []
  if (email) conditions.push({ email: { equals: email, mode: 'insensitive' } })
  if (phoneNumber) conditions.push({ phoneNumber })
  return await prisma.contact.findMany({ where: { OR: conditions, deletedAt: null } })
}

async function createPrimaryContact(email: string | null, phoneNumber: string | null): Promise<Contact> {
  return await prisma.contact.create({ data: { email, phoneNumber, linkPrecedence: 'primary' } })
}

async function createSecondaryContact(email: string | null, phoneNumber: string | null, primaryId: number): Promise<Contact> {
  return await prisma.contact.create({ data: { email, phoneNumber, linkPrecedence: 'secondary', linkedId: primaryId } })
}

async function mergePrimaryContacts(newerContactId: number, olderPrimaryId: number): Promise<void> {
  await prisma.contact.update({
    where: { id: newerContactId },
    data: { linkPrecedence: 'secondary', linkedId: olderPrimaryId, updatedAt: new Date() },
  })
  await prisma.contact.updateMany({
    where: { linkedId: newerContactId, deletedAt: null },
    data: { linkedId: olderPrimaryId, updatedAt: new Date() },
  })
}

async function buildConsolidatedContact(primaryId: number): Promise<ConsolidatedContact> {
  const contacts = await prisma.contact.findMany({
    where: { OR: [{ id: primaryId }, { linkedId: primaryId }], deletedAt: null },
  })
  const primaryContact = contacts.find((c) => c.id === primaryId)
  if (!primaryContact) throw new Error('Primary contact not found')

  const emails = Array.from(new Set(contacts.map((c) => c.email?.toLowerCase()).filter((e): e is string => !!e)))
  const phoneNumbers = Array.from(new Set(contacts.map((c) => c.phoneNumber).filter((p): p is string => !!p)))
  const secondaryContactIds = contacts.filter((c) => c.linkPrecedence === 'secondary').map((c) => c.id)

  if (primaryContact.email) {
    const emailIndex = emails.indexOf(primaryContact.email.toLowerCase())
    if (emailIndex > 0) {
      emails.splice(emailIndex, 1)
      emails.unshift(primaryContact.email.toLowerCase())
    }
  }
  if (primaryContact.phoneNumber) {
    const phoneIndex = phoneNumbers.indexOf(primaryContact.phoneNumber)
    if (phoneIndex > 0) {
      phoneNumbers.splice(phoneIndex, 1)
      phoneNumbers.unshift(primaryContact.phoneNumber)
    }
  }

  return { primaryContatctId: primaryId, emails, phoneNumbers, secondaryContactIds }
}

export {
  findMatchingContacts,
  createPrimaryContact,
  createSecondaryContact,
  mergePrimaryContacts,
  buildConsolidatedContact,
}
