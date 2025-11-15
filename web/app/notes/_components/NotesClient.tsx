'use client';

import { useState, useEffect } from 'react';
import NoteTree from './NoteTree';
import NoteEditor from './NoteEditor';
import GraphView from './GraphView';
import { SearchIcon, LayoutGridIcon, FileTextIcon } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  parent_note_id: string | null;
}

/**
 * Main notes client component with three-panel layout
 */
export default function NotesClient() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all notes on mount
  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/notes/search?q=');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchNotes();
      return;
    }

    try {
      const res = await fetch('/api/notes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, searchMode: 'text', limit: 50 }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes(data.results || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleNoteCreated = (note: Note) => {
    setNotes(prev => [note, ...prev]);
    setSelectedNoteId(note.id);
  };

  const handleNoteUpdated = (note: Note) => {
    setNotes(prev => prev.map(n => (n.id === note.id ? note : n)));
  };

  const handleNoteDeleted = (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0f17] text-white overflow-hidden">
      {/* Left Sidebar: Note Tree */}
      <aside className="w-80 border-r border-white/10 flex flex-col bg-white/5">
        {/* Search Header */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm
                       placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        </div>

        {/* Note Tree */}
        <div className="flex-1 overflow-y-auto">
          <NoteTree
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
            onNoteCreated={handleNoteCreated}
            isLoading={isLoading}
          />
        </div>
      </aside>

      {/* Center: Editor or Graph */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 border-b border-white/10 bg-white/5 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5 text-violet-400" />
            <h1 className="text-lg font-semibold">
              {viewMode === 'editor' ? 'Notes' : 'Knowledge Graph'}
            </h1>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'editor'
                  ? 'bg-violet-500 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <FileTextIcon className="w-4 h-4 inline-block mr-1.5" />
              Editor
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'graph'
                  ? 'bg-violet-500 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <LayoutGridIcon className="w-4 h-4 inline-block mr-1.5" />
              Graph
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'editor' ? (
            <NoteEditor
              noteId={selectedNoteId}
              onNoteUpdated={handleNoteUpdated}
              onNoteDeleted={handleNoteDeleted}
              onNoteCreated={handleNoteCreated}
            />
          ) : (
            <GraphView
              focusNoteId={selectedNoteId}
              onNodeClick={setSelectedNoteId}
            />
          )}
        </div>
      </main>
    </div>
  );
}
