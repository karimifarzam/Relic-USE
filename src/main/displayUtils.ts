import { exec } from 'child_process';
import { promisify } from 'util';
import { screen } from 'electron';

const execAsync = promisify(exec);

interface DisplayInfo {
  id: string;
  name: string;
  resolution: string;
}

// Display info caching - displays rarely change
const DISPLAY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let displayCache: { timestamp: number; displays: DisplayInfo[] } | null = null;

export async function getMacDisplayInfo(): Promise<DisplayInfo[]> {
  const now = Date.now();

  // Return cached result if still valid
  if (displayCache && now - displayCache.timestamp < DISPLAY_CACHE_TTL) {
    return displayCache.displays;
  }

  try {
    const { stdout } = await execAsync(
      'system_profiler -json SPDisplaysDataType',
    );
    const data = JSON.parse(stdout);

    const displays: DisplayInfo[] = [];

    data.SPDisplaysDataType.forEach((gpu: any) => {
      if (gpu.spdisplays_ndrvs) {
        gpu.spdisplays_ndrvs.forEach((display: any) => {
          displays.push({
            id: display._spdisplays_displayID,
            name: display._name,
            resolution: display._spdisplays_resolution,
          });
        });
      }
    });

    displayCache = { timestamp: now, displays };
    return displays;
  } catch (error) {
    console.error('Error getting display info:', error);
    // Return cached displays on error if available
    return displayCache?.displays || [];
  }
}

export async function getCurrentDisplay(
  x: number,
  y: number,
): Promise<DisplayInfo | null> {
  try {
    // Get display from Electron's screen API for accurate coordinate matching
    const electronDisplay = screen.getDisplayNearestPoint({ x, y });
    const fallback: DisplayInfo = {
      id: electronDisplay.id.toString(),
      name: electronDisplay.label || `Display ${electronDisplay.id}`,
      resolution: `${electronDisplay.size.width}x${electronDisplay.size.height}`,
    };

    // Try to get more detailed info from system profiler
    const displays = await getMacDisplayInfo();
    const matchingDisplay = displays.find(
      (display) => display.id === fallback.id,
    );

    return matchingDisplay || fallback;
  } catch (error) {
    console.error('Error getting current display:', error);
    return null;
  }
}
