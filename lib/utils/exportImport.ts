/**
 * MindSpill Data Portability & Backup Engine
 * Supports encrypted full DB backups and decrypted Markdown / JSON exports.
 */

import { db, type EncryptedNoteRecord, type DecryptedNote, decryptNoteRecord, saveEncryptedNote } from '../db';

/**
 * Export all notes as a single zip or formatted Markdown bundle
 */
export async function exportNotesAsMarkdown(masterKey: CryptoKey): Promise<void> {
  const records = await db.notes.where('isArchived').equals(0).toArray();
  const decryptedNotes: DecryptedNote[] = [];

  for (const record of records) {
    const note = await decryptNoteRecord(record, masterKey);
    decryptedNotes.push(note);
  }

  let fullMarkdown = `# MindSpill Brain Dump Export\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

  decryptedNotes.forEach((note, idx) => {
    fullMarkdown += `## ${idx + 1}. ${note.title}\n`;
    fullMarkdown += `**Created:** ${new Date(note.createdAt).toLocaleString()} | **Category:** ${note.category} | **Sentiment:** ${note.sentiment} | **Matrix:** ${note.matrixQuadrant}\n`;
    if (note.tags.length > 0) fullMarkdown += `**Tags:** ${note.tags.map((t) => `#${t}`).join(' ')}\n`;
    if (note.entities.length > 0) fullMarkdown += `**Entities:** ${note.entities.map((e) => `@${e}`).join(' ')}\n`;
    fullMarkdown += `\n${note.content}\n\n---\n\n`;
  });

  const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mindspill_export_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export complete encrypted database backup (Zero-Knowledge JSON)
 */
export async function exportEncryptedJSONBackup(): Promise<void> {
  const notes = await db.notes.toArray();
  const tags = await db.tags.toArray();
  const userSecurity = await db.userSecurity.toArray();

  const backupData = {
    version: 1,
    appName: 'MindSpill',
    timestamp: Date.now(),
    notes,
    tags,
    userSecurity,
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mindspill_encrypted_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import encrypted database backup JSON file
 */
export async function importJSONBackup(fileContent: string, masterKey: CryptoKey): Promise<{ importedCount: number }> {
  try {
    const data = JSON.parse(fileContent);
    if (!data || !data.notes || !Array.isArray(data.notes)) {
      throw new Error('Invalid backup file format');
    }

    let count = 0;
    for (const rawNote of data.notes as EncryptedNoteRecord[]) {
      // Re-save or put into IndexedDB
      await db.notes.put(rawNote);
      count++;
    }

    return { importedCount: count };
  } catch (err) {
    console.error('Import failed:', err);
    throw err;
  }
}
