import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: ".env" });
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not set");
        process.exit(1);
    }

    const { member, organization, organizationRole } = await import("./src/db/schema");
    const { eq, sql } = await import("drizzle-orm");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema: { member, organization, organizationRole } });

    const orgSlug = "better-auth"; // Replace with actual slug if known, or fetch one
    // ... rest of logic unchanged until imports usage

    // Fetch an organization to test with
    const org = await db.query.organization.findFirst({
        where: eq(organization.id, "joZI3u8M55UVIEmNtChS0") // Specific ID from user request
    });

    if (!org) {
        console.error("Organization not found");
        process.exit(1);
    }

    console.log(`Testing with Organization: ${org.name} (${org.id})`);

    // Run the aggregation query
    const memberCounts = await db
        .select({
            role: member.role,
            count: sql<number>`count(*)`.as("count"),
        })
        .from(member)
        .where(eq(member.organizationId, org.id))
        .groupBy(member.role);

    console.log("Member Counts by Role:");
    memberCounts.forEach(row => {
        console.log(`- ${row.role}: ${row.count}`);
    });

    // Also fetch raw members to manually verify
    const members = await db
        .select({ role: member.role })
        .from(member)
        .where(eq(member.organizationId, org.id));

    const manualCounts = members.reduce((acc, curr) => {
        acc[curr.role] = (acc[curr.role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log("\nManual Verification:");
    Object.entries(manualCounts).forEach(([role, count]) => {
        console.log(`- ${role}: ${count}`);
    });
}

main().catch(console.error).finally(() => process.exit(0));
