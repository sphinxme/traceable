import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { Liveblocks } from "https://cdn.jsdelivr.net/npm/@liveblocks/node@2.10.2/+esm";

if (!Deno.env.has("LIVEBLOCKS_KEY")) {
    throw new Error("no LIVEBLOCKS_KEY found!");
}

const secret = Deno.env.get("LIVEBLOCKS_KEY")
const liveblocks = new Liveblocks({secret});

const app = new Hono();
app
    .use(cors())
    .all("/auth", async () => {
        const session = liveblocks.prepareSession("sphinx");
        session.allow("*", session.FULL_ACCESS);
        const { status, body } = await session.authorize();
        return new Response(body, { status });
    })

Deno.serve(app.fetch);