import https from 'node:https';
import { URL } from 'node:url';
import { Tool } from '../tool.js';
import { WebSearchQueryInputSchema } from '../types.js';

// Lightweight Google search scraper (HTML structure may change). Returns top organic
// results (filtered) with: title, url, snippet. Designed as a precursor to url_fetch.
export interface WebSearchResultItem {
	title: string;
	url: string;
	snippet: string;
}

function fetchHTML(url: string, timeoutMs = 10000): Promise<string> {
	return new Promise((resolve, reject) => {
		const u = new URL(url);
		const req = https.get(
			{
				hostname: u.hostname,
				path: u.pathname + u.search,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; AgentBot/0.1; +https://example.invalid)',
					'Accept-Language': 'en-US,en;q=0.9',
				},
			},
			(res) => {
				if ((res.statusCode || 0) >= 300 && (res.statusCode || 0) < 400 && res.headers.location) {
					// Simple redirect follow (one hop)
						fetchHTML(res.headers.location!).then(resolve).catch(reject);
						return;
				}
				if (!res.statusCode || res.statusCode >= 400) {
					reject(new Error(`web_search HTTP status ${res.statusCode}`));
					return;
				}
				const chunks: Buffer[] = [];
				res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
				res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
			}
		);
		req.on('error', reject);
		req.setTimeout(timeoutMs, () => req.destroy(new Error('web_search timeout')));
	});
}

function parseGoogleResults(html: string, limit = 5): WebSearchResultItem[] {
	const results: WebSearchResultItem[] = [];
	// Very naive parsing: look for <a href="/url?q=..."> and extract following snippet.
	const anchorRegex = /<a\s+href="\/url\?q=([^"&]+)[^>]*>(.*?)<\/a>/gsi;
	const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
	const seen = new Set<string>();
	let match: RegExpExecArray | null;
	while ((match = anchorRegex.exec(html)) && results.length < limit) {
		try {
			const decodedUrl = decodeURIComponent(match[1]);
			if (!/^https?:/i.test(decodedUrl)) continue;
			if (seen.has(decodedUrl)) continue;
			// Title is inner HTML of anchor (match[2])
			const title = stripTags(match[2]);
			if (!title) continue;
			// Attempt to find snippet near anchor: look ahead a bit.
			const contextSlice = html.slice(match.index, match.index + 2000);
			const snippetMatch = /<span[^>]*>([^<]{20,300})<\/span>/i.exec(contextSlice);
			const snippet = snippetMatch ? stripTags(snippetMatch[1]).slice(0, 300) : '';
			results.push({ title, url: decodedUrl, snippet });
			seen.add(decodedUrl);
		} catch {
			continue; // skip malformed
		}
	}
	return results;
}

export const webSearchTool: Tool<typeof WebSearchQueryInputSchema> = {
	name: 'web_search',
	description: 'Search the web (Google) for a query and return top result links with titles & snippets. Use before url_fetch.',
	schema: WebSearchQueryInputSchema,
	execute: async ({ query }) => {
		const q = encodeURIComponent(query.trim());
		const searchUrl = `https://www.google.com/search?q=${q}&hl=en`;
		const html = await fetchHTML(searchUrl);
		const items = parseGoogleResults(html, 5);
		if (!items.length) return 'No results found.';
		// Return a JSON-like plain text for model friendliness.
		return items
			.map(
				(r, i) =>
					`${i + 1}. ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet || '(no snippet)'}\n`)
			.join('\n');
	},
};
