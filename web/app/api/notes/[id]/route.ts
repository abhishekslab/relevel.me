import { createClient } from '@/lib/supabase/server';
import { parseNote, normalizeTitle } from '@/../../packages/shared/src/utils/note-parser';
import { NextRequest, NextResponse } from 'next/server';

interface UpdateNoteRequest {
  title?: string;
  body?: string;
  parentNoteId?: string | null;
  tags?: string[];
}

/**
 * GET /api/notes/[id]
 *
 * Fetch a single note with all its metadata
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Fetch note with related data
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select(
        `
        *,
        outgoing_links:note_links!source_note_id(
          id,
          target_note_id,
          link_type,
          alias,
          target:notes!target_note_id(id, title)
        ),
        incoming_links:note_links!target_note_id(
          id,
          source_note_id,
          link_type,
          source:notes!source_note_id(id, title)
        ),
        children:notes!parent_note_id(id, title, created_at)
      `
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (noteError) {
      if (noteError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to fetch note' },
        { status: 500 }
      );
    }

    // Get breadcrumb path
    const { data: path } = await supabase.rpc('get_note_path', {
      p_note_id: id,
    });

    return NextResponse.json({
      note,
      path: path || [],
    });
  } catch (error) {
    console.error('Error in GET /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/[id]
 *
 * Update a note and reprocess wiki links
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = (await req.json()) as UpdateNoteRequest;

    // Verify note ownership
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('id, body')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Build update object
    const updates: any = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updates.title = body.title.trim();
    }

    if (body.body !== undefined) {
      updates.body = body.body;

      // Reparse wiki links if body changed
      const parsed = parseNote(body.body);

      // Combine explicit tags with parsed tags
      const allTags = Array.from(
        new Set([...(body.tags || []), ...parsed.tags])
      );
      updates.tags = allTags;

      // Delete old wiki links and recreate them
      await supabase
        .from('note_links')
        .delete()
        .eq('source_note_id', id)
        .eq('link_type', 'wiki');

      // Process new wiki links
      if (parsed.wikiLinks.length > 0) {
        await processWikiLinks(supabase, user.id, id, parsed.wikiLinks);
      }
    } else if (body.tags !== undefined) {
      updates.tags = body.tags;
    }

    if (body.parentNoteId !== undefined) {
      updates.parent_note_id = body.parentNoteId;
    }

    // Update the note
    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating note:', updateError);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('Error in PATCH /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]
 *
 * Delete a note and all its relationships
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Delete the note (cascading will handle links and embeddings)
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting note:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Process wiki links (same as create route)
 */
async function processWikiLinks(
  supabase: any,
  userId: string,
  sourceNoteId: string,
  wikiLinks: Array<{ target: string; alias?: string }>
) {
  const { data: existingNotes } = await supabase
    .from('notes')
    .select('id, title')
    .eq('user_id', userId);

  if (!existingNotes) return;

  const titleMap = new Map(
    existingNotes.map((n: any) => [normalizeTitle(n.title), n.id])
  );

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

    if (!targetNoteId) {
      const { data: newNote } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title: link.target,
          body: '',
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

  if (linksToCreate.length > 0) {
    await supabase.from('note_links').insert(linksToCreate);
  }
}
