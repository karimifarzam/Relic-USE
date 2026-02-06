import { supabase } from './supabase';
import { dbHelpers } from './db';
import { getCurrentUser } from './auth';
import * as fileStorage from './fileStorage';
import { getLatestTimelineTimeSeconds } from '../shared/sessionTimeline';

interface SubmissionResult {
  success: boolean;
  error?: string;
  sessionId?: string;
  pointsEarned?: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface UploadProgress {
  current: number;
  total: number;
  status: string;
}

function deriveDurationSeconds(
  recordedDuration: number | null | undefined,
  recordings: Array<{ timestamp?: string | null }>,
): number {
  if (recordings.length > 0) {
    return getLatestTimelineTimeSeconds(recordings);
  }
  return Math.max(0, Math.floor(recordedDuration || 0));
}

/**
 * Convert a PNG payload to a Blob for upload.
 * Accepts either a data URL (`data:image/...;base64,`) or a raw Buffer.
 */
function pngToBlob(png: string | Buffer): Blob {
  const buffer =
    typeof png === 'string'
      ? Buffer.from(png.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      : png;

  return new Blob([buffer], { type: 'image/png' });
}

/**
 * Upload image to Supabase Storage
 * @param base64Image Base64 encoded image
 * @param bucket Storage bucket name ('thumbnails' or 'screenshots')
 * @param path File path in bucket
 * @returns Public URL of uploaded image or null on failure
 */
async function uploadImageToStorage(
  png: string | Buffer,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const blob = pngToBlob(png);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      console.error(`Storage upload error for ${path}:`, error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error(`Exception uploading image to ${path}:`, error);
    return null;
  }
}

/**
 * Upload image with retry logic
 */
async function uploadImageWithRetry(
  png: string | Buffer,
  bucket: string,
  path: string,
  maxRetries: number = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const url = await uploadImageToStorage(png, bucket, path);
    if (url) return url;

    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  return null;
}

/**
 * Upload JSON to Supabase Storage
 * @param jsonData JSON object to upload
 * @param bucket Storage bucket name
 * @param path File path in bucket
 * @returns Public URL of uploaded JSON or null on failure
 */
async function uploadJsonToStorage(
  jsonData: any,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType: 'application/json',
        upsert: false,
      });

    if (error) {
      console.error(`JSON upload error for ${path}:`, error);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error(`Exception uploading JSON to ${path}:`, error);
    return null;
  }
}

/**
 * Upload JSON with retry logic
 */
async function uploadJsonWithRetry(
  jsonData: any,
  bucket: string,
  path: string,
  maxRetries: number = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const url = await uploadJsonToStorage(jsonData, bucket, path);
    if (url) return url;

    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  return null;
}

/**
 * Validate session before submission
 */
export async function validateSessionForSubmission(
  sessionId: number
): Promise<ValidationResult> {
  try {
    // Get session details
    const session = await dbHelpers.getSession(sessionId);
    if (!session) {
      return { valid: false, error: 'Session not found' };
    }

    // Check if already submitted
    if (session.approval_state !== 'draft') {
      return {
        valid: false,
        error: 'Session has already been submitted',
      };
    }

    // Get recordings
    const recordings = await dbHelpers.getSessionRecordings(sessionId);
    if (!recordings || recordings.length === 0) {
      return {
        valid: false,
        error: 'Session must have at least one recording',
      };
    }

    const effectiveDuration = deriveDurationSeconds(session.duration, recordings);
    if (!Number.isFinite(effectiveDuration) || effectiveDuration < 0) {
      return {
        valid: false,
        error: 'Session must have a valid duration',
      };
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Validation failed',
    };
  }
}

/**
 * Main submission function - uploads session, recordings, and comments to Supabase
 */
export async function submitSessionToSupabase(
  userId: string,
  sessionId: number,
  onProgress?: (progress: UploadProgress) => void
): Promise<SubmissionResult> {
  try {
    // 1. Validate session
    const validation = await validateSessionForSubmission(sessionId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 2. Get session data
    const session = await dbHelpers.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // 3. Get recordings
    const recordings = await dbHelpers.getSessionRecordings(sessionId);
    if (!recordings) {
      return { success: false, error: 'Failed to fetch recordings' };
    }
    if (recordings.length === 0) {
      return { success: false, error: 'Session must have at least one recording' };
    }

    const effectiveDuration = deriveDurationSeconds(session.duration, recordings);
    if (!Number.isFinite(effectiveDuration) || effectiveDuration < 0) {
      return { success: false, error: 'Session must have a valid duration' };
    }

    if (session.duration !== effectiveDuration) {
      try {
        await dbHelpers.updateDuration(sessionId, effectiveDuration);
      } catch (error) {
        console.warn(
          `Failed to persist derived duration for session ${sessionId}:`,
          error,
        );
      }
    }

    // 4. Get comments
    const comments = await dbHelpers.getSessionComments(sessionId);

    onProgress?.({
      current: 0,
      total: recordings.length, // 1 screenshot per recording
      status: 'Preparing upload...',
    });

    // 5. Create session in Supabase
    const { data: supabaseSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        duration: effectiveDuration,
        created_at: session.created_at,
        approval_state: 'submitted',
        session_status: session.session_status || 'passive',
      })
      .select()
      .single();

    if (sessionError || !supabaseSession) {
      console.error('Session creation error:', sessionError);
      return {
        success: false,
        error: 'Failed to create session in database',
      };
    }

    const supabaseSessionId = supabaseSession.id;

    // 6. Upload recordings with images
    const recordingsToInsert = [];
    let uploadedCount = 0;

    for (const recording of recordings) {
      // Prefer reading from disk (file-based storage), fall back to legacy Base64 if needed.
      let screenshotData: string | Buffer;
      if (recording.screenshot_path) {
        const fileBuffer = fileStorage.readScreenshotBuffer(recording.screenshot_path);
        if (fileBuffer) {
          screenshotData = fileBuffer;
        } else {
          const fileDataUrl = fileStorage.readScreenshot(recording.screenshot_path);
          screenshotData = fileDataUrl || recording.screenshot;
        }
      } else {
        screenshotData = recording.screenshot;
      }

      // Upload screenshot
      onProgress?.({
        current: uploadedCount,
        total: recordings.length,
        status: `Uploading screenshot ${uploadedCount + 1} of ${recordings.length}...`,
      });

      const screenshotPath = `${userId}/${supabaseSessionId}/screenshot_${recording.id}.png`;
      const screenshotUrl = await uploadImageWithRetry(
        screenshotData,
        'recordings',
        screenshotPath
      );

      if (!screenshotUrl) {
        // Rollback: delete session and uploaded images
        await supabase.from('sessions').delete().eq('id', supabaseSessionId);
        // Note: Storage cleanup would need to be done manually or via Supabase function
        return {
          success: false,
          error: `Failed to upload screenshot for recording ${recording.id}`,
        };
      }

      uploadedCount++;

      // Prepare recording data for insertion
      recordingsToInsert.push({
        user_id: userId,
        session_id: supabaseSessionId,
        timestamp: recording.timestamp,
        window_name: recording.window_name,
        window_id: recording.window_id,
        thumbnail_url: screenshotUrl, // Use same URL as screenshot
        screenshot_url: screenshotUrl,
        type: recording.type,
        label: recording.label || null,
      });
    }

    // 7. Bulk insert recordings
    onProgress?.({
      current: uploadedCount,
      total: recordings.length,
      status: 'Saving recordings to database...',
    });

    const { error: recordingsError } = await supabase
      .from('recordings')
      .insert(recordingsToInsert);

    if (recordingsError) {
      console.error('Recordings insert error:', recordingsError);
      // Rollback
      await supabase.from('sessions').delete().eq('id', supabaseSessionId);
      return {
        success: false,
        error: 'Failed to save recordings to database',
      };
    }

    // 8. Insert comments if any
    if (comments && comments.length > 0) {
      onProgress?.({
        current: uploadedCount,
        total: recordings.length,
        status: 'Saving comments...',
      });

      const commentsToInsert = comments.map((comment) => ({
        user_id: userId,
        session_id: supabaseSessionId,
        start_time: comment.start_time,
        end_time: comment.end_time,
        comment: comment.comment,
        created_at: comment.created_at,
      }));

      const { error: commentsError } = await supabase
        .from('comments')
        .insert(commentsToInsert);

      if (commentsError) {
        console.error('Comments insert error:', commentsError);
        // Don't rollback entire submission for comment failures
        // Just log the error
      }
    }

    // 9. Calculate points (example: 5 points per minute)
    const pointsEarned = Math.floor(effectiveDuration / 60) * 5;

    // 10. Update user points
    if (pointsEarned > 0) {
      const { updateUserPoints } = await import('./auth');
      await updateUserPoints(userId, pointsEarned);
    }

    // 11. Upload session metadata JSON
    onProgress?.({
      current: recordings.length,
      total: recordings.length,
      status: 'Uploading metadata...',
    });

    const sessionMetadata = {
      local_session_id: sessionId,
      supabase_session_id: supabaseSessionId,
      user_id: userId,
      created_at: session.created_at,
      submitted_at: new Date().toISOString(),
      duration: effectiveDuration,
      session_status: session.session_status || 'passive',
      task_id: session.task_id || null,
      reward_id: session.reward_id || null,
      points_earned: pointsEarned,
      recordings: recordingsToInsert.map((rec, index) => ({
        local_id: recordings[index]?.id,
        timestamp: rec.timestamp,
        window_name: rec.window_name,
        window_id: rec.window_id,
        screenshot_url: rec.screenshot_url,
        screenshot_file: `screenshot_${recordings[index]?.id}.png`,
        type: rec.type,
        label: rec.label,
      })),
      comments: comments?.map((comment) => ({
        start_time: comment.start_time,
        end_time: comment.end_time,
        comment: comment.comment,
        created_at: comment.created_at,
      })) || [],
    };

    const metadataPath = `${userId}/${supabaseSessionId}/session_info.json`;
    const metadataUrl = await uploadJsonWithRetry(
      sessionMetadata,
      'recordings',
      metadataPath
    );

    if (!metadataUrl) {
      console.warn('Failed to upload session metadata JSON, but continuing with submission');
      // Don't fail the entire submission for metadata upload failure
    } else {
      console.log('Session metadata uploaded successfully:', metadataUrl);
    }

    onProgress?.({
      current: recordings.length,
      total: recordings.length,
      status: 'Complete!',
    });

    return {
      success: true,
      sessionId: supabaseSessionId,
      pointsEarned,
    };
  } catch (error: any) {
    console.error('Submission error:', error);
    return {
      success: false,
      error: error.message || 'Submission failed',
    };
  }
}

/**
 * Get submission progress callback for IPC communication
 */
export function createProgressCallback(
  webContents: Electron.WebContents
): (progress: UploadProgress) => void {
  return (progress: UploadProgress) => {
    webContents.send('submission-progress', progress);
  };
}
