/**
 * Talking-avatar bake-off: generate the SAME clip on two top models so we can
 * judge quality on Stephen's real headshot before committing to a pipeline.
 *
 *   1. ElevenLabs TTS  : script text            -> voice.mp3
 *   2. fal.ai upload   : headshot + voice.mp3   -> hosted URLs
 *   3. fal.ai generate : OmniHuman 1.5 ($0.16/s) AND Kling Avatar v2 Pro ($0.115/s)
 *   4. download both    -> output/avatar-bakeoff/*.mp4
 *
 * Setup:
 *   pnpm add @fal-ai/client
 *   # add to .env.local:
 *   FAL_KEY=...
 *   ELEVENLABS_API_KEY=...
 *   # optional:
 *   ELEVENLABS_VOICE_ID=...        (else the first voice on the account is used)
 *   HEADSHOT_PATH=assets/stephen-headshot.png
 *   AVATAR_SCRIPT="...what you want him to say..."
 *
 * Run:  pnpm avatar:bakeoff
 *   (or: pnpm tsx scripts/avatar-bakeoff.ts ./path/to/headshot.png)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { fal } from "@fal-ai/client";

// ---- config -----------------------------------------------------------------

const HEADSHOT_PATH =
  process.argv[2] || process.env.HEADSHOT_PATH || "assets/stephen-headshot.png";

const SCRIPT_TEXT =
  process.env.AVATAR_SCRIPT ||
  "Hey, I'm Stephen. I just wanted to take a quick second to say thanks for " +
    "stopping by. We've been putting a lot of work into something new behind " +
    "the scenes, and honestly, I can't wait for you to see it. Stick around — " +
    "it's going to be worth it.";

const OUT_DIR = "output/avatar-bakeoff";

const MODELS = [
  {
    key: "omnihuman",
    label: "OmniHuman 1.5 (1080p)",
    endpoint: "fal-ai/bytedance/omnihuman/v1.5",
    pricePerSec: 0.16,
    extraInput: { resolution: "1080p" as const },
  },
  {
    key: "kling",
    label: "Kling Avatar v2 Pro",
    endpoint: "fal-ai/kling-video/ai-avatar/v2/pro",
    pricePerSec: 0.115,
    extraInput: {},
  },
];

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

// ---- helpers ----------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
  return v;
}

async function uploadLocal(path: string): Promise<string> {
  const buf = await readFile(path);
  const type = MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
  // @fal-ai/client accepts a Blob/File; Blob is global in Node 18+.
  return fal.storage.upload(new Blob([buf], { type }));
}

async function elevenLabsTTS(apiKey: string, text: string): Promise<Buffer> {
  let voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    if (!r.ok) throw new Error(`ElevenLabs /voices ${r.status}: ${await r.text()}`);
    const { voices } = (await r.json()) as { voices: { voice_id: string; name: string }[] };
    if (!voices?.length) throw new Error("No ElevenLabs voices on this account");
    voiceId = voices[0].voice_id;
    console.log(`  using ElevenLabs voice: ${voices[0].name} (${voiceId})`);
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function download(url: string, dest: string): Promise<void> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status} for ${url}`);
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
}

// ---- main -------------------------------------------------------------------

async function main() {
  const FAL_KEY = requireEnv("FAL_KEY");
  const ELEVENLABS_API_KEY = requireEnv("ELEVENLABS_API_KEY");
  fal.config({ credentials: FAL_KEY });

  const headshot = resolve(HEADSHOT_PATH);
  try {
    await readFile(headshot);
  } catch {
    console.error(`Headshot not found at ${headshot}\n` + `Save the image there or pass a path: pnpm tsx scripts/avatar-bakeoff.ts <path>`);
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Headshot : ${headshot}`);
  console.log(`Script   : "${SCRIPT_TEXT.slice(0, 70)}..."\n`);

  // 1. voice
  console.log("1/3  ElevenLabs TTS...");
  const mp3 = await elevenLabsTTS(ELEVENLABS_API_KEY, SCRIPT_TEXT);
  const voicePath = join(OUT_DIR, "voice.mp3");
  await writeFile(voicePath, mp3);
  console.log(`     saved ${voicePath} (${(mp3.length / 1024).toFixed(0)} KB)\n`);

  // 2. upload inputs once, reuse for both models
  console.log("2/3  uploading headshot + audio to fal...");
  const [imageUrl, audioUrl] = await Promise.all([
    uploadLocal(headshot),
    uploadLocal(voicePath),
  ]);
  console.log("     done\n");

  // 3. run both models in parallel
  console.log("3/3  generating on both models (this takes a few minutes)...\n");
  const results = await Promise.allSettled(
    MODELS.map(async (m) => {
      const t0 = Date.now();
      const out: any = await fal.subscribe(m.endpoint, {
        input: { image_url: imageUrl, audio_url: audioUrl, ...m.extraInput },
        logs: true,
        onQueueUpdate: (u: any) => {
          if (u.status === "IN_PROGRESS") console.log(`     [${m.key}] in progress...`);
        },
      });
      const data = out?.data ?? out;
      const videoUrl: string | undefined = data?.video?.url;
      if (!videoUrl) throw new Error(`[${m.key}] no video.url in response: ${JSON.stringify(data).slice(0, 300)}`);
      const dest = join(OUT_DIR, `${m.key}.mp4`);
      await download(videoUrl, dest);
      const secs = Number(data?.duration) || 0;
      const cost = secs ? secs * m.pricePerSec : null;
      const wall = ((Date.now() - t0) / 1000).toFixed(0);
      return { model: m, dest, secs, cost, wall, videoUrl };
    }),
  );

  // summary
  console.log(`\n===== bake-off results =====`);
  for (let i = 0; i < MODELS.length; i++) {
    const m = MODELS[i];
    const r = results[i];
    if (r.status === "fulfilled") {
      const v = r.value;
      console.log(
        `✓ ${m.label}\n  file: ${v.dest}\n  ${v.secs ? `${v.secs}s billable` : "duration n/a"}` +
          `${v.cost != null ? ` ≈ $${v.cost.toFixed(2)}` : ""}  (gen took ${v.wall}s)`,
      );
    } else {
      console.log(`✗ ${m.label}\n  FAILED: ${r.reason?.message ?? r.reason}`);
    }
  }
  console.log(`\nOpen both ${join(OUT_DIR)}\\*.mp4 and compare. Voice: ${voicePath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
