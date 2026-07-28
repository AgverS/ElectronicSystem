/**
 * In the demo build `prisma` is the in-browser demo database. Data-access code
 * written against Prisma keeps working; each visitor gets their own private
 * copy of the dataset.
 */
export { db as prisma, resetDemoData, onDemoDataChange } from "./demo-db/client";
