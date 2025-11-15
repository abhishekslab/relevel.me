import { createClient } from '@/lib/supabase/server';
import { parseNote, normalizeTitle } from '@/../../packages/shared/src/utils/note-parser';
import { NextRequest, NextResponse } from 'next/server';

interface CreateNoteRequest {
  title: string;
  body?: string;
  parentNoteId?: string;
  createdFrom?: 'manual' | 'chat' | 'call';
  sourceId?: string;
  tags?: string[];
}

/**
 * POST /api/notes/create
 *
 * Creates a new note and automatically:
 * - Parses wiki links and creates note_links entries
 * - Extracts tags from markdown
 * - Creates note embeddings (queued for background processing)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = (await req.json()) as CreateNoteRequest;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const markdown = body.body || '';

    // Parse markdown content
    const parsed = parseNote(markdown);

    // Combine explicitly provided tags with tags found in markdown
    const allTags = Array.from(
      new Set([...(body.tags || []), ...parsed.tags])
    );

    // Create the note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: body.title.trim(),
        body: markdown,
        parent_note_id: body.parentNoteId || null,
        created_from: body.createdFrom || 'manual',
        source_id: body.sourceId || null,
        tags: allTags,
      })
      .select()
      .single();

    if (noteError) {
      console.error('Error creating note:', noteError);
      return NextResponse.json(
        { error: 'Failed to create note', details: noteError.message },
        { status: 500 }
      );
    }

    // Process wiki links
    if (parsed.wikiLinks.length > 0) {
      await processWikiLinks(supabase, user.id, note.id, parsed.wikiLinks);
    }

    // TODO: Queue embedding generation in background worker
    // For now, we'll create embeddings synchronously for small notes
    // In production, this should be handled by the worker queue

    return NextResponse.json({
      note,
      stats: {
        wikiLinksFound: parsed.wikiLinks.length,
        tagsExtracted: parsed.tags.length,
      },
    });
  } catch (error) {
    console.error('Error in /api/notes/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process wiki links by creating note_links entries
 * Automatically creates target notes if they don't exist
 */
async function processWikiLinks(
  supabase: any,
  userId: string,
  sourceNoteId: string,
  wikiLinks: Array<{ target: string; alias?: string }>
) {
  // Get all existing notes for this user to match against
  const { data: existingNotes } = await supabase
    .from('notes')
    .select('id, title')
    .eq('user_id', userId);

  if (!existingNotes) return;

  // Create a map of normalized titles to note IDs
  const titleMap = new Map(
    existingNotes.map((n: any) => [normalizeTitle(n.title), n.id])
  );

  // Process each wiki link
  const linksToCreate: Array<{
    user_id: string;
    source_note_id: string;
    target_note_id: string;
    link_type: 'wiki';
    alias?: string;
  }> = [];

  for (const link of wikiLinks) {
    const normalizedTarget = normalizeTitle(link.target);
    let targetNoteId: string | undefined = titleMap.get(normalizedTarget) as string | undefined;

    // If target note doesn't exist, create it as a stub
    if (!targetNoteId) {
      const { data: newNote } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title: link.target,
          body: '', // Empty stub note
          created_from: 'manual',
        })
        .select('id')
        .single();

      if (newNote) {
        targetNoteId = newNote.id;
        titleMap.set(normalizedTarget, targetNoteId);
      }
    }

    if (targetNoteId) {
      linksToCreate.push({
        user_id: userId,
        source_note_id: sourceNoteId,
        target_note_id: targetNoteId,
        link_type: 'wiki',
        alias: link.alias,
      });
    }
  }

  // Bulk insert all links
  if (linksToCreate.length > 0) {
    await supabase.from('note_links').insert(linksToCreate);
  }
}
