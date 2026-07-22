import Dexie, { type Table } from 'dexie';
import { encryptPayload, decryptPayload } from '../crypto/security';

export interface EncryptedNoteRecord {
  id: string;
  encryptedTitle: string;
  titleIv: string;
  encryptedContent: string;
  contentIv: string;
  category: 'To-Do' | 'Idea' | 'Vent' | 'Reference' | 'Uncategorized';
  sentiment: 'positive' | 'neutral' | 'urgent' | 'reflective';
  matrixQuadrant: 'do-first' | 'schedule' | 'delegate' | 'eliminate';
  tags: string[];
  entities: string[];
  isArchived: number; // 0 = active, 1 = archived (indexed by Dexie)
  createdAt: number;
  updatedAt: number;
}

export interface DecryptedNote {
  id: string;
  title: string;
  content: string;
  category: 'To-Do' | 'Idea' | 'Vent' | 'Reference' | 'Uncategorized';
  sentiment: 'positive' | 'neutral' | 'urgent' | 'reflective';
  matrixQuadrant: 'do-first' | 'schedule' | 'delegate' | 'eliminate';
  tags: string[];
  entities: string[];
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TagRecord {
  id: string;
  name: string;
  count: number;
}

export interface SyncQueueRecord {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId: string;
  payload: string; // JSON string of action
  status: 'pending' | 'synced' | 'failed';
  timestamp: number;
}

export interface UserSecurityRecord {
  id: string; // 'master'
  saltBase64: string;
  verificationHash: string;
  webAuthnCredentialId: string | null;
  autoLockMinutes: number;
  createdAt: number;
}

export class MindSpillDatabase extends Dexie {
  notes!: Table<EncryptedNoteRecord, string>;
  tags!: Table<TagRecord, string>;
  syncQueue!: Table<SyncQueueRecord, string>;
  userSecurity!: Table<UserSecurityRecord, string>;

  constructor() {
    super('MindSpillDB');
    this.version(1).stores({
      notes: 'id, category, sentiment, isArchived, matrixQuadrant, createdAt, updatedAt',
      tags: 'id, name, count',
      syncQueue: 'id, status, timestamp',
      userSecurity: 'id',
    });
  }
}

export const db = typeof window !== 'undefined' ? new MindSpillDatabase() : ({} as MindSpillDatabase);

/**
 * Natural Language Parser for Smart Tagging, Entities, Category & Eisenhower Matrix
 */
export function analyzeBrainDump(text: string): {
  tags: string[];
  entities: string[];
  category: EncryptedNoteRecord['category'];
  sentiment: EncryptedNoteRecord['sentiment'];
  matrixQuadrant: EncryptedNoteRecord['matrixQuadrant'];
} {
  // Extract #tags
  const tagMatches = text.match(/#([\w-]+)/g) || [];
  const tags = Array.from(new Set(tagMatches.map((t) => t.slice(1).toLowerCase())));

  // Extract @entities
  const entityMatches = text.match(/@([\w-]+)/g) || [];
  const entities = Array.from(new Set(entityMatches.map((e) => e.slice(1))));

  const lower = text.toLowerCase();

  // Smart Category Detection
  let category: EncryptedNoteRecord['category'] = 'Uncategorized';
  if (lower.includes('todo') || lower.includes('task') || lower.includes('must') || lower.includes('[ ]') || lower.includes('need to')) {
    category = 'To-Do';
  } else if (lower.includes('idea') || lower.includes('what if') || lower.includes('feature') || lower.includes('concept')) {
    category = 'Idea';
  } else if (lower.includes('feel') || lower.includes('frustrated') || lower.includes('annoyed') || lower.includes('rant') || lower.includes('vent')) {
    category = 'Vent';
  } else if (lower.includes('http') || lower.includes('link') || lower.includes('note') || lower.includes('ref') || lower.includes('documentation')) {
    category = 'Reference';
  }

  // Sentiment Analysis
  let sentiment: EncryptedNoteRecord['sentiment'] = 'neutral';
  if (lower.includes('asap') || lower.includes('urgent') || lower.includes('critical') || lower.includes('deadline') || lower.includes('today!')) {
    sentiment = 'urgent';
  } else if (lower.includes('great') || lower.includes('awesome') || lower.includes('love') || lower.includes('excited') || lower.includes('win')) {
    sentiment = 'positive';
  } else if (lower.includes('think') || lower.includes('wonder') || lower.includes('reflect') || lower.includes('journal')) {
    sentiment = 'reflective';
  }

  // Eisenhower Matrix Quadrant Assignment
  let matrixQuadrant: EncryptedNoteRecord['matrixQuadrant'] = 'schedule';
  if (sentiment === 'urgent' || lower.includes('now') || lower.includes('do first') || lower.includes('asap')) {
    matrixQuadrant = 'do-first';
  } else if (lower.includes('delegate') || lower.includes('assign') || lower.includes('@')) {
    matrixQuadrant = 'delegate';
  } else if (lower.includes('maybe') || lower.includes('someday') || lower.includes('later')) {
    matrixQuadrant = 'eliminate';
  }

  return { tags, entities, category, sentiment, matrixQuadrant };
}

/**
 * Create or Save Encrypted Note
 */
export async function saveEncryptedNote(
  title: string,
  content: string,
  key: CryptoKey,
  existingId?: string,
  overrideQuadrant?: EncryptedNoteRecord['matrixQuadrant']
): Promise<string> {
  const noteId = existingId || `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const encryptedTitleObj = await encryptPayload(title || 'Untitled Dump', key);
  const encryptedContentObj = await encryptPayload(content, key);
  
  const analysis = analyzeBrainDump(`${title} ${content}`);

  const record: EncryptedNoteRecord = {
    id: noteId,
    encryptedTitle: encryptedTitleObj.ciphertext,
    titleIv: encryptedTitleObj.iv,
    encryptedContent: encryptedContentObj.ciphertext,
    contentIv: encryptedContentObj.iv,
    category: analysis.category,
    sentiment: analysis.sentiment,
    matrixQuadrant: overrideQuadrant || analysis.matrixQuadrant,
    tags: analysis.tags,
    entities: analysis.entities,
    isArchived: 0,
    createdAt: existingId ? (await db.notes.get(existingId))?.createdAt || Date.now() : Date.now(),
    updatedAt: Date.now(),
  };

  await db.notes.put(record);

  // Update tag counters
  for (const tag of analysis.tags) {
    const existingTag = await db.tags.get(tag);
    if (existingTag) {
      await db.tags.update(tag, { count: existingTag.count + 1 });
    } else {
      await db.tags.put({ id: tag, name: tag, count: 1 });
    }
  }

  // Add to local mutations sync queue
  await db.syncQueue.put({
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    action: existingId ? 'UPDATE' : 'CREATE',
    entityId: noteId,
    payload: JSON.stringify({ id: noteId, updatedAt: record.updatedAt }),
    status: 'pending',
    timestamp: Date.now(),
  });

  return noteId;
}

/**
 * Decrypt Note Record
 */
export async function decryptNoteRecord(record: EncryptedNoteRecord, key: CryptoKey): Promise<DecryptedNote> {
  let title = 'Untitled Dump';
  let content = '';

  try {
    title = await decryptPayload(record.encryptedTitle, record.titleIv, key);
    content = await decryptPayload(record.encryptedContent, record.contentIv, key);
  } catch (err) {
    console.error(`Failed to decrypt note ${record.id}:`, err);
    title = '🔒 Decryption Error (Invalid Key)';
    content = '[Encrypted payload could not be decrypted with current key]';
  }

  return {
    id: record.id,
    title,
    content,
    category: record.category,
    sentiment: record.sentiment,
    matrixQuadrant: record.matrixQuadrant,
    tags: record.tags,
    entities: record.entities,
    isArchived: record.isArchived === 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Toggle Archive Status for Note
 */
export async function toggleArchiveNote(noteId: string, archiveStatus: boolean): Promise<void> {
  await db.notes.update(noteId, {
    isArchived: archiveStatus ? 1 : 0,
    updatedAt: Date.now(),
  });

  await db.syncQueue.put({
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    action: 'UPDATE',
    entityId: noteId,
    payload: JSON.stringify({ id: noteId, isArchived: archiveStatus }),
    status: 'pending',
    timestamp: Date.now(),
  });
}

/**
 * Delete Note Permanently
 */
export async function deleteNoteRecord(noteId: string): Promise<void> {
  await db.notes.delete(noteId);
  await db.syncQueue.put({
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    action: 'DELETE',
    entityId: noteId,
    payload: JSON.stringify({ id: noteId }),
    status: 'pending',
    timestamp: Date.now(),
  });
}
