import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

type RouteType = "page" | "api";

type RouteItem = {
  type: RouteType;
  template: string;
  href: string;
  source: string;
};

const APP_DIR = path.join(process.cwd(), "src", "app");
const PAGE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js"]);
const ROUTE_FILES = new Set(["route.tsx", "route.ts", "route.jsx", "route.js"]);

const isRouteGroup = (segment: string) =>
  segment.startsWith("(") && segment.endsWith(")");

const isDynamicSegment = (segment: string) =>
  segment.startsWith("[") && segment.endsWith("]");

const toTemplatePath = (segments: string[]) => {
  const visibleSegments = segments.filter((segment) => !isRouteGroup(segment));
  if (!visibleSegments.length) return "/";
  return `/${visibleSegments.join("/")}`;
};

const toTestSegments = (segments: string[]) => {
  const mapped: string[] = [];
  for (const segment of segments) {
    if (isRouteGroup(segment)) continue;
    if (!isDynamicSegment(segment)) {
      mapped.push(segment);
      continue;
    }
    if (segment.startsWith("[[...") && segment.endsWith("]]")) {
      mapped.push("test");
      continue;
    }
    if (segment.startsWith("[...") && segment.endsWith("]")) {
      mapped.push("test", "path");
      continue;
    }
    const name = segment.slice(1, -1).trim() || "id";
    mapped.push(`${name}-test`);
  }
  return mapped;
};

const toTestPath = (segments: string[]) => {
  const visibleSegments = toTestSegments(segments);
  if (!visibleSegments.length) return "/";
  return `/${visibleSegments.join("/")}`;
};

const collectRoutes = (dir: string, segments: string[] = []): RouteItem[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const fileNames = new Set(
    entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
  );

  const routes: RouteItem[] = [];
  const template = toTemplatePath(segments);
  const href = toTestPath(segments);
  const source = path.relative(APP_DIR, dir) || "app";

  if ([...PAGE_FILES].some((file) => fileNames.has(file))) {
    routes.push({ type: "page", template, href, source });
  }
  if ([...ROUTE_FILES].some((file) => fileNames.has(file))) {
    routes.push({ type: "api", template, href, source });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;
    routes.push(...collectRoutes(path.join(dir, entry.name), [...segments, entry.name]));
  }
  return routes;
};

const dedupeAndSort = (items: RouteItem[]) => {
  const map = new Map<string, RouteItem>();
  for (const item of items) {
    const key = `${item.type}:${item.template}`;
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()].sort((a, b) => a.template.localeCompare(b.template));
};

export default function TempRoutesPage() {
  const allRoutes = dedupeAndSort(collectRoutes(APP_DIR));
  const pageRoutes = allRoutes.filter((item) => item.type === "page");
  const apiRoutes = allRoutes.filter((item) => item.type === "api");

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6 text-sm">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Temp Route Tester</h1>
        <p className="text-muted-foreground">
          Auto-generated from <code>src/app</code>. Dynamic params are replaced
          with test values for quick clicking.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Pages ({pageRoutes.length})</h2>
        <ul className="space-y-2">
          {pageRoutes.map((route) => (
            <li
              key={`page-${route.template}`}
              className="rounded-md border p-3 leading-6"
            >
              <div className="font-mono text-xs text-muted-foreground">
                {route.template}
              </div>
              <div>
                <Link className="underline" href={route.href}>
                  {route.href}
                </Link>
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {route.source}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">API Routes ({apiRoutes.length})</h2>
        <ul className="space-y-2">
          {apiRoutes.map((route) => (
            <li
              key={`api-${route.template}`}
              className="rounded-md border p-3 leading-6"
            >
              <div className="font-mono text-xs text-muted-foreground">
                {route.template}
              </div>
              <div>
                <Link className="underline" href={route.href}>
                  {route.href}
                </Link>
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {route.source}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
