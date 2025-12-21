import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const parser = new Parser();

        // Multiple feeds to gather diverse sources
        const feedUrls = [
            'https://news.google.com/rss/search?q=normativa+legge+giurisprudenza+italia&hl=it&gl=IT&ceid=IT:it', // General Law
            'https://news.google.com/rss/search?q=cassazione+sentenza+penale+civile&hl=it&gl=IT&ceid=IT:it',     // Case Law
            'https://news.google.com/rss/search?q=agenzia+entrate+fisco+tasse&hl=it&gl=IT&ceid=IT:it'            // Tax/Economy
        ];

        const feedPromises = feedUrls.map(url => parser.parseURL(url).catch(() => ({ items: [] })));
        const feeds = await Promise.all(feedPromises);

        // Flatten and deduplicate by link
        const allNews = feeds.flatMap(f => f.items || []);
        const uniqueNews = Array.from(new Map(allNews.map(item => [item.link, item])).values());

        // Sort by date (newest first) and slice
        const sortedNews = uniqueNews.sort((a, b) => {
            return new Date(b.pubDate || '').getTime() - new Date(a.pubDate || '').getTime();
        });

        const news = sortedNews.slice(0, 25).map(item => ({
            id: item.guid || item.link || Math.random().toString(),
            title: item.title,
            link: item.link,
            date: item.pubDate,
            source: item.source || 'Google News', // Google RSS puts source in a specific field usually, or title
            content: item.contentSnippet || item.content || ''
        }));

        return NextResponse.json({ success: true, news });
    } catch {
        console.error('Feed Error: Failed to fetch feed');
        return NextResponse.json({ success: false, error: 'Failed to fetch feed' }, { status: 500 });
    }
}

