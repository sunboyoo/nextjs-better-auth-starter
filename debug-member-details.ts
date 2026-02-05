
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

    // Dynamic imports provided by previous context, but manual setup works for simple script
    const { member, organization, user } = await import("./src/db/schema");
    const { eq } = await import("drizzle-orm");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema: { member, organization, user } });

    const orgId = "joZI3u8M55UVIEmNtChS0";

    console.log(`Testing with Organization ID: ${orgId}`);

    // Replicate the join query used in the API
    const activeMembers = await db
        .select({
            role: member.role,
            memberId: member.id,
            user: {
                name: user.name,
                image: user.image,
                email: user.email,
            },
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, orgId));

    const activeRoleMembers = activeMembers.reduce((acc, curr) => {
        if (!acc[curr.role]) {
            acc[curr.role] = [];
        }
        acc[curr.role].push({
            memberId: curr.memberId,
            user: curr.user,
        });
        return acc;
    }, {} as Record<string, any[]>);

    console.log("Active Role Members:");
    Object.entries(activeRoleMembers).forEach(([role, members]) => {
        console.log(`Role: ${role}`);
        members.forEach(m => {
            console.log(`  - ${m.user.name} (${m.user.email})`);
        });
    });
}

main().catch(console.error).finally(() => process.exit(0));
