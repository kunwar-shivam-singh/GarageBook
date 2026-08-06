import { ServiceJob } from './db/types';

type Listener = () => void;

class JobStore {
  private jobs: Map<string, ServiceJob> = new Map();
  private listeners: Set<Listener> = new Set();
  private cachedArray: ServiceJob[] | null = null;

  public get = (id: string): ServiceJob | undefined => {
    return this.jobs.get(id);
  }

  public getAll = (): ServiceJob[] => {
    if (!this.cachedArray) {
      this.cachedArray = Array.from(this.jobs.values());
    }
    return this.cachedArray;
  }

  public getFiltered = (predicate: (job: ServiceJob) => boolean): ServiceJob[] => {
    return this.getAll().filter(predicate);
  }

  public set = (job: ServiceJob) => {
    this.jobs.set(job.id, job);
    this.emit();
  }

  // Safe merge from server props to prevent overwriting newer realtime data 
  public upsertMultiple = (incomingJobs: ServiceJob[]) => {
    let changed = false;
    incomingJobs.forEach(job => {
      // If we don't have it, or it's the exact same, just set it
      // A full conflict resolution (using updated_at) would go here if needed
      // For now, if it's already in the store, we don't overwrite it unless we really want to
      if (!this.jobs.has(job.id)) {
        this.jobs.set(job.id, job);
        changed = true;
      }
    });
    if (changed) {
      this.emit();
    }
  }

  public update = (id: string, partial: Partial<ServiceJob>) => {
    const existing = this.jobs.get(id);
    if (existing) {
      this.jobs.set(id, { ...existing, ...partial });
      this.emit();
    }
  }

  public remove = (id: string) => {
    if (this.jobs.delete(id)) {
      this.emit();
    }
  }

  public subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSize = () => this.jobs.size;

  private emit = () => {
    this.cachedArray = null;
    this.listeners.forEach(l => l());
  }
}

export const jobStore = new JobStore();
