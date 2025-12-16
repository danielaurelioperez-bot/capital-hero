import { FinanceState } from './events';
import { FinanceSnapshot } from './selectors';
import { Mission, MissionDefinition, MISSION_DEFINITIONS } from './missionDefinitions';
import { MissionHistoryEntry } from './storage';

// Re-export types for consumers
export type { Mission, MissionIconType, MissionColor, MissionType } from './missionDefinitions';

// --- HELPER FUNCTIONS ---

const wasCompletedExact = (history: MissionHistoryEntry[], id: string, key: string) => {
  // Strict dedupe: Has THIS specific instance (id + logic key) been done?
  return history.some(entry => 
    entry.missionId === id && 
    entry.triggerKey === key && 
    entry.status === 'completed'
  );
};

const wasSkippedRecently = (history: MissionHistoryEntry[], id: string, key: string, hours: number) => {
  if (!hours || hours <= 0) return false;

  const skips = history
    .filter(h => h.missionId === id && h.triggerKey === key && h.status === 'skipped')
    .sort((a, b) => b.timestamp - a.timestamp);
    
  if (skips.length === 0) return false;

  const lastSkipped = skips[0].timestamp;
  const diffHours = (Date.now() - lastSkipped) / (1000 * 60 * 60);

  return diffHours < hours;
};

// --- CORE LOGIC: GET NEXT MISSIONS ---

export const getNextMissions = (
  state: FinanceState, 
  daysOffline: number, 
  snapshot: FinanceSnapshot,
  limit: number = 3
): Mission[] => {
  const { missionHistory } = state;
  const candidateMissions: Mission[] = [];

  // Sort mission definitions by priority (Lower number = Higher priority)
  const sortedMissionDefs = [...MISSION_DEFINITIONS].sort((a, b) => a.priority - b.priority);

  for (const def of sortedMissionDefs) {
    const triggerKey = def.triggerKeyBuilder(state, snapshot, daysOffline);
    
    // Only consider missions that currently have a triggerKey (i.e., are applicable)
    if (triggerKey) {
      // Check if this specific instance of the mission was completed
      if (wasCompletedExact(missionHistory, def.id, triggerKey)) continue;

      // Check if this specific instance of the mission was recently skipped and is on cooldown
      // Use def.cooldownHours if defined, otherwise a default (e.g., 4 hours)
      if (wasSkippedRecently(missionHistory, def.id, triggerKey, def.cooldownHours || 4)) continue;
      
      // If we reach here, the mission is active and not on cooldown. Add it to candidates.
      const content = def.content(triggerKey, state, snapshot);
      candidateMissions.push({
        id: def.id,
        triggerKey,
        type: def.type,
        ...content
      });

      // If we've found enough high-priority missions, we can stop
      if (candidateMissions.length >= limit && def.priority < 900) { // Limit primarily for core missions
          break;
      }
    }
  }

  // Filter out any lower-priority missions if higher-priority ones fill the limit
  if (candidateMissions.length > limit) {
      return candidateMissions.slice(0, limit);
  }
  
  // If no specific missions are found or they are on cooldown,
  // the very last mission in the sorted list (NO_MISSIONS_DEFINITION) will always be returned,
  // as its triggerKeyBuilder should always return a key and it has no cooldown/completion checks.
  if (candidateMissions.length === 0 && sortedMissionDefs.length > 0) {
      const fallbackDef = sortedMissionDefs[sortedMissionDefs.length - 1]; // This should be NO_MISSIONS_DEFINITION
      const fallbackTriggerKey = fallbackDef.triggerKeyBuilder(state, snapshot, daysOffline);
      const fallbackContent = fallbackDef.content(fallbackTriggerKey!, state, snapshot); // ! asserts non-null
      return [{
          id: fallbackDef.id,
          triggerKey: fallbackTriggerKey!,
          type: fallbackDef.type,
          ...fallbackContent
      }];
  }

  return candidateMissions;
};

// --- BACKWARD COMPATIBILITY SELECTOR ---

export const getActiveMission = (
  state: FinanceState, 
  daysOffline: number, 
  snapshot: FinanceSnapshot
): Mission => {
  // Always return at least one mission, even if it's a fallback.
  const missions = getNextMissions(state, daysOffline, snapshot, 1);
  return missions[0];
};