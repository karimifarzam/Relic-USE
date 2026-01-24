import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import * as fileStorage from './fileStorage';

interface Recording {
  id: number;
  session_id: number;
  timestamp: string;
  window_name: string;
  window_id: string;
  thumbnail: string;
  screenshot: string;
  screenshot_path: string | null;
  type: 'passive' | 'tasked';
  label: string | null;
}

/**
 * Migrate legacy Base64 recordings to file-based storage
 * This function:
 * 1. Finds all recordings without screenshot_path
 * 2. Saves their screenshots as PNG files
 * 3. Updates the database with file paths
 */
export async function migrateRecordingsToFiles(): Promise<{
  success: boolean;
  migrated: number;
  failed: number;
  errors: Array<{ recordingId: number; error: string }>;
}> {
  const db = new Database(path.join(app.getPath('userData'), 'sessions.sqlite'));

  const results = {
    success: true,
    migrated: 0,
    failed: 0,
    errors: [] as Array<{ recordingId: number; error: string }>,
  };

  try {
    // Get all recordings that don't have a screenshot_path
    const stmt = db.prepare(
      `SELECT * FROM recordings WHERE screenshot_path IS NULL OR screenshot_path = ''`
    );
    const rows = stmt.all() as Recording[];

    if (!rows || rows.length === 0) {
      console.log('No recordings to migrate');
      return results;
    }

    console.log(`Found ${rows.length} recordings to migrate`);

    // Process each recording
    for (const recording of rows) {
      try {
        // Skip if screenshot is empty or not a valid Base64 string
        if (!recording.screenshot || !recording.screenshot.includes('base64,')) {
          console.log(`Skipping recording ${recording.id} - invalid screenshot data`);
          results.failed++;
          results.errors.push({
            recordingId: recording.id,
            error: 'Invalid screenshot data',
          });
          continue;
        }

        // Save screenshot as PNG file
        const screenshotPath = fileStorage.saveScreenshot(
          recording.session_id,
          recording.id,
          recording.screenshot,
        );

        // Update database with file path
        const updateStmt = db.prepare(
          `UPDATE recordings SET screenshot_path = ? WHERE id = ?`
        );
        updateStmt.run(screenshotPath, recording.id);

        console.log(
          `Migrated recording ${recording.id} to file: ${screenshotPath}`,
        );
        results.migrated++;
      } catch (error: any) {
        console.error(`Failed to migrate recording ${recording.id}:`, error);
        results.failed++;
        results.errors.push({
          recordingId: recording.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Update metadata for all affected sessions
    const uniqueSessionIds = [...new Set(rows.map((r) => r.session_id))];
    console.log(`Updating metadata for ${uniqueSessionIds.length} sessions`);

    for (const sessionId of uniqueSessionIds) {
      try {
        // Import dbHelpers dynamically to avoid circular dependencies
        const { dbHelpers } = await import('./db');

        await fileStorage.updateSessionMetadata(
          sessionId,
          dbHelpers.getSession,
          dbHelpers.getSessionRecordings,
          dbHelpers.getSessionComments,
        );

        console.log(`Updated metadata for session ${sessionId}`);
      } catch (error: any) {
        console.error(
          `Failed to update metadata for session ${sessionId}:`,
          error,
        );
        // Don't count this as a failed migration, just log it
      }
    }

    if (results.failed > 0) {
      results.success = false;
    }

    console.log(
      `Migration complete: ${results.migrated} migrated, ${results.failed} failed`,
    );
  } catch (err: any) {
    console.error('Error fetching recordings for migration:', err);
    results.success = false;
    results.errors.push({ recordingId: -1, error: err.message });
  }

  return results;
}

/**
 * Clean up old Base64 data from database after successful migration
 * This should only be run after confirming the migration was successful
 * and files are accessible
 *
 * WARNING: This will permanently delete Base64 data from the database!
 */
export async function cleanupLegacyBase64Data(): Promise<{
  success: boolean;
  cleaned: number;
  error?: string;
}> {
  const db = new Database(path.join(app.getPath('userData'), 'sessions.sqlite'));

  try {
    // Only clean up recordings that have a valid screenshot_path
    const stmt = db.prepare(`
      UPDATE recordings
      SET screenshot = '', thumbnail = ''
      WHERE screenshot_path IS NOT NULL AND screenshot_path != ''
    `);
    const info = stmt.run();

    console.log(`Cleaned up Base64 data from ${info.changes} recordings`);
    return {
      success: true,
      cleaned: info.changes,
    };
  } catch (err: any) {
    console.error('Error cleaning up Base64 data:', err);
    return {
      success: false,
      cleaned: 0,
      error: err.message,
    };
  }
}

/**
 * Verify migration by checking if files exist for all recordings
 */
export async function verifyMigration(): Promise<{
  success: boolean;
  total: number;
  valid: number;
  invalid: number;
  details: Array<{ recordingId: number; sessionId: number; error: string }>;
}> {
  const db = new Database(path.join(app.getPath('userData'), 'sessions.sqlite'));

  const results = {
    success: true,
    total: 0,
    valid: 0,
    invalid: 0,
    details: [] as Array<{ recordingId: number; sessionId: number; error: string }>,
  };

  try {
    const stmt = db.prepare(`SELECT id, session_id, screenshot_path FROM recordings`);
    const rows = stmt.all() as Array<{
      id: number;
      session_id: number;
      screenshot_path: string | null;
    }>;

    results.total = rows.length;

    for (const row of rows) {
      if (!row.screenshot_path) {
        results.invalid++;
        results.details.push({
          recordingId: row.id,
          sessionId: row.session_id,
          error: 'No screenshot_path set',
        });
        continue;
      }

      // Try to read the file
      const fileData = fileStorage.readScreenshot(row.screenshot_path);
      if (!fileData) {
        results.invalid++;
        results.details.push({
          recordingId: row.id,
          sessionId: row.session_id,
          error: `File not found: ${row.screenshot_path}`,
        });
      } else {
        results.valid++;
      }
    }

    results.success = results.invalid === 0;
    console.log(
      `Verification complete: ${results.valid}/${results.total} valid, ${results.invalid} invalid`,
    );
  } catch (err) {
    console.error('Error verifying migration:', err);
    results.success = false;
  }

  return results;
}
