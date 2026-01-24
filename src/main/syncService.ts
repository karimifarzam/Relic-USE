import { supabase } from './supabase';
import { dbHelpers, Session, TimeRangeComment } from './db';
import * as fileStorage from './fileStorage';

interface SupabaseSession {
  id: number;
  user_id: string;
  created_at: string;
  duration: number;
  approval_state: 'draft' | 'submitted' | 'approved' | 'rejected';
  session_status: 'passive' | 'tasked';
  task_id: number | null;
  reward_id: number | null;
}

interface SupabaseRecording {
  id: number;
  user_id: string;
  session_id: number;
  timestamp: string;
  window_name: string;
  window_id: string;
  thumbnail_url: string;
  screenshot_url: string;
  type: 'passive' | 'tasked';
  label: string | null;
}

interface SupabaseComment {
  id: number;
  user_id: string;
  session_id: number;
  start_time: number;
  end_time: number;
  comment: string;
  created_at: string;
}

/**
 * Fetch all sessions for a user from Supabase
 */
export async function fetchUserSessions(userId: string): Promise<SupabaseSession[]> {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions from Supabase:', error);
      throw error;
    }

    return sessions || [];
  } catch (error) {
    console.error('Failed to fetch user sessions:', error);
    throw error;
  }
}

/**
 * Fetch all recordings for a specific session from Supabase
 */
export async function fetchSessionRecordings(
  userId: string,
  sessionId: number,
): Promise<SupabaseRecording[]> {
  try {
    const { data: recordings, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching recordings from Supabase:', error);
      throw error;
    }

    return recordings || [];
  } catch (error) {
    console.error('Failed to fetch session recordings:', error);
    throw error;
  }
}

/**
 * Fetch all comments for a specific session from Supabase
 */
export async function fetchSessionComments(
  userId: string,
  sessionId: number,
): Promise<SupabaseComment[]> {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching comments from Supabase:', error);
      throw error;
    }

    return comments || [];
  } catch (error) {
    console.error('Failed to fetch session comments:', error);
    throw error;
  }
}

/**
 * Download a screenshot from Supabase Storage and convert to base64
 */
export async function downloadScreenshot(url: string): Promise<string | null> {
  try {
    // Extract the path from the full URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/recordings/<path>
    const urlParts = url.split('/recordings/');
    if (urlParts.length < 2) {
      console.error('Invalid screenshot URL format:', url);
      return null;
    }
    const path = urlParts[1];

    // Download from Supabase Storage
    const { data, error } = await supabase.storage
      .from('recordings')
      .download(path);

    if (error) {
      console.error('Error downloading screenshot:', error);
      return null;
    }

    // Convert blob to base64
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Failed to download screenshot:', error);
    return null;
  }
}

/**
 * Sync a single session and its recordings/comments to local storage
 */
export async function syncSessionToLocal(
  session: SupabaseSession,
  userId: string,
): Promise<void> {
  try {
    console.log(`Syncing session ${session.id} to local storage...`);

    // Check if session already exists locally
    const existingSession = await dbHelpers.getSession(session.id);

    if (existingSession) {
      console.log(`Session ${session.id} already exists locally, skipping...`);
      return;
    }

    // Create session in local DB
    await dbHelpers.upsertSession({
      id: session.id,
      created_at: session.created_at,
      duration: session.duration,
      approval_state: session.approval_state,
      session_status: session.session_status,
      task_id: session.task_id,
      reward_id: session.reward_id,
    });

    // Fetch and sync recordings
    const recordings = await fetchSessionRecordings(userId, session.id);
    console.log(`Found ${recordings.length} recordings for session ${session.id}`);

    for (const recording of recordings) {
      // Download screenshot from Supabase Storage
      const screenshotBase64 = await downloadScreenshot(recording.screenshot_url);

      if (!screenshotBase64) {
        console.warn(`Failed to download screenshot for recording ${recording.id}`);
        continue;
      }

      // Download thumbnail (use same screenshot for now, or could be a separate URL)
      const thumbnailBase64 = await downloadScreenshot(recording.thumbnail_url);

      // Save screenshot to local file
      const screenshotPath = fileStorage.saveScreenshot(
        session.id,
        recording.id,
        screenshotBase64,
      );

      // Create recording in local DB
      await dbHelpers.createRecording({
        session_id: session.id,
        timestamp: recording.timestamp,
        window_name: recording.window_name,
        window_id: recording.window_id,
        thumbnail: thumbnailBase64 || '',
        screenshot: '', // Empty since we're using file-based storage
        screenshot_path: screenshotPath,
        type: recording.type,
        label: recording.label || undefined,
      });
    }

    // Fetch and sync comments
    const comments = await fetchSessionComments(userId, session.id);
    console.log(`Found ${comments.length} comments for session ${session.id}`);

    for (const comment of comments) {
      await dbHelpers.createComment({
        session_id: session.id,
        start_time: comment.start_time,
        end_time: comment.end_time,
        comment: comment.comment,
        created_at: comment.created_at,
      });
    }

    // Update session metadata
    await fileStorage.updateSessionMetadata(
      session.id,
      dbHelpers.getSession,
      dbHelpers.getSessionRecordings,
      dbHelpers.getSessionComments,
    );

    console.log(`Successfully synced session ${session.id}`);
  } catch (error) {
    console.error(`Failed to sync session ${session.id}:`, error);
    throw error;
  }
}

/**
 * Sync all user sessions from Supabase to local storage
 */
export async function syncAllSessionsToLocal(userId: string): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ sessionId: number; error: string }>;
}> {
  const results = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [] as Array<{ sessionId: number; error: string }>,
  };

  try {
    console.log(`Starting sync for user ${userId}...`);

    // Fetch all sessions from Supabase
    const sessions = await fetchUserSessions(userId);
    console.log(`Found ${sessions.length} sessions in Supabase`);

    // Sync each session
    for (const session of sessions) {
      try {
        await syncSessionToLocal(session, userId);
        results.synced++;
      } catch (error: any) {
        console.error(`Failed to sync session ${session.id}:`, error);
        results.failed++;
        results.errors.push({
          sessionId: session.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    if (results.failed > 0) {
      results.success = false;
    }

    console.log(
      `Sync complete: ${results.synced} synced, ${results.failed} failed`,
    );

    return results;
  } catch (error: any) {
    console.error('Failed to sync sessions:', error);
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: [{ sessionId: -1, error: error.message || 'Unknown error' }],
    };
  }
}
