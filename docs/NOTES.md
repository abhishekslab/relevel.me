# Notes System

> Transform your voice-first second brain into a Notion-like note-taking system with Obsidian-style knowledge graphs

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [User Guide](#user-guide)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Implementation Details](#implementation-details)
- [Future Enhancements](#future-enhancements)

---

## Overview

The Notes system extends **relevel.me** with powerful note-taking capabilities that seamlessly integrate with your voice calls and chat interactions. It combines the best aspects of:

- **Notion** - Hierarchical organization and rich editing
- **Obsidian** - Wiki-style `[[links]]` and knowledge graphs
- **Roam Research** - Bidirectional linking
- **LogSeq** - Markdown-first approach

### Why Notes?

Your voice calls and chat conversations contain valuable insights. The Notes system helps you:

1. **Capture** - Automatically create notes from calls and chat
2. **Connect** - Link related ideas with wiki-style references
3. **Discover** - Visualize your knowledge as an interactive graph
4. **Remember** - Search across all your notes with full-text search

---

## Key Features

### ✅ Implemented Features

#### 1. Voice-First Note Creation

**From Calls:**
- Notes are **automatically created** from completed call transcripts
- Minimum transcript length: 50 characters
- Note title extracted from main topic
- Linked to original call for reference

**From Chat:**
Natural language commands:
```
"Create a note about TypeScript best practices"
"Make a note of this meeting"
"Remember that I need to follow up with John"
"Save this as a note"
```

**Manual Creation:**
- Navigate to `/notes` page
- Click "New Note" in sidebar
- Start typing in markdown

#### 2. Wiki-Style Links

**Syntax:**
```markdown
[[Target Note Title]]           # Simple link
[[Target Note|Display Text]]    # Link with custom text
```

**Features:**
- **Autocomplete**: Type `[[` to see suggestions
- **Auto-creation**: Linking to non-existent notes creates stubs
- **Backlinks**: See all notes linking to current note
- **Bidirectional**: Links work in both directions

**Example:**
```markdown
# My Learning Journey

I learned about [[JavaScript Closures]] today.

They're similar to [[Python Decorators|Python's approach]].

See also: [[Functional Programming Patterns]]

#javascript #learning
```

#### 3. Tag-Based Organization

**Syntax:**
```markdown
#tagname
```

**Features:**
- Automatically extracted from markdown
- Connect notes with shared tags
- Visualized as edges in graph
- Filter search by tags

**Example:**
```markdown
# Q1 Planning Meeting

Discussed new feature roadmap with product team.

Action items:
- Review designs
- Technical feasibility study
- Resource allocation

#planning #product #q1-2025
```

#### 4. Hierarchical Structure

**Features:**
- Nest notes as parent/child (Notion-style)
- Breadcrumb navigation shows path
- Expandable tree view in sidebar
- Move notes by changing `parent_note_id`

**Use Cases:**
```
📁 Projects
  └─ 📄 relevel.me Redesign
      └─ 📄 UI Mockups
      └─ 📄 Technical Spec
📁 Learning
  └─ 📄 TypeScript
      └─ 📄 Generics
      └─ 📄 Type Guards
```

#### 5. Interactive Knowledge Graph

**Visualization:**
- **D3.js force-directed layout** - Physics-based node positioning
- **Zoom & Pan** - Explore large graphs
- **Click nodes** - Open note in editor
- **Drag nodes** - Rearrange layout
- **Focus mode** - View subgraph around selected note

**Visual Encoding:**
- **Node Size** = Number of connections
- **Node Color**:
  - Violet = Currently selected
  - Colored = Tagged (color by tag hash)
  - Gray = Untagged
- **Edge Color & Weight**:
  - Violet (thick) = Wiki link (strongest)
  - Cyan (medium) = Parent/child
  - Green (thin) = Shared tag
  - Amber (future) = Semantic similarity

**Controls:**
- Mouse wheel = Zoom in/out
- Click + drag = Pan
- Click node = Select note
- Double-click node = Expand children

#### 6. Full-Text Search

**Search Modes:**

**Text Search (default):**
- PostgreSQL full-text search with `tsvector`
- English language stemming
- Trigram similarity for fuzzy matching
- Searches title + body content

**Title Search:**
- Used for autocomplete in wiki links
- Case-insensitive partial matching
- Fast lookup by title

**Hybrid Search (future):**
- Combines text + vector similarity
- Reciprocal Rank Fusion (RRF) algorithm
- Best of both worlds

**Example:**
```javascript
// Search API
POST /api/notes/search
{
  "query": "javascript closures",
  "searchMode": "text",
  "limit": 20,
  "tags": ["programming", "javascript"]
}
```

#### 7. Markdown Editor

**Features:**
- Live preview toggle
- Auto-save (2 second debounce)
- Wiki link autocomplete
- Tag extraction
- Syntax highlighting
- Code blocks support

**Keyboard Shortcuts:**
- Type `[[` → Autocomplete suggestions
- `Ctrl+S` → Manual save
- Preview toggle button

**Metadata Sidebar:**
- Tags list
- Outgoing links count
- Backlinks (incoming)
- Breadcrumb path

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
├─────────────┬───────────────────────┬────────────────────────┤
│  Dashboard  │    /notes Page        │   Chat Interface       │
│  - Notes    │  - Tree Sidebar       │   - "Create note..."   │
│    Card     │  - Markdown Editor    │   - Intent Detection   │
│             │  - Graph View (D3.js) │                        │
├─────────────┴───────────────────────┴────────────────────────┤
│                        API Routes                            │
│  /api/notes/create  /api/notes/[id]  /api/notes/search      │
│  /api/notes/graph   /api/chat/send   /api/webhooks/call     │
├──────────────────────────────────────────────────────────────┤
│                    Shared Services                           │
│  - NoteParser (wiki links, tags)                            │
│  - NoteCreation (auto-create from calls/chat)              │
│  - EmbeddingProvider (semantic search - future)            │
├──────────────────────────────────────────────────────────────┤
│                  Database (PostgreSQL)                       │
│  - notes              - note_links                          │
│  - note_embeddings    - note_attachments                    │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Manual Note Creation
```
User types in editor
    → Auto-save (2s debounce)
    → POST /api/notes/create
    → Parse markdown (wiki links, tags)
    → Insert into `notes` table
    → Create `note_links` entries
    → Return note with metadata
    → Update UI
```

#### Voice Note Creation (Call)
```
Call completes with transcript
    → Webhook: POST /api/webhooks/call
    → Check transcript length (>50 chars)
    → createNoteFromCallTranscript()
    → Optional: LLM extracts topics/tags
    → Insert note with source_id = call_id
    → User sees note in dashboard
```

#### Chat Note Creation
```
User: "create a note about X"
    → POST /api/chat/send
    → detectNoteCreationIntent(message)
    → If detected: createNoteFromChat()
    → Extract title/body from message
    → Insert note with source_id = conversation_id
    → Return note in API response
    → Chat shows confirmation
```

#### Wiki Link Resolution
```
User types [[Note Title]]
    → Autocomplete: GET /api/notes/search?q=Note
    → User selects from suggestions
    → On save: parseWikiLinks(markdown)
    → For each link:
        - Find target note by normalized title
        - If not found: create stub note
        - Create note_links entry (type='wiki')
    → Backlinks updated automatically
```

---

## User Guide

### Getting Started

#### 1. Access Notes
Navigate to `/notes` in your browser to open the notes interface.

#### 2. Create Your First Note

**Option A: Manual**
1. Click "New Note" in left sidebar
2. Type a title (e.g., "My First Note")
3. Press Enter
4. Start writing in markdown

**Option B: Voice**
1. Make a voice call
2. Talk about something for >50 characters
3. Complete the call
4. Note appears automatically

**Option C: Chat**
1. Open chat interface
2. Type: "Create a note about my project ideas"
3. Note is created instantly

#### 3. Link Notes Together

```markdown
# Project Ideas

Working on [[relevel.me]] has been exciting.

I want to explore [[AI Memory Systems|memory systems]] next.

Related: [[Second Brain Tools]]

#projects #ai
```

As you type `[[`, you'll see autocomplete suggestions. If a note doesn't exist, it will be created as a stub when you save.

#### 4. Explore the Graph

1. Click "Graph" tab in top bar
2. See your notes as nodes connected by links
3. Click a node to open that note
4. Zoom/pan to explore
5. Use focus mode to view subgraph

### Best Practices

#### Naming Notes
- Use descriptive titles (e.g., "JavaScript Closures" not "closures")
- Keep titles concise (<80 chars)
- Use proper capitalization for readability

#### Linking Strategy
- Link to concepts, not just pages
- Use aliases for natural reading: `[[TypeScript|TS]]`
- Create index notes for topics
- Link bidirectionally (both ways)

#### Tagging Strategy
- Use 3-7 tags per note
- Be consistent with tag names
- Use lowercase for tags
- Hierarchy with hyphens: `#project-relevel-me`

#### Organization
- Use hierarchies for structured knowledge (courses, projects)
- Use tags for cross-cutting themes (topics, status)
- Use wiki links for conceptual relationships
- Review graph periodically to find disconnected notes

### Common Workflows

#### Daily Note Taking
```markdown
# Daily Note - 2025-11-16

## Call Summary
Had a great call about [[Feature Planning]].

## Ideas
- Explore [[Semantic Search]] for better note finding
- Connect [[Memory Graph]] with [[Skill Trees]]

## Tasks
- [ ] Review [[Q1 Planning]] notes
- [ ] Update [[Technical Spec]]

#daily #planning
```

#### Project Documentation
```
📁 Projects
  └─ relevel.me
      ├─ Architecture
      ├─ Features
      │   ├─ Notes System
      │   ├─ Voice Calls
      │   └─ Chat Interface
      └─ Roadmap
```

#### Learning Notes
```markdown
# TypeScript Generics

Generics allow writing reusable, type-safe code.

## Related
- [[TypeScript Basics]]
- [[Type Guards]]
- [[Utility Types]]

## Resources
- Official docs
- [[Learning Resources]] list

#typescript #learning #advanced
```

---

## API Reference

### Create Note

```typescript
POST /api/notes/create

Request:
{
  title: string;              // Required
  body?: string;              // Markdown content
  parentNoteId?: string;      // For hierarchical notes
  createdFrom?: 'manual' | 'chat' | 'call';
  sourceId?: string;          // call_id or conversation_id
  tags?: string[];            // Explicit tags (merged with extracted)
}

Response:
{
  note: {
    id: string;
    user_id: string;
    title: string;
    body: string;
    parent_note_id: string | null;
    created_from: 'manual' | 'chat' | 'call';
    source_id: string | null;
    tags: string[];
    created_at: string;
    updated_at: string;
  };
  stats: {
    wikiLinksFound: number;
    tagsExtracted: number;
  }
}
```

### Get Note

```typescript
GET /api/notes/[id]

Response:
{
  note: {
    // ... all note fields
    outgoing_links: Array<{
      id: string;
      target_note_id: string;
      link_type: 'wiki' | 'parent' | 'tag';
      alias?: string;
      target: {
        id: string;
        title: string;
      }
    }>;
    incoming_links: Array<{
      id: string;
      source_note_id: string;
      link_type: string;
      source: {
        id: string;
        title: string;
      }
    }>;
    children: Array<{
      id: string;
      title: string;
      created_at: string;
    }>;
  };
  path: Array<{
    id: string;
    title: string;
    depth: number;
  }>;
}
```

### Update Note

```typescript
PATCH /api/notes/[id]

Request:
{
  title?: string;
  body?: string;
  parentNoteId?: string | null;
  tags?: string[];
}

Response:
{
  note: Note;  // Updated note object
}

Notes:
- Wiki links are automatically reprocessed
- Old wiki links are deleted, new ones created
- Tags are merged with extracted tags
```

### Delete Note

```typescript
DELETE /api/notes/[id]

Response:
{
  success: true;
}

Notes:
- Cascading delete removes links and embeddings
- Child notes have parent_note_id set to NULL
- Attachments remain in storage (manual cleanup needed)
```

### Search Notes

```typescript
POST /api/notes/search

Request:
{
  query: string;              // Required
  limit?: number;             // Default: 20
  searchMode?: 'text' | 'vector' | 'hybrid' | 'title';
  tags?: string[];            // Filter by tags
}

Response:
{
  results: Note[];
  count: number;
  searchMode: string;
}

GET /api/notes/search?q=[query]

// Quick title search for autocomplete
Response:
{
  results: Array<{
    id: string;
    title: string;
    created_at: string;
  }>;
}
```

### Get Graph Data

```typescript
GET /api/notes/graph?focus=[noteId]&depth=2&orphans=true

Query Parameters:
- focus: UUID of note to focus on (optional)
- depth: How many hops from focus (default: 2)
- orphans: Include notes with no connections (default: true)

Response:
{
  nodes: Array<{
    id: string;
    title: string;
    tags: string[];
    bodyLength: number;
    linkCount: number;
  }>;
  edges: Array<{
    source: string;           // Note ID
    target: string;           // Note ID
    type: 'wiki' | 'parent' | 'tag' | 'semantic';
    weight: number;           // 0-1, link strength
  }>;
}
```

---

## Database Schema

### Tables

#### `notes`
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',

  parent_note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  created_from note_source NOT NULL DEFAULT 'manual',
  source_id UUID,  -- call_id, conversation_id, or message_id

  tags TEXT[] DEFAULT '{}',
  meta JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Auto-generated full-text search vector
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B')
  ) STORED,

  CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0)
);
```

**Indexes:**
- `idx_notes_user_id` - Fast user filtering
- `idx_notes_parent_note_id` - Hierarchical queries
- `idx_notes_tags` - GIN index for tag queries
- `idx_notes_search_vector` - GIN index for full-text search
- `idx_notes_created_at` - Sorted by creation time
- `idx_notes_updated_at` - Sorted by update time
- `idx_notes_title_trgm` - Trigram for fuzzy title search

#### `note_links`
```sql
CREATE TABLE note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  link_type note_link_type NOT NULL DEFAULT 'wiki',

  alias TEXT,  -- For [[Target|Alias]] syntax
  meta JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_note_link UNIQUE (source_note_id, target_note_id, link_type),
  CONSTRAINT no_self_links CHECK (source_note_id != target_note_id)
);
```

**Indexes:**
- `idx_note_links_source` - Find outgoing links
- `idx_note_links_target` - Find backlinks
- `idx_note_links_user_id` - User filtering
- `idx_note_links_type` - Filter by link type

#### `note_embeddings`
```sql
CREATE TABLE note_embeddings (
  id BIGSERIAL PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  model TEXT NOT NULL,       -- 'text-embedding-ada-002', etc.
  dims INTEGER NOT NULL,     -- 1536 for OpenAI, 384 for local
  embedding VECTOR,          -- pgvector type

  embedded_field TEXT NOT NULL DEFAULT 'body',
  meta JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_note_embedding UNIQUE (note_id, model, embedded_field)
);
```

**Indexes:**
- `idx_note_embeddings_note_id` - Note lookup
- `idx_note_embeddings_vector` - HNSW index for similarity search

#### `note_attachments`
```sql
CREATE TABLE note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,    -- Supabase Storage path
  file_size_bytes INTEGER,
  mime_type TEXT,

  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Enums

```sql
CREATE TYPE note_source AS ENUM ('manual', 'chat', 'call');
CREATE TYPE note_link_type AS ENUM ('wiki', 'parent', 'tag', 'semantic');
```

### Helper Functions

#### Get Backlinks
```sql
SELECT * FROM get_note_backlinks('note-uuid');

Returns:
- id: Note ID
- title: Note title
- link_type: Type of link
- created_at: When link was created
```

#### Get Children
```sql
SELECT * FROM get_note_children('note-uuid');

Returns:
- id: Child note ID
- title: Child note title
- created_at: When created
- child_count: Number of grandchildren
```

#### Get Breadcrumb Path
```sql
SELECT * FROM get_note_path('note-uuid');

Returns:
- id: Note ID in path
- title: Note title
- depth: Distance from target (0 = target, -1 = parent, etc.)
```

### Storage Bucket

**`note-attachments`:**
- Max file size: 10MB
- Allowed types: images, PDFs, markdown, text
- Structure: `/user_id/filename`
- RLS: Users can only access their own folder

---

## Implementation Details

### File Structure

```
web/
├── app/
│   ├── notes/
│   │   ├── page.tsx                    # Route entry point
│   │   └── _components/
│   │       ├── NotesClient.tsx         # Main container
│   │       ├── NoteEditor.tsx          # Markdown editor
│   │       ├── NoteTree.tsx            # Sidebar navigation
│   │       └── GraphView.tsx           # D3 visualization
│   └── api/
│       └── notes/
│           ├── create/route.ts         # POST create
│           ├── [id]/route.ts           # GET, PATCH, DELETE
│           ├── search/route.ts         # POST search
│           └── graph/route.ts          # GET graph data
│
├── lib/
│   └── supabase/
│       └── server.ts                   # Supabase client helper
│
packages/shared/
└── src/
    ├── utils/
    │   └── note-parser.ts              # Wiki link & tag parsing
    └── services/
        └── note-creation.ts            # Auto-create from calls/chat
```

### Component Architecture

**NotesClient.tsx** (Main Container)
- Manages global state (selected note, search, view mode)
- Coordinates between tree, editor, and graph
- Handles note CRUD operations
- Switches between editor and graph views

**NoteEditor.tsx** (Markdown Editor)
- Rich markdown editing with autocomplete
- Live preview toggle
- Auto-save with 2s debounce
- Displays metadata (tags, links, backlinks)
- Handles wiki link insertion

**NoteTree.tsx** (Sidebar)
- Hierarchical note list
- Search input
- Create note button
- Expandable folders for parent/child

**GraphView.tsx** (D3 Visualization)
- Force-directed layout simulation
- Zoom/pan controls
- Node click to select
- Legend and stats display

### Key Algorithms

#### Wiki Link Parsing
```typescript
// From packages/shared/src/utils/note-parser.ts

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function parseWikiLinks(markdown: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match;

  while ((match = WIKI_LINK_REGEX.exec(markdown)) !== null) {
    const [raw, target, alias] = match;
    links.push({
      target: target.trim(),
      alias: alias?.trim(),
      position: { start: match.index, end: match.index + raw.length },
      raw,
    });
  }

  return links;
}
```

#### Note Title Normalization
```typescript
export function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
```

This ensures `[[JavaScript Closures]]` matches note titled "javascript closures" or "JavaScript  Closures".

#### Tag Extraction
```typescript
const TAG_REGEX = /#([a-zA-Z0-9_-]+)/g;

export function parseTags(markdown: string): string[] {
  // Remove code blocks to avoid extracting tags from code
  const withoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, '');
  const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]+`/g, '');

  const tags = new Set<string>();
  let match;

  while ((match = TAG_REGEX.exec(withoutInlineCode)) !== null) {
    tags.add(match[1].toLowerCase());
  }

  return Array.from(tags);
}
```

#### Intent Detection (Chat)
```typescript
const NOTE_CREATION_PATTERNS = [
  /create\s+(?:a\s+)?note\s+(?:about|on|for)\s+(.+)/i,
  /make\s+(?:a\s+)?note\s+(?:about|of)\s+(.+)/i,
  /save\s+(?:this|that)\s+(?:as\s+)?(?:a\s+)?note/i,
  /remember\s+(?:this|that)\s*:?\s*(.+)/i,
];

export function detectNoteCreationIntent(message: string): NoteCreationIntent {
  for (const pattern of NOTE_CREATION_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return {
        shouldCreateNote: true,
        suggestedTitle: extractTitle(match[1] || message),
        suggestedBody: match[1] || message,
        extractedTags: extractHashtags(match[1] || message),
      };
    }
  }

  return { shouldCreateNote: false };
}
```

#### Graph Layout (D3.js)
```typescript
// Force simulation
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges)
    .id(d => d.id)
    .distance(d => d.type === 'wiki' ? 100 : 150)
    .strength(d => d.weight)
  )
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(30));
```

### Security

**Row-Level Security (RLS):**
All notes tables have RLS enabled:
```sql
-- Users can only see their own notes
CREATE POLICY notes_select_own ON notes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only modify their own notes
CREATE POLICY notes_update_own ON notes
  FOR UPDATE USING (auth.uid() = user_id);
```

**Storage Security:**
```sql
-- Users can only access their own folder
CREATE POLICY note_attachments_storage_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'note-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**API Security:**
- All routes check `auth.uid()`
- Unauthorized requests return 401
- Service role bypasses RLS (webhooks only)

### Performance Optimizations

**Database:**
- GIN indexes on arrays and tsvectors
- HNSW index for vector similarity
- Partial indexes (WHERE clauses) for filtered queries
- Generated columns for search vectors (no runtime overhead)

**Client:**
- Debounced auto-save (2s)
- Debounced search (300ms)
- React memo for expensive components
- D3 canvas for large graphs (future)

**API:**
- Edge runtime where possible (no cookies() dependency)
- Streaming responses for large datasets (future)
- Pagination for search results

---

## Future Enhancements

### Short-Term (Next Quarter)

**Vector Semantic Search:**
- Generate embeddings for all notes
- Hybrid search with RRF
- "Find similar notes" feature
- Auto-suggest related notes

**Enhanced Graph:**
- Clustering algorithm for topic discovery
- 3D graph option (Three.js)
- Timeline view (temporal graph)
- Export graph as image

**Editor Improvements:**
- Block-level references (Roam-style)
- LaTeX math support
- Mermaid diagrams
- Table editing UI

**Mobile App:**
- Quick capture
- Voice-to-note
- Offline support
- Widget for recent notes

### Medium-Term (Next 6 Months)

**Collaboration:**
- Share notes with other users
- Collaborative editing
- Comments and annotations
- Permission levels

**Advanced Features:**
- Version history with diffs
- Note templates
- Daily/weekly notes automation
- Spaced repetition integration

**Integrations:**
- Obsidian vault sync
- Notion import/export
- Browser extension for web clipping
- Slack/Discord bot

**AI Enhancements:**
- Auto-summarization
- Smart tag suggestions
- Duplicate note detection
- Link recommendations

### Long-Term (Future)

**Enterprise Features:**
- Team workspaces
- Admin dashboard
- Audit logs
- SSO/SAML

**Advanced Visualization:**
- Knowledge map heatmaps
- Topic evolution over time
- Influence graphs
- Custom graph layouts

**Publishing:**
- Public notes with custom domains
- Static site generation
- SEO optimization
- Analytics

---

## Troubleshooting

### Common Issues

**Notes not appearing in search**

Check:
1. RLS policies in Supabase (`user_id` matches)
2. `search_vector` column populated (check migration)
3. Try simple title search first: `GET /api/notes/search?q=test`

**Wiki links not autocompleting**

Check:
1. Network tab shows `/api/notes/search?q=...` request
2. Response contains notes
3. Browser console for JavaScript errors
4. Cursor is after `[[` in text

**Graph not rendering**

Check:
1. Browser console for D3 errors
2. `/api/notes/graph` returns valid JSON
3. At least 2 notes with 1 link exist
4. SVG element is visible (check CSS)

**Auto-save not working**

Check:
1. Network tab for 401/403 errors (auth issue)
2. Console shows debounce timer
3. `hasUnsavedChanges` state is true
4. API route logs show request

**Call notes not created**

Check:
1. Transcript length >50 characters
2. Webhook logs in `/api/webhooks/call`
3. `createNoteFromCallTranscript` called
4. Database logs show insert

### Debug Mode

Enable verbose logging:
```typescript
// In browser console
localStorage.setItem('debug_notes', 'true');

// In server logs
DEBUG=notes:* npm run dev
```

### Database Inspection

```sql
-- Check note count
SELECT COUNT(*) FROM notes WHERE user_id = 'your-user-id';

-- Check links
SELECT * FROM note_links WHERE user_id = 'your-user-id';

-- Check search vector
SELECT id, title, search_vector FROM notes LIMIT 5;

-- Find orphan notes
SELECT n.* FROM notes n
LEFT JOIN note_links l ON n.id = l.source_note_id OR n.id = l.target_note_id
WHERE l.id IS NULL;
```

---

## Support & Feedback

**Documentation:**
- This file: `/docs/NOTES.md`
- Architecture: `/docs/ARCHITECTURE.md`
- API schemas: `/web/app/api/notes/`

**Reporting Issues:**
1. Check troubleshooting section first
2. Review browser console for errors
3. Check Supabase logs
4. Open GitHub issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Browser/OS information

**Feature Requests:**
Submit ideas for future enhancements via GitHub issues with label `enhancement`.

---

**Built with:** Next.js 14, Supabase, D3.js, React Markdown, TailwindCSS

**Inspired by:** Obsidian, Roam Research, Notion, LogSeq

**Status:** ✅ Production Ready (v1.0.0 - November 2025)
