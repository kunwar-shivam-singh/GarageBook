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

  public set = (job: ServiceJob) => {
    this.jobs.set(job.id, job);
    this.emit();
  }

  public setMultiple = (jobs: ServiceJob[]) => {
    jobs.forEach(job => this.jobs.set(job.id, job));
    this.emit();
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
    return () => this.listeners.delete(listener);
  }

  private emit = () => {
    this.cachedArray = null;
    this.listeners.forEach(l => l());
  }
}

export const jobStore = new JobStore();
