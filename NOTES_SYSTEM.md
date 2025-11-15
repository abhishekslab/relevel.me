# Notes System Documentation

## Overview

The Notes system transforms **relevel.me** into a complete voice-first second brain with Notion-like note-taking and Obsidian-style knowledge graph visualization. Users can create, search, and connect notes through voice or text, building a personalized knowledge network.

---

## Features

### Core Capabilities

✅ **Markdown Notes** - Full markdown support for rich text formatting
✅ **Wiki-Style Links** - Connect notes using `[[Note Title]]` syntax (Obsidian-style)
✅ **Hierarchical Organization** - Nest notes as parent/child for structure
✅ **Tag-Based Organization** - Use `#tags` for flexible categorization
✅ **Voice Integration** - Create notes from voice calls automatically
✅ **Chat Commands** - Create notes via natural language in chat interface
✅ **Graph Visualization** - D3.js force-directed graph showing connections
✅ **Full-Text Search** - Find notes by content, title, or tags
✅ **Auto-Linking** - Automatic note creation when wiki links reference non-existent notes

---

## Architecture

### Database Schema

**`notes` table:**
- Stores markdown content with full-text search
- Supports hierarchical relationships via `parent_note_id`
- Tracks creation source (manual, chat, call)
- Auto-generates search vectors for PostgreSQL FTS

**`note_links` table:**
- Tracks relationships between notes
- Link types: `wiki`, `parent`, `tag`, `semantic`
- Prevents duplicate links and self-references

**`note_embeddings` table:**
- Vector embeddings for semantic search (future)
- Compatible with existing `message_embeddings` infrastructure
- Uses pgvector with HNSW indexing

**`note_attachments` table:**
- Metadata for files attached to notes
- Files stored in Supabase Storage bucket

### File Structure

```
web/
├── app/
│   ├── notes/
│   │   ├── page.tsx                    # Notes page route
│   │   └── _components/
│   │       ├── NotesClient.tsx         # Main client component
│   │       ├── NoteEditor.tsx          # Markdown editor with wiki links
│   │       ├── NoteTree.tsx            # Sidebar navigation
│   │       └── GraphView.tsx           # D3.js graph visualization
│   └── api/
│       └── notes/
│           ├── create/route.ts         # Create notes
│           ├── [id]/route.ts           # CRUD operations
│           ├── search/route.ts         # Search endpoint
│           └── graph/route.ts          # Graph data endpoint

packages/shared/src/
├── utils/
│   └── note-parser.ts                  # Parse wiki links & tags
└── services/
    └── note-creation.ts                # Auto-create from calls/chat

supabase/migrations/
└── 20251115_create_notes_system.sql    # Database schema
```

---

## Usage Guide

### Creating Notes

#### 1. Manual Creation (UI)
1. Navigate to `/notes`
2. Click "New Note" in sidebar
3. Type title and start writing in markdown
4. Use `[[Note Title]]` to link to other notes
5. Add `#tags` for organization
6. Auto-saves every 2 seconds

#### 2. Voice Creation (Calls)
When you complete a call with a transcript:
- A note is **automatically created** with key topics extracted
- Note title generated from main topic
- Linked to the original call for reference
- Minimum transcript length: 50 characters

#### 3. Chat Commands
Use natural language in the chat interface:
- "Create a note about TypeScript best practices"
- "Make a note of this meeting"
- "Remember that I need to follow up with John"
- "Save this as a note"

The system detects intent and creates notes automatically.

### Wiki Links

**Syntax:** `[[Target Note Title]]` or `[[Target|Display Text]]`

**Features:**
- **Autocomplete**: Type `[[` to trigger note suggestions
- **Auto-creation**: Linking to non-existent notes creates stub notes
- **Backlinks**: See all notes linking to current note
- **Bidirectional**: Links work in both directions

**Example:**
```markdown
I learned about [[JavaScript Closures]] today.

They're different from [[Python|Python's approach]].

Related: [[Functional Programming]] #javascript
```

### Tags

**Syntax:** `#tagname`

**Features:**
- Extracted automatically from markdown
- Connect notes with shared tags
- Shown in graph as tag-based edges
- Can be explicitly added via API

**Example:**
```markdown
# Meeting Notes

Discussed the new feature roadmap.

#planning #product #q1-2025
```

### Graph Visualization

**Controls:**
- **Zoom**: Mouse wheel or zoom buttons
- **Pan**: Click and drag background
- **Node Click**: Select note to open in editor
- **Node Drag**: Rearrange graph layout

**Visual Encoding:**
- **Node Size**: Based on number of connections
- **Node Color**:
  - Violet = Currently selected note
  - Colored = Tagged notes (color by tag)
  - Gray = Untagged notes
- **Edge Color**:
  - Violet = Wiki link (strongest)
  - Cyan = Parent/child relationship
  - Green = Shared tag connection
  - Amber = Semantic similarity (future)

**Graph Options:**
- Focus on specific note with depth control
- Toggle orphan notes (notes with no connections)
- Filter by tags or time range (future)

---

## API Reference

### Create Note
```typescript
POST /api/notes/create

{
  title: string;              // Required
  body?: string;              // Markdown content
  parentNoteId?: string;      // For hierarchical notes
  createdFrom?: 'manual' | 'chat' | 'call';
  sourceId?: string;          // Reference to call/conversation
  tags?: string[];            // Explicit tags
}

Response: {
  note: Note;
  stats: {
    wikiLinksFound: number;
    tagsExtracted: number;
  }
}
```

### Get Note
```typescript
GET /api/notes/[id]

Response: {
  note: Note & {
    outgoing_links: Array<{ target: Note; link_type: string }>;
    incoming_links: Array<{ source: Note; link_type: string }>;
    children: Note[];
  };
  path: Array<{ id: string; title: string; depth: number }>;
}
```

### Update Note
```typescript
PATCH /api/notes/[id]

{
  title?: string;
  body?: string;
  parentNoteId?: string | null;
  tags?: string[];
}

Response: { note: Note }
```

### Delete Note
```typescript
DELETE /api/notes/[id]

Response: { success: true }
```

### Search Notes
```typescript
POST /api/notes/search

{
  query: string;
  limit?: number;             // Default: 20
  searchMode?: 'hybrid' | 'vector' | 'text' | 'title';
  tags?: string[];            // Filter by tags
}

Response: {
  results: Note[];
  count: number;
  searchMode: string;
}
```

### Get Graph Data
```typescript
GET /api/notes/graph?focus=[noteId]&depth=2&orphans=true

Response: {
  nodes: Array<{
    id: string;
    title: string;
    tags: string[];
    bodyLength: number;
    linkCount: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'wiki' | 'parent' | 'tag' | 'semantic';
    weight: number;
  }>;
}
```

---

## Advanced Features

### Search Modes

**`text` (default)**: PostgreSQL full-text search
- Fast and reliable
- Supports English language stemming
- Trigram similarity for fuzzy matching

**`title`**: Autocomplete for wiki links
- Case-insensitive partial matching
- Used in editor autocomplete

**`vector`**: Semantic similarity search (future)
- Requires embeddings to be generated
- Uses cosine similarity with pgvector

**`hybrid`**: Reciprocal Rank Fusion (future)
- Combines text + vector results
- Best of both approaches

### Embedding Generation

Embeddings are **queued for background processing** when notes are created/updated. This uses the existing embedding infrastructure:

1. Note created/updated
2. Worker picks up job
3. Embedding generated via configured provider (OpenAI, Local, HuggingFace)
4. Stored in `note_embeddings` table
5. Used for semantic search and auto-linking

### Backlinks & Breadcrumbs

**Backlinks**: Notes that link TO the current note
- Shown in editor sidebar
- Bidirectional navigation
- Updated automatically when links change

**Breadcrumbs**: Path from root to current note
- Shows hierarchical position
- Clickable navigation
- Based on `parent_note_id` relationship

---

## Integration Points

### Dashboard Dock
- Shows 5 most recent notes
- Quick link to full notes page
- Updates when new notes created

### Chat Interface
- Detects note creation intents
- Automatically creates notes from commands
- Returns note ID in API response for confirmation

### Call Webhooks
- Triggers on `completed` status
- Extracts key topics from transcript
- Creates note with call reference
- Minimum 50 character transcript required

### Future Integrations
- Daily digest emails with new notes
- Slack/Discord bot for note creation
- Browser extension for web clipping
- Mobile app for quick capture

---

## Performance & Scalability

### Indexing
- **Full-text**: GIN index on `search_vector` column
- **Tags**: GIN index on `tags` array
- **Title**: Trigram GIN index for fuzzy search
- **Embeddings**: HNSW index for vector similarity
- **Temporal**: Indexes on `created_at` and `updated_at`

### Caching Strategy
- Graph data cached client-side
- Search results debounced (300ms)
- Auto-save debounced (2s)

### Limits
- Note body: No hard limit (recommended < 100KB for performance)
- Title: 80 characters recommended
- Tags: Unlimited, but 5-10 recommended
- Wiki links: Unlimited
- Embeddings: 1536 dimensions (OpenAI) or 384 (local models)

---

## Future Enhancements

### Planned Features
- [ ] Vector semantic search (embeddings already in place)
- [ ] Hybrid search with RRF
- [ ] Daily/weekly note templates
- [ ] Version history with diffs
- [ ] Collaborative notes (multi-user)
- [ ] Block-level references (Roam-style)
- [ ] Spaced repetition integration
- [ ] PDF/image OCR for attachments
- [ ] LaTeX math support
- [ ] Mermaid diagram rendering
- [ ] Export to PDF/HTML/Obsidian vault

### Under Consideration
- [ ] Graph clustering algorithms for topic discovery
- [ ] AI-powered note summarization
- [ ] Automatic tag suggestions
- [ ] Smart note merging for duplicates
- [ ] Bi-directional sync with Obsidian
- [ ] Public note sharing with custom domains

---

## Troubleshooting

### Notes not appearing in search
- Check RLS policies in Supabase (should match `user_id`)
- Verify `search_vector` is being generated (check migration)
- Test with simple title search first

### Wiki links not working
- Ensure double brackets: `[[Note Title]]` not `[Note Title]`
- Check autocomplete is fetching notes (network tab)
- Verify target note exists or stub creation is enabled

### Graph not rendering
- Check browser console for D3 errors
- Verify `/api/notes/graph` returns data
- Ensure at least 2 notes with 1 connection exist

### Auto-save issues
- Check network tab for 401/403 errors (auth)
- Verify user is authenticated
- Look for API errors in server logs

### Call notes not created
- Confirm transcript length > 50 characters
- Check webhook logs for errors
- Verify `createNoteFromCallTranscript` is called

---

## Security & Privacy

### Row-Level Security (RLS)
All notes tables enforce RLS:
- Users can only access their own notes
- Service role bypasses RLS for webhooks
- No cross-user data leakage

### Data Isolation
- Storage bucket uses folder structure: `/user_id/file`
- All queries filter by `user_id`
- Embeddings respect note ownership via JOIN

### Authentication
- All API routes check `auth.uid()`
- Unauthorized requests return 401
- No public note access (yet)

---

## Credits

Built on top of:
- **Next.js 14** - App router & server components
- **Supabase** - PostgreSQL + auth + storage
- **D3.js** - Force-directed graph visualization
- **React Markdown** - Markdown rendering
- **TailwindCSS** - Styling
- **Lucide Icons** - UI icons

Inspired by:
- **Obsidian** - Wiki links & graph view
- **Roam Research** - Bidirectional linking
- **Notion** - Hierarchical organization
- **LogSeq** - Markdown-first approach

---

## Support

For issues or questions:
1. Check this documentation first
2. Review database logs in Supabase dashboard
3. Check browser console for client errors
4. Open GitHub issue with reproduction steps

---

**Happy note-taking! 📝✨**
