import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { getEmbeddingProvider } from '@relevel-me/shared'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { query, limit = 25, searchMode = 'hybrid' } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Get embedding provider
    const embeddingProvider = await getEmbeddingProvider()

    // Generate query embedding
    const queryEmbedding = await embeddingProvider.embed({
      text: query,
      metadata: { user_id: user.id, purpose: 'search' },
    })

    // Perform vector similarity search
    const vectorResults = searchMode === 'text' ? [] : await performVectorSearch(
      supabase,
      user.id,
      queryEmbedding.embedding,
      limit * 2 // Get more results for hybrid reranking
    )

    // Perform full-text search
    const textResults = searchMode === 'vector' ? [] : await performTextSearch(
      supabase,
      user.id,
      query,
      limit * 2
    )

    // Combine and deduplicate results
    let finalResults: any[]

    if (searchMode === 'hybrid') {
      // Merge results with reciprocal rank fusion
      finalResults = mergeSearchResults(vectorResults, textResults, limit)
    } else if (searchMode === 'vector') {
      finalResults = vectorResults.slice(0, limit)
    } else {
      finalResults = textResults.slice(0, limit)
    }

    return NextResponse.json({
      success: true,
      results: finalResults,
      count: finalResults.length,
      searchMode,
      query,
    })

  } catch (error: any) {
    console.error('Memory search error:', error)
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}

/**
 * Perform vector similarity search
 */
async function performVectorSearch(
  supabase: any,
  userId: string,
  queryEmbedding: number[],
  limit: number
) {
  // Convert embedding to pgvector format string
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const { data, error } = await supabase.rpc('search_memories_vector', {
    query_embedding: embeddingStr,
    query_user_id: userId,
    match_count: limit,
  })

  if (error) {
    console.error('Vector search error:', error)
    // Fallback: Use raw SQL if RPC function doesn't exist
    return performVectorSearchRaw(supabase, userId, queryEmbedding, limit)
  }

  return data || []
}

/**
 * Fallback vector search using raw SQL
 */
async function performVectorSearchRaw(
  supabase: any,
  userId: string,
  queryEmbedding: number[],
  limit: number
) {
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const query = `
    SELECT
      m.id,
      m.kind,
      m.text_content,
      m.file_url,
      m.transcript,
      m.tags,
      m.created_at,
      1 - (me.embedding <=> $1::vector) as similarity
    FROM message_embeddings me
    JOIN messages m ON m.id = me.message_id
    WHERE m.user_id = $2
    ORDER BY me.embedding <=> $1::vector
    LIMIT $3
  `

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: query,
    params: [embeddingStr, userId, limit],
  })

  if (error) {
    console.error('Raw vector search error:', error)
    return []
  }

  return data || []
}

/**
 * Perform full-text search
 */
async function performTextSearch(
  supabase: any,
  userId: string,
  query: string,
  limit: number
) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, kind, text_content, file_url, transcript, tags, created_at')
    .eq('user_id', userId)
    .or(`text_content.ilike.%${query}%,transcript.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Text search error:', error)
    return []
  }

  return (data || []).map((item) => ({ ...item, score: 0.5 })) // Default text score
}

/**
 * Merge vector and text search results using reciprocal rank fusion
 */
function mergeSearchResults(
  vectorResults: any[],
  textResults: any[],
  limit: number
) {
  const k = 60 // RRF constant
  const scores = new Map<string, { item: any; score: number }>()

  // Score vector results
  vectorResults.forEach((item, index) => {
    const score = 1 / (k + index + 1)
    scores.set(item.id, {
      item: { ...item, similarity: item.similarity || 0 },
      score,
    })
  })

  // Score text results and merge
  textResults.forEach((item, index) => {
    const score = 1 / (k + index + 1)
    const existing = scores.get(item.id)

    if (existing) {
      // Combine scores if item appears in both results
      existing.score += score
    } else {
      scores.set(item.id, { item, score })
    }
  })

  // Sort by combined score and return top results
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, score }) => ({
      ...item,
      score,
    }))
}
