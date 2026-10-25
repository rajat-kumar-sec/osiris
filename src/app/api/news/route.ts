import { feed } from "@/lib/api";
import { loadNews, NEWS_TOPICS, type NewsTopic } from "@/lib/feeds/intel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("topic") ?? "world";
  const topic = (Object.keys(NEWS_TOPICS).includes(raw) ? raw : "world") as NewsTopic;

  return feed(
    { source: "GDELT / Google News", key: `news:${topic}`, ttlMs: 180_000 },
    () => loadNews(topic),
    { count: (v) => v.articles.length, note: "Global news intelligence" },
  );
}
