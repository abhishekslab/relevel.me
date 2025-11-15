'use client';

import { useState } from 'react';
import { FileTextIcon, PlusIcon, FolderIcon } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  created_at: string;
  parent_note_id: string | null;
  tags?: string[];
}

interface NoteTreeProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNoteCreated: (note: any) => void;
  isLoading: boolean;
}

export default function NoteTree({
  notes,
  selectedNoteId,
  onSelectNote,
  onNoteCreated,
  isLoading,
}: NoteTreeProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    try {
      const res = await fetch('/api/notes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNoteTitle.trim(),
          body: '',
          createdFrom: 'manual',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onNoteCreated(data.note);
        setNewNoteTitle('');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  // Group notes by parent
  const topLevelNotes = notes.filter(n => !n.parent_note_id);
  const childNotes = notes.filter(n => n.parent_note_id);

  return (
    <div className="p-2">
      {/* Create Note Button */}
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full flex items-center gap-2 px-3 py-2 mb-2 text-sm text-white/60
                   hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          New Note
        </button>
      ) : (
        <form onSubmit={handleCreateNote} className="mb-2">
          <input
            type="text"
            value={newNoteTitle}
            onChange={e => setNewNoteTitle(e.target.value)}
            placeholder="Note title..."
            autoFocus
            className="w-full bg-white/10 border border-violet-500/50 rounded-lg px-3 py-2 text-sm
                     placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            onBlur={() => {
              if (!newNoteTitle.trim()) {
                setIsCreating(false);
              }
            }}
          />
        </form>
      )}

      {/* Notes List */}
      {isLoading ? (
        <div className="text-center py-8 text-white/40 text-sm">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-white/40 text-sm">
          No notes yet. Create your first note!
        </div>
      ) : (
        <div className="space-y-0.5">
          {topLevelNotes.map(note => (
            <NoteTreeItem
              key={note.id}
              note={note}
              isSelected={selectedNoteId === note.id}
              onSelect={onSelectNote}
              children={childNotes.filter(c => c.parent_note_id === note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NoteTreeItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: (id: string) => void;
  children?: Note[];
  depth?: number;
}

function NoteTreeItem({
  note,
  isSelected,
  onSelect,
  children = [],
  depth = 0,
}: NoteTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = children.length > 0;

  return (
    <div>
      <button
        onClick={() => onSelect(note.id)}
        onDoubleClick={() => hasChildren && setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                   ${isSelected ? 'bg-violet-500/20 text-white border border-violet-500/50' : 'text-white/80 hover:bg-white/5'}`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {hasChildren ? (
          <FolderIcon className="w-4 h-4 flex-shrink-0 text-violet-400" />
        ) : (
          <FileTextIcon className="w-4 h-4 flex-shrink-0 text-white/40" />
        )}
        <span className="truncate flex-1 text-left">{note.title}</span>
        {note.tags && note.tags.length > 0 && (
          <span className="text-xs text-white/40">#{note.tags[0]}</span>
        )}
      </button>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {children.map(child => (
            <NoteTreeItem
              key={child.id}
              note={child}
              isSelected={isSelected}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
