'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SaveIcon, TrashIcon, LinkIcon, TagIcon, ArrowLeftIcon, FileTextIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { parseNote, findPartialWikiLink } from '@/../../packages/shared/src/utils/note-parser';

interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  parent_note_id: string | null;
  outgoing_links?: Array<{
    id: string;
    target: { id: string; title: string };
    link_type: string;
  }>;
  incoming_links?: Array<{
    id: string;
    source: { id: string; title: string };
    link_type: string;
  }>;
  path?: Array<{ id: string; title: string; depth: number }>;
}

interface NoteEditorProps {
  noteId: string | null;
  onNoteUpdated: (note: Note) => void;
  onNoteDeleted: (noteId: string) => void;
  onNoteCreated: (note: Note) => void;
}

export default function NoteEditor({
  noteId,
  onNoteUpdated,
  onNoteDeleted,
  onNoteCreated,
}: NoteEditorProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch note when noteId changes
  useEffect(() => {
    if (noteId) {
      fetchNote(noteId);
    } else {
      setNote(null);
      setTitle('');
      setBody('');
    }
  }, [noteId]);

  const fetchNote = async (id: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/notes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setNote(data.note);
        setTitle(data.note.title);
        setBody(data.note.body);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to fetch note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!noteId || !note) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });

      if (res.ok) {
        const data = await res.json();
        setNote(data.note);
        onNoteUpdated(data.note);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!noteId || !confirm('Are you sure you want to delete this note?')) return;

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        onNoteDeleted(noteId);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBody = e.target.value;
    setBody(newBody);
    setHasUnsavedChanges(true);

    // Check for wiki link autocomplete
    const cursorPos = e.target.selectionStart;
    const partial = findPartialWikiLink(newBody, cursorPos);

    if (partial !== null) {
      setAutocompleteQuery(partial);
      fetchAutocomplete(partial);
    } else {
      setShowAutocomplete(false);
    }
  }, []);

  const fetchAutocomplete = async (query: string) => {
    try {
      const res = await fetch(`/api/notes/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setAutocompleteOptions(data.results.slice(0, 5));
        setShowAutocomplete(data.results.length > 0);
      }
    } catch (error) {
      console.error('Autocomplete failed:', error);
    }
  };

  const insertWikiLink = (noteTitle: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const before = body.substring(0, cursorPos);
    const after = body.substring(cursorPos);

    // Find the [[ before cursor
    const lastDoubleBracket = before.lastIndexOf('[[');
    const beforeLink = before.substring(0, lastDoubleBracket);

    const newBody = `${beforeLink}[[${noteTitle}]]${after}`;
    setBody(newBody);
    setShowAutocomplete(false);
    setHasUnsavedChanges(true);

    // Focus and move cursor after the link
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = beforeLink.length + noteTitle.length + 4; // 4 = [[ + ]]
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges || !noteId) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeout);
  }, [body, title, hasUnsavedChanges, noteId]);

  // Parse note metadata
  const parsed = parseNote(body);

  if (!noteId) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        <div className="text-center">
          <FileTextIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Select a note or create a new one to get started</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0b0f17]">
      {/* Editor Header */}
      <div className="border-b border-white/10 bg-white/5 p-4">
        {/* Breadcrumb */}
        {note?.path && note.path.length > 1 && (
          <div className="flex items-center gap-2 mb-3 text-sm text-white/60">
            {note.path.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                {idx > 0 && <span>/</span>}
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            setHasUnsavedChanges(true);
          }}
          placeholder="Untitled Note"
          className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-white/20
                   border-none outline-none focus:ring-0"
        />

        {/* Metadata Bar */}
        <div className="flex items-center gap-4 mt-3 text-sm text-white/60">
          <div className="flex items-center gap-1">
            <TagIcon className="w-4 h-4" />
            <span>{parsed.tags.length} tags</span>
          </div>
          <div className="flex items-center gap-1">
            <LinkIcon className="w-4 h-4" />
            <span>{parsed.wikiLinks.length} links</span>
          </div>
          {hasUnsavedChanges && (
            <span className="text-amber-400">Unsaved changes</span>
          )}
          {isSaving && <span className="text-violet-400">Saving...</span>}
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="border-b border-white/10 bg-white/5 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="px-3 py-1.5 text-sm rounded-lg bg-violet-500 hover:bg-violet-600
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            <SaveIcon className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-red-500/20
                     text-red-400 transition-colors flex items-center gap-1.5"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          {showPreview ? (
            <div className="prose prose-invert prose-violet max-w-none">
              <ReactMarkdown>{body}</ReactMarkdown>
            </div>
          ) : (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={handleBodyChange}
                placeholder="Start writing... Use [[Note Title]] for wiki links and #tags for organization"
                className="w-full h-[calc(100vh-280px)] bg-transparent text-white resize-none
                         border-none outline-none focus:ring-0 font-mono text-sm leading-relaxed"
              />

              {/* Autocomplete Dropdown */}
              {showAutocomplete && autocompleteOptions.length > 0 && (
                <div className="absolute bg-[#1a1f2e] border border-white/20 rounded-lg shadow-xl
                             mt-1 w-64 max-h-48 overflow-y-auto z-10">
                  {autocompleteOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => insertWikiLink(option.title)}
                      className="w-full text-left px-4 py-2 hover:bg-violet-500/20 text-sm
                               text-white/80 hover:text-white transition-colors"
                    >
                      {option.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Links & Tags */}
        <aside className="w-64 border-l border-white/10 bg-white/5 p-4 overflow-y-auto">
          {/* Tags */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/60 mb-2 flex items-center gap-1.5">
              <TagIcon className="w-4 h-4" />
              Tags
            </h3>
            {parsed.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {parsed.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-violet-500/20 text-violet-300 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40">Add #tags to your note</p>
            )}
          </div>

          {/* Outgoing Links */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/60 mb-2 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4" />
              Links ({note?.outgoing_links?.length || 0})
            </h3>
            {note?.outgoing_links && note.outgoing_links.length > 0 ? (
              <div className="space-y-1">
                {note.outgoing_links.map(link => (
                  <div
                    key={link.id}
                    className="text-sm text-violet-300 hover:text-violet-200 cursor-pointer"
                  >
                    → {link.target.title}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40">No outgoing links</p>
            )}
          </div>

          {/* Backlinks */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-2 flex items-center gap-1.5">
              <ArrowLeftIcon className="w-4 h-4" />
              Backlinks ({note?.incoming_links?.length || 0})
            </h3>
            {note?.incoming_links && note.incoming_links.length > 0 ? (
              <div className="space-y-1">
                {note.incoming_links.map(link => (
                  <div
                    key={link.id}
                    className="text-sm text-cyan-300 hover:text-cyan-200 cursor-pointer"
                  >
                    ← {link.source.title}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40">No backlinks</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
