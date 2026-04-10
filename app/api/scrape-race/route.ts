import { NextRequest, NextResponse } from 'next/server';

function extractMeta(html: string, property: string): string {
  // Try property="..." (Open Graph)
  const ogRe = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const ogMatch = html.match(ogRe);
  if (ogMatch) return ogMatch[1];

  // Try content before property
  const ogRe2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    'i'
  );
  const ogMatch2 = html.match(ogRe2);
  if (ogMatch2) return ogMatch2[1];

  // Try name="..." (standard meta)
  const nameRe = new RegExp(
    `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const nameMatch = html.match(nameRe);
  if (nameMatch) return nameMatch[1];

  const nameRe2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
    'i'
  );
  const nameMatch2 = html.match(nameRe2);
  if (nameMatch2) return nameMatch2[1];

  return '';
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/&#x27;/g, "'");
}

function cleanRaceName(raw: string): string {
  let name = decodeHtmlEntities(raw);

  // Remove common page-title junk: prefixes like "Startpagina - " or "Home | "
  // and suffixes like " | Official Site", " - Registration", " - Run under the..."
  const prefixJunk = /^(startpagina|home|welkom|welcome|homepage)\s*[-|–:]\s*/i;
  name = name.replace(prefixJunk, '');

  // Remove long subtitle after a dash/pipe that looks like a tagline
  // e.g. "Midnight Sun Marathon - Run under the midnight sun in Tromsø"
  // Keep if it's short (likely part of the name), remove if long
  const separatorMatch = name.match(/^(.+?)\s*[-|–]\s*(.+)$/);
  if (separatorMatch) {
    const before = separatorMatch[1].trim();
    const after = separatorMatch[2].trim();
    // If the part after the separator is much longer, it's probably a tagline
    if (after.length > 30 || /^(run|register|sign up|official|the |a |an )/i.test(after)) {
      name = before;
    }
    // If the part before is a generic word, use the after part
    else if (/^(startpagina|home|welkom|welcome|homepage)$/i.test(before)) {
      name = after;
    }
  }

  // Remove trailing junk like " 2026", " | Race", " - Official"
  name = name.replace(/\s*[|–]\s*(official|race|event|website|site|register|registration|home).*$/i, '');

  return name.trim();
}

const MONTH_MAP = new Map<string, string>([
  // English
  ['january', 'Jan'], ['february', 'Feb'], ['march', 'Mar'], ['april', 'Apr'],
  ['may', 'May'], ['june', 'Jun'], ['july', 'Jul'], ['august', 'Aug'],
  ['september', 'Sep'], ['october', 'Oct'], ['november', 'Nov'], ['december', 'Dec'],
  ['jan', 'Jan'], ['feb', 'Feb'], ['mar', 'Mar'], ['apr', 'Apr'],
  ['jun', 'Jun'], ['jul', 'Jul'], ['aug', 'Aug'], ['sep', 'Sep'],
  ['oct', 'Oct'], ['nov', 'Nov'], ['dec', 'Dec'],
  // Dutch
  ['januari', 'Jan'], ['februari', 'Feb'], ['maart', 'Mar'],
  ['mei', 'May'], ['juni', 'Jun'], ['juli', 'Jul'], ['augustus', 'Aug'],
  ['oktober', 'Oct'],
  // German
  ['januar', 'Jan'], ['marz', 'Mar'], ['märz', 'Mar'],
  ['mai', 'May'], ['dezember', 'Dec'],
  // French
  ['janvier', 'Jan'], ['février', 'Feb'], ['fevrier', 'Feb'], ['mars', 'Mar'], ['avril', 'Apr'],
  ['juin', 'Jun'], ['juillet', 'Jul'], ['août', 'Aug'], ['aout', 'Aug'],
  ['septembre', 'Sep'], ['octobre', 'Oct'], ['novembre', 'Nov'], ['décembre', 'Dec'],
  // Italian
  ['gennaio', 'Jan'], ['febbraio', 'Feb'], ['marzo', 'Mar'], ['aprile', 'Apr'],
  ['maggio', 'May'], ['giugno', 'Jun'], ['luglio', 'Jul'], ['agosto', 'Aug'],
  ['settembre', 'Sep'], ['ottobre', 'Oct'], ['dicembre', 'Dec'],
  // Spanish
  ['enero', 'Jan'], ['febrero', 'Feb'], ['mayo', 'May'],
  ['julio', 'Jul'], ['septiembre', 'Sep'], ['noviembre', 'Nov'],
]);

// Build a regex that matches any month name
const MONTH_NAMES = Array.from(MONTH_MAP.keys()).join('|');

interface DateResult {
  day: number | null;
  month: string | null;
  year: number | null;
}

function extractDates(html: string): DateResult {
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // Also search raw HTML for datetime attributes and structured data
  // Pattern: datetime="2026-04-12" or "2026-04-12T..."
  const isoMatch = html.match(/datetime=["'](\d{4})-(\d{2})-(\d{2})/i)
    || html.match(/"(?:start|event|race)(?:Date|_date)"?\s*[:=]\s*"?(\d{4})-(\d{2})-(\d{2})/i)
    || html.match(/"dateStart"?\s*:\s*"(\d{4})-(\d{2})-(\d{2})/i);

  if (isoMatch) {
    const y = parseInt(isoMatch[1]);
    const m = parseInt(isoMatch[2]);
    const d = parseInt(isoMatch[3]);
    if (y >= 2025 && y <= 2035) {
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { day: d, month: monthNames[m] || null, year: y };
    }
  }

  // Pattern: "12 April 2026", "12th April 2026"
  const dmy = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})\\s+(202[5-9]|203[0-5])`, 'i');
  const dmyMatch = textContent.match(dmy);
  if (dmyMatch) {
    return {
      day: parseInt(dmyMatch[1]),
      month: MONTH_MAP.get(dmyMatch[2].toLowerCase()) || null,
      year: parseInt(dmyMatch[3]),
    };
  }

  // Pattern: "April 12, 2026"
  const mdy = new RegExp(`(${MONTH_NAMES})\\s+(\\d{1,2}),?\\s+(202[5-9]|203[0-5])`, 'i');
  const mdyMatch = textContent.match(mdy);
  if (mdyMatch) {
    return {
      day: parseInt(mdyMatch[2]),
      month: MONTH_MAP.get(mdyMatch[1].toLowerCase()) || null,
      year: parseInt(mdyMatch[3]),
    };
  }

  // Pattern: "12/04/2026" or "12-04-2026" (DD/MM/YYYY common in Europe)
  const numMatch = textContent.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (numMatch) {
    const a = parseInt(numMatch[1]);
    const b = parseInt(numMatch[2]);
    const y = parseInt(numMatch[3]);
    if (y >= 2025 && y <= 2035 && b >= 1 && b <= 12) {
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { day: a, month: monthNames[b], year: y };
    }
  }

  // Pattern: "2026-04-12" in text content
  const ymdMatch = textContent.match(/(202[5-9]|203[0-5])-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1]);
    const m = parseInt(ymdMatch[2]);
    const d = parseInt(ymdMatch[3]);
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return { day: d, month: monthNames[m] || null, year: y };
  }

  return { day: null, month: null, year: null };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL (${response.status})` }, { status: 422 });
    }

    const html = await response.text();

    // Extract metadata
    const ogTitle = extractMeta(html, 'og:title');
    const ogDesc = extractMeta(html, 'og:description');
    const metaDesc = extractMeta(html, 'description');
    const pageTitle = extractTitle(html);
    const ogSiteName = extractMeta(html, 'og:site_name');

    // Build race name with cleaning
    const rawName = ogTitle || pageTitle || ogSiteName || '';
    const name = cleanRaceName(rawName);

    // Build notes from description
    let notes = ogDesc || metaDesc || '';
    notes = decodeHtmlEntities(notes);

    // Location
    const ogLocality = extractMeta(html, 'og:locality') || extractMeta(html, 'place:location:locality');
    const ogCountry = extractMeta(html, 'og:country-name') || extractMeta(html, 'place:location:country');

    // Dates - comprehensive extraction
    const date = extractDates(html);

    return NextResponse.json({
      name,
      notes,
      city: ogLocality || '',
      country: ogCountry || '',
      race_day: date.day,
      race_month: date.month,
      race_year: date.year,
      url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scrape failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
