import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  bodyLength: number;
  linkCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'wiki' | 'parent' | 'tag' | 'semantic';
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * GET /api/notes/graph
 *
 * Returns graph data for D3 visualization
 * Includes nodes (notes) and edges (links between notes)
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
    const focusNoteId = searchParams.get('focus');
    const depth = parseInt(searchParams.get('depth') || '2', 10);
    const includeOrphans = searchParams.get('orphans') !== 'false';

    // Fetch all notes for the user
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, tags, created_at, updated_at, body')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching notes:', notesError);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    // Fetch all links
    const { data: links, error: linksError } = await supabase
      .from('note_links')
      .select('source_note_id, target_note_id, link_type')
      .eq('user_id', user.id);

    if (linksError) {
      console.error('Error fetching links:', linksError);
      return NextResponse.json(
        { error: 'Failed to fetch links' },
        { status: 500 }
      );
    }

    // Build graph data
    const graphData = buildGraphData(
      notes || [],
      links || [],
      focusNoteId,
      depth,
      includeOrphans
    );

    return NextResponse.json(graphData);
  } catch (error) {
    console.error('Error in /api/notes/graph:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build graph data structure for D3
 */
function buildGraphData(
  notes: any[],
  links: any[],
  focusNoteId: string | null,
  depth: number,
  includeOrphans: boolean
): GraphData {
  // Create nodes map
  const nodesMap = new Map<string, GraphNode>();

  for (const note of notes) {
    nodesMap.set(note.id, {
      id: note.id,
      title: note.title,
      tags: note.tags || [],
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      bodyLength: note.body?.length || 0,
      linkCount: 0, // Will be calculated later
    });
  }

  // Build edges
  const edges: GraphEdge[] = [];

  // Add explicit links (wiki, parent)
  for (const link of links) {
    // Skip if source or target not in notes
    if (!nodesMap.has(link.source_note_id) || !nodesMap.has(link.target_note_id)) {
      continue;
    }

    const weight = link.link_type === 'wiki' ? 1.0 : link.link_type === 'parent' ? 0.8 : 0.5;

    edges.push({
      source: link.source_note_id,
      target: link.target_note_id,
      type: link.link_type,
      weight,
    });

    // Increment link counts
    const sourceNode = nodesMap.get(link.source_note_id);
    const targetNode = nodesMap.get(link.target_note_id);
    if (sourceNode) sourceNode.linkCount++;
    if (targetNode) targetNode.linkCount++;
  }

  // Add tag-based connections
  const tagToNotes = new Map<string, string[]>();

  for (const [noteId, node] of nodesMap) {
    for (const tag of node.tags) {
      if (!tagToNotes.has(tag)) {
        tagToNotes.set(tag, []);
      }
      tagToNotes.get(tag)!.push(noteId);
    }
  }

  // Create edges between notes with common tags
  for (const [tag, noteIds] of tagToNotes) {
    if (noteIds.length > 1) {
      // Connect each pair of notes with this tag
      for (let i = 0; i < noteIds.length; i++) {
        for (let j = i + 1; j < noteIds.length; j++) {
          const source = noteIds[i];
          const target = noteIds[j];

          // Check if explicit link already exists
          const hasExplicitLink = edges.some(
            e =>
              (e.source === source && e.target === target && e.type !== 'tag') ||
              (e.source === target && e.target === source && e.type !== 'tag')
          );

          if (!hasExplicitLink) {
            edges.push({
              source,
              target,
              type: 'tag',
              weight: 0.3, // Lower weight for tag connections
            });
          }
        }
      }
    }
  }

  // Filter by focus and depth if specified
  let filteredNodes = Array.from(nodesMap.values());
  let filteredEdges = edges;

  if (focusNoteId && nodesMap.has(focusNoteId)) {
    const connectedNodeIds = getConnectedNodes(focusNoteId, edges, depth);
    connectedNodeIds.add(focusNoteId); // Include focus node

    filteredNodes = filteredNodes.filter(n => connectedNodeIds.has(n.id));
    filteredEdges = edges.filter(
      e => connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target)
    );
  } else if (!includeOrphans) {
    // Remove orphan nodes (no connections)
    const connectedIds = new Set<string>();
    for (const edge of edges) {
      connectedIds.add(edge.source);
      connectedIds.add(edge.target);
    }
    filteredNodes = filteredNodes.filter(n => connectedIds.has(n.id));
  }

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

/**
 * Get all notes connected to a focus note within a certain depth
 */
function getConnectedNodes(
  focusId: string,
  edges: GraphEdge[],
  maxDepth: number
): Set<string> {
  const connected = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: focusId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);

    if (id !== focusId) {
      connected.add(id);
    }

    // Find connected nodes
    for (const edge of edges) {
      if (edge.source === id && !visited.has(edge.target)) {
        queue.push({ id: edge.target, depth: depth + 1 });
      }
      if (edge.target === id && !visited.has(edge.source)) {
        queue.push({ id: edge.source, depth: depth + 1 });
      }
    }
  }

  return connected;
}
