import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ApiDocsPageData, EndpointRecord } from "@/lib/api-docs";

type ApiReferencePageProps = {
  title: string;
  description: string;
  usageHeading: string;
  usageDescription: string;
  designedHeading: string;
  designedDescription: string;
  siblingHref: string;
  siblingLabel: string;
  data: ApiDocsPageData;
};

function formatMethods(methods: string[]): string {
  return methods.length > 0 ? methods.join(", ") : "Unknown";
}

function EndpointTable({
  records,
  emptyMessage,
}: {
  records: EndpointRecord[];
  emptyMessage: string;
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="border-b">
            <th className="px-4 py-3 text-left font-semibold">Endpoint</th>
            <th className="px-4 py-3 text-left font-semibold">Methods</th>
            <th className="px-4 py-3 text-left font-semibold">Source Files</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.endpoint} className="border-b align-top last:border-b-0">
              <td className="px-4 py-3">
                <code className="rounded bg-muted px-2 py-1 text-xs">
                  {record.endpoint}
                </code>
                {record.unresolved ? (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    Unresolved
                  </Badge>
                ) : null}
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {formatMethods(record.methods)}
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  {record.sourceFiles.length} file
                  {record.sourceFiles.length === 1 ? "" : "s"}
                </div>
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-foreground">
                    View files
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {record.sourceFiles.map((filePath) => (
                      <li key={`${record.endpoint}:${filePath}`}>
                        <code>{filePath}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApiReferencePage({
  title,
  description,
  usageHeading,
  usageDescription,
  designedHeading,
  designedDescription,
  siblingHref,
  siblingLabel,
  data,
}: ApiReferencePageProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Developer Docs</Badge>
            <Badge variant="outline">/docs/api</Badge>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={siblingHref}
              className="rounded-md border px-3 py-1.5 font-medium transition-colors hover:bg-muted"
            >
              Open {siblingLabel}
            </Link>
            <Link
              href="/docs/api/user"
              className="rounded-md border px-3 py-1.5 font-medium transition-colors hover:bg-muted"
            >
              User API Docs
            </Link>
            <Link
              href="/docs/api/admin"
              className="rounded-md border px-3 py-1.5 font-medium transition-colors hover:bg-muted"
            >
              Admin API Docs
            </Link>
          </div>
        </header>

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{usageHeading}</h2>
            <Badge variant="outline">{data.usedEndpoints.length} endpoints</Badge>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{usageDescription}</p>
          <EndpointTable
            records={data.usedEndpoints}
            emptyMessage="No endpoint usage detected in this app scope."
          />
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{designedHeading}</h2>
            <Badge variant="outline">
              {data.roleDesignedEndpoints.length} endpoints
            </Badge>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {designedDescription}
          </p>
          <EndpointTable
            records={data.roleDesignedEndpoints}
            emptyMessage="No role-scoped endpoints were found."
          />
        </section>

        {data.authClientUsageFiles.length > 0 ? (
          <section className="rounded-xl border border-dashed bg-card p-6">
            <h2 className="text-base font-semibold">Indirect Better Auth API usage</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The page scope also uses <code>authClient.*</code> or{" "}
              <code>auth.api.*</code>. Those calls resolve through{" "}
              <code>/api/auth/[...all]</code>.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Files: {data.authClientUsageFiles.length}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
