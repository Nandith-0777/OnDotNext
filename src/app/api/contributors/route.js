import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "contributors.json");

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch {
    const initial = {
      contributors: [],
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readContributors() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.contributors)) return parsed.contributors;
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

async function writeContributors(contributors) {
  await ensureDataFile();
  const payload = { contributors };
  await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
}

export async function GET() {
  try {
    const contributors = await readContributors();
    return NextResponse.json({ contributors });
  } catch (err) {
    console.error("GET /api/contributors failed:", err);
    return NextResponse.json({ contributors: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { adminUser, adminPass, contributors } = body || {};

    if (adminUser !== "tyson" || adminPass !== "0777") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!Array.isArray(contributors)) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const sanitized = contributors.map((c) => ({
      name: typeof c.name === "string" ? c.name.trim() : "",
      linkedin: typeof c.linkedin === "string" ? c.linkedin.trim() : "",
      github: typeof c.github === "string" ? c.github.trim() : "",
      about: typeof c.about === "string" ? c.about.trim() : "",
    }));

    await writeContributors(sanitized);
    return NextResponse.json({ contributors: sanitized });
  } catch (err) {
    console.error("POST /api/contributors failed:", err);
    return NextResponse.json(
      { error: "Failed to save contributors" },
      { status: 500 }
    );
  }
}

