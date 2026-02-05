import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";

const result = config({ path: ".env.local" });
if (result.error || !process.env.DATABASE_URL) {
    console.log("Failed to load .env.local or DATABASE_URL missing, trying .env");
    config({ path: ".env" });
}

console.log("DATABASE_URL defined:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL starts with:", process.env.DATABASE_URL.substring(0, 10) + "...");
}

async function main() {
    // Import db after env is loaded
    const { db } = await import("./src/db");
    const { organization, member, organizationRole } = await import("./src/db/schema");
    console.log("Checking organization member counts...");

    const organizations = await db.select().from(organization);

    for (const org of organizations) {
        console.log(`Organization: ${org.name} (${org.id})`);

        const members = await db.select().from(member).where(eq(member.organizationId, org.id));
        console.log(`  Actual member rows: ${members.length}`);

        // Replicate logic from route.ts
        const orgWithCount = await db
            .select({
                name: organization.name,
                memberCount: sql<number>`(
                    SELECT COUNT(*) FROM ${member}
                    WHERE ${member.organizationId} = ${organization.id}
                )`.as("member_count"),
            })
            .from(organization)
            .where(eq(organization.id, org.id));

        console.log(`  Query result memberCount: ${orgWithCount[0]?.memberCount} (Type: ${typeof orgWithCount[0]?.memberCount})`);

        // Try JOIN approach (matches new API logic)
        const orgWithJoin = await db
            .select({
                name: organization.name,
                memberCount: sql<number>`count(distinct ${member.id})`,
                roleCount: sql<number>`count(distinct ${organizationRole.id}) + 3`,
            })
            .from(organization)
            .leftJoin(member, eq(organization.id, member.organizationId))
            .leftJoin(organizationRole, eq(organization.id, organizationRole.organizationId))
            .where(eq(organization.id, org.id))
            .groupBy(organization.id);

        console.log(`  JOIN result memberCount: ${orgWithJoin[0]?.memberCount}, roleCount: ${orgWithJoin[0]?.roleCount}`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
