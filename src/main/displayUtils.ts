import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DisplayInfo {
  id: string;
  name: string;
  resolution: string;
}

export async function getMacDisplayInfo(): Promise<DisplayInfo[]> {
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

    return displays;
  } catch (error) {
    console.error('Error getting display info:', error);
    return [];
  }
}

export async function getCurrentDisplay(
  x: number,
  y: number,
): Promise<DisplayInfo | null> {
  try {
    const displays = await getMacDisplayInfo();
    // For now, return the first display. In a real implementation,
    // you would need to check coordinates against display bounds
    return displays[0] || null;
  } catch (error) {
    console.error('Error getting current display:', error);
    return null;
  }
}
