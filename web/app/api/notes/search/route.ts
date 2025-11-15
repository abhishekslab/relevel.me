import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface SearchNotesRequest {
  query: string;
  limit?: number;
  searchMode?: 'hybrid' | 'vector' | 'text' | 'title';
  tags?: string[];
}

/**
 * POST /api/notes/search
 *
 * Search notes using multiple strategies:
 * - Full-text search (PostgreSQL tsvector)
 * - Vector similarity search (pgvector embeddings)
 * - Hybrid search (RRF combination)
 * - Title-only search (for autocomplete)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as SearchNotesRequest;

    if (!body.query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const limit = body.limit || 20;
    const searchMode = body.searchMode || 'text';

    let results: any[] = [];

    switch (searchMode) {
      case 'title':
        results = await searchByTitle(supabase, user.id, body.query, limit);
        break;

      case 'text':
        results = await fullTextSearch(supabase, user.id, body.query, limit, body.tags);
        break;

      case 'vector':
        results = await vectorSearch(supabase, user.id, body.query, limit, body.tags);
        break;

      case 'hybrid':
        results = await hybridSearch(supabase, user.id, body.query, limit, body.tags);
        break;

      default:
        return NextResponse.json({ error: 'Invalid search mode' }, { status: 400 });
    }

    return NextResponse.json({
      results,
      count: results.length,
      searchMode,
    });
  } catch (error) {
    console.error('Error in /api/notes/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Search by title only (for autocomplete in wiki links)
 */
async function searchByTitle(
  supabase: any,
  userId: string,
  query: string,
  limit: number
) {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .ilike('title', `%${query}%`)
    .order('title')
    .limit(limit);

  if (error) {
    console.error('Title search error:', error);
    return [];
  }

  return data || [];
}

/**
 * Full-text search using PostgreSQL tsvector
 */
async function fullTextSearch(
  supabase: any,
  userId: string,
  query: string,
  limit: number,
  tags?: string[]
) {
  let queryBuilder = supabase
    .from('notes')
    .select(
      `
      id,
      title,
      body,
      tags,
      created_at,
      updated_at
    `
    )
    .eq('user_id', userId)
    .textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english',
    });

  // Filter by tags if provided
  if (tags && tags.length > 0) {
    queryBuilder = queryBuilder.overlaps('tags', tags);
  }

  const { data, error } = await queryBuilder
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Full-text search error:', error);
    return [];
  }

  return data || [];
}

/**
 * Vector similarity search using pgvector
 * Note: Requires embeddings to be generated first
 */
async function vectorSearch(
  supabase: any,
  userId: string,
  query: string,
  limit: number,
  tags?: string[]
) {
  // TODO: Generate query embedding and perform similarity search
  // For now, fall back to full-text search
  // This will be implemented when embedding generation is set up

  console.warn('Vector search not yet implemented, falling back to full-text');
  return fullTextSearch(supabase, userId, query, limit, tags);
}

/**
 * Hybrid search using Reciprocal Rank Fusion (RRF)
 * Combines full-text and vector search results
 */
async function hybridSearch(
  supabase: any,
  userId: string,
  query: string,
  limit: number,
  tags?: string[]
) {
  // TODO: Implement RRF combining text and vector search
  // For now, use full-text search only
  console.warn('Hybrid search not yet implemented, using full-text only');
  return fullTextSearch(supabase, userId, query, limit, tags);
}

/**
 * GET /api/notes/search
 *
 * Quick title search for autocomplete (query param)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query?.trim()) {
      // Return all notes if no query
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      return NextResponse.json({ results: data || [] });
    }

    const results = await searchByTitle(supabase, user.id, query, 10);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in GET /api/notes/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
