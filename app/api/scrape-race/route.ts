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

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RaceTracker/1.0)',
        'Accept': 'text/html',
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

    // Build race name: prefer og:title, fall back to page title, then site name
    let name = ogTitle || pageTitle || ogSiteName || '';
    // Clean up common suffixes like " | Official Site" or " - Home"
    name = name.replace(/\s*[|\-–]\s*(home|official|website|site|register|registration).*$/i, '').trim();
    name = decodeHtmlEntities(name);

    // Build notes from description
    let notes = ogDesc || metaDesc || '';
    notes = decodeHtmlEntities(notes);

    // Try to extract location from meta or structured data
    const ogLocality = extractMeta(html, 'og:locality') || extractMeta(html, 'place:location:locality');
    const ogCountry = extractMeta(html, 'og:country-name') || extractMeta(html, 'place:location:country');

    // Try to find dates in the HTML (look for common date patterns)
    // Pattern: "12 April 2026", "April 12, 2026", "12/04/2026", etc.
    const datePatterns = [
      /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(202\d)/i,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(202\d)/i,
    ];

    let raceDay: number | null = null;
    let raceMonth: string | null = null;
    let raceYear: number | null = null;

    const monthMap: Record<string, string> = {
      january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr',
      may: 'May', june: 'Jun', july: 'Jul', august: 'Aug',
      september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec',
    };

    // Search in text content (strip tags first for cleaner matching)
    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    for (const pattern of datePatterns) {
      const match = textContent.match(pattern);
      if (match) {
        if (/^\d/.test(match[1])) {
          // "12 April 2026" format
          raceDay = parseInt(match[1]);
          raceMonth = monthMap[match[2].toLowerCase()] || null;
          raceYear = parseInt(match[3]);
        } else {
          // "April 12, 2026" format
          raceMonth = monthMap[match[1].toLowerCase()] || null;
          raceDay = parseInt(match[2]);
          raceYear = parseInt(match[3]);
        }
        break;
      }
    }

    return NextResponse.json({
      name,
      notes,
      city: ogLocality || '',
      country: ogCountry || '',
      race_day: raceDay,
      race_month: raceMonth,
      race_year: raceYear,
      url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scrape failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
