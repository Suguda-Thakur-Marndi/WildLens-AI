import { describe, it, expect } from 'vitest';
import { JournalEntry } from '../types';

describe('Field Journal Logic & Sorting', () => {
  it('sorts observations chronologically with newest first', () => {
    const entries: JournalEntry[] = [
      {
        id: 'obs_1',
        timestamp: '2026-10-01T10:00:00.000Z',
        imageDataUrl: 'data:image/jpeg;base64,aaa',
        userNotes: 'Old observation',
        isVerified: false
      },
      {
        id: 'obs_2',
        timestamp: '2026-10-09T12:00:00.000Z',
        imageDataUrl: 'data:image/jpeg;base64,bbb',
        userNotes: 'Newest observation',
        isVerified: true
      },
      {
        id: 'obs_3',
        timestamp: '2026-10-05T08:00:00.000Z',
        imageDataUrl: 'data:image/jpeg;base64,ccc',
        userNotes: 'Middle observation',
        isVerified: false
      }
    ];

    const sorted = [...entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    expect(sorted[0].id).toBe('obs_2');
    expect(sorted[1].id).toBe('obs_3');
    expect(sorted[2].id).toBe('obs_1');
  });

  it('filters observations by verification status correctly', () => {
    const entries: JournalEntry[] = [
      { id: '1', timestamp: '2026-10-01', imageDataUrl: '', userNotes: '', isVerified: true },
      { id: '2', timestamp: '2026-10-02', imageDataUrl: '', userNotes: '', isVerified: false },
      { id: '3', timestamp: '2026-10-03', imageDataUrl: '', userNotes: '', isVerified: true }
    ];

    const verifiedOnly = entries.filter((e) => e.isVerified);
    const unverifiedOnly = entries.filter((e) => !e.isVerified);

    expect(verifiedOnly.length).toBe(2);
    expect(unverifiedOnly.length).toBe(1);
    expect(unverifiedOnly[0].id).toBe('2');
  });

  it('filters missions by category correctly', () => {
    const missions = [
      { id: 'm1', title: 'Bird', category: 'Fauna & Behavior' },
      { id: 'm2', title: 'Leaf', category: 'Flora & Botany' },
      { id: 'm3', title: 'Flower', category: 'Insects & Ecology' },
      { id: 'm4', title: 'Robin', category: 'Fauna & Behavior' }
    ];

    const faunaOnly = missions.filter((m) => m.category === 'Fauna & Behavior');
    expect(faunaOnly.length).toBe(2);
    expect(faunaOnly.map((m) => m.id)).toEqual(['m1', 'm4']);
  });
});
