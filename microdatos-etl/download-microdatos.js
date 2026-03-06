const fs = require("fs");
const path = require("path");
const https = require("https");

const LISTING_URL =
  "https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-diario.html";
const BASE_DIR = path.join(process.cwd(), "microdatos-etl");
const DATA_DIR = path.join(BASE_DIR, "data");
const LISTING_HTML_FILE = path.join(
  DATA_DIR,
  "matriculaciones-automoviles-diario.html"
);

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "joinp-microdatos-etl/1.0",
          Accept: "*/*",
        },
      },
      (res) => {
        const { statusCode, headers } = res;

        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          res.resume();
          return resolve(fetchBuffer(headers.location));
        }

        if (!statusCode || statusCode < 200 || statusCode >= 300) {
          res.resume();
          return reject(new Error(`HTTP ${statusCode} while fetching ${url}`));
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );

    req.on("error", reject);
  });
}

function extractZipLinksFromListado(html) {
  const listadoMatch = html.match(
    /<ul[^>]*id=["']listado["'][^>]*>([\s\S]*?)<\/ul>/i
  );
  if (!listadoMatch) {
    return [];
  }

  const ulContent = listadoMatch[1];
  const hrefRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
  const links = new Set();

  let match;
  while ((match = hrefRegex.exec(ulContent)) !== null) {
    const url = match[1].trim();
    if (/^https:\/\/www\.dgt\.es\/microdatos\/.*\/export_mat_\d{8}\.zip$/i.test(url)) {
      links.add(url);
    }
  }

  return Array.from(links).sort();
}

async function downloadMissingFiles(urls) {
  let downloaded = 0;
  let skipped = 0;

  for (const url of urls) {
    const fileName = path.basename(new URL(url).pathname);
    const destination = path.join(DATA_DIR, fileName);

    if (fs.existsSync(destination)) {
      skipped += 1;
      continue;
    }

    const fileBuffer = await fetchBuffer(url);
    fs.writeFileSync(destination, fileBuffer);
    downloaded += 1;
    console.log(`Downloaded ${fileName}`);
  }

  return { downloaded, skipped };
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const listingHtmlBuffer = await fetchBuffer(LISTING_URL);
  const listingHtml = listingHtmlBuffer.toString("utf8");
  fs.writeFileSync(LISTING_HTML_FILE, listingHtml, "utf8");
  console.log(`Saved listing HTML: ${LISTING_HTML_FILE}`);

  const zipUrls = extractZipLinksFromListado(listingHtml);
  console.log(`Found ${zipUrls.length} zip links in #listado`);

  const { downloaded, skipped } = await downloadMissingFiles(zipUrls);
  console.log(`Finished. Downloaded: ${downloaded}, skipped existing: ${skipped}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
