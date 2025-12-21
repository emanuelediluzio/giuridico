import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const parser = new Parser();
        // Feed: Google News query for "Normativa Legge Giurisprudenza Italia"
        const feedUrl = 'https://news.google.com/rss/search?q=normativa+legge+giurisprudenza+italia&hl=it&gl=IT&ceid=IT:it';

        const feed = await parser.parseURL(feedUrl);

        const news = feed.items.slice(0, 10).map(item => ({
            id: item.guid || item.link || Math.random().toString(),
            title: item.title,
            link: item.link,
            date: item.pubDate,
            source: item.source || 'Google News',
            content: item.contentSnippet || item.content || ''
        }));

        return NextResponse.json({ success: true, news });
    } catch (error) {
        console.error('Feed Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch feed' }, { status: 500 });
    }
}
