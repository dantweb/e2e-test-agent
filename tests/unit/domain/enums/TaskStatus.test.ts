/**
 * Unit tests for TaskStatus enum and state transitions
 * Sprint 17: Subtask State Machine
 *
 * Tests state machine validation and transitions
 */

import {
  TaskStatus,
  VALID_TRANSITIONS,
  isValidTransition,
} from '../../../../src/domain/enums/TaskStatus';

describe('TaskStatus', () => {
  describe('enum values', () => {
    it('should define Pending status', () => {
      expect(TaskStatus.Pending).toBe('pending');
    });

    it('should define InProgress status', () => {
      expect(TaskStatus.InProgress).toBe('in_progress');
    });

    it('should define Completed status', () => {
      expect(TaskStatus.Completed).toBe('completed');
    });

    it('should define Failed status', () => {
      expect(TaskStatus.Failed).toBe('failed');
    });

    it('should define Blocked status', () => {
      expect(TaskStatus.Blocked).toBe('blocked');
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('should allow Pending -> InProgress', () => {
      expect(VALID_TRANSITIONS[TaskStatus.Pending]).toContain(TaskStatus.InProgress);
    });

    it('should allow Pending -> Blocked', () => {
      expect(VALID_TRANSITIONS[TaskStatus.Pending]).toContain(TaskStatus.Blocked);
    });

    it('should allow InProgress -> Completed', () => {
      expect(VALID_TRANSITIONS[TaskStatus.InProgress]).toContain(TaskStatus.Completed);
    });

    it('should allow InProgress -> Failed', () => {
      expect(VALID_TRANSITIONS[TaskStatus.InProgress]).toContain(TaskStatus.Failed);
    });

    it('should allow Blocked -> InProgress (retry)', () => {
      expect(VALID_TRANSITIONS[TaskStatus.Blocked]).toContain(TaskStatus.InProgress);
    });

    it('should not allow transitions from Completed (terminal)', () => {
      expect(VALID_TRANSITIONS[TaskStatus.Completed]).toEqual([]);
    });

    it('should not allow transitions from Failed (terminal)', () => {
      expect(VALID_TRANSITIONS[TaskStatus.Failed]).toEqual([]);
    });

    it('should not allow Pending -> Completed (skip execution)', () => {
      expect(VALID_TRANSITIONS[TaskStatus.Pending]).not.toContain(TaskStatus.Completed);
    });

    it('should not allow Pending -> Failed (skip execution)', () => {
      expect(VALID_TRANSITIONS[TaskStatus.Pending]).not.toContain(TaskStatus.Failed);
    });

    it('should not allow InProgress -> Blocked (must fail first)', () => {
      expect(VALID_TRANSITIONS[TaskStatus.InProgress]).not.toContain(TaskStatus.Blocked);
    });
  });

  describe('isValidTransition', () => {
    describe('valid transitions', () => {
      it('should return true for Pending -> InProgress', () => {
        expect(isValidTransition(TaskStatus.Pending, TaskStatus.InProgress)).toBe(true);
      });

      it('should return true for Pending -> Blocked', () => {
        expect(isValidTransition(TaskStatus.Pending, TaskStatus.Blocked)).toBe(true);
      });

      it('should return true for InProgress -> Completed', () => {
        expect(isValidTransition(TaskStatus.InProgress, TaskStatus.Completed)).toBe(true);
      });

      it('should return true for InProgress -> Failed', () => {
        expect(isValidTransition(TaskStatus.InProgress, TaskStatus.Failed)).toBe(true);
      });

      it('should return true for Blocked -> InProgress', () => {
        expect(isValidTransition(TaskStatus.Blocked, TaskStatus.InProgress)).toBe(true);
      });
    });

    describe('invalid transitions', () => {
      it('should return false for Pending -> Completed', () => {
        expect(isValidTransition(TaskStatus.Pending, TaskStatus.Completed)).toBe(false);
      });

      it('should return false for Pending -> Failed', () => {
        expect(isValidTransition(TaskStatus.Pending, TaskStatus.Failed)).toBe(false);
      });

      it('should return false for InProgress -> Blocked', () => {
        expect(isValidTransition(TaskStatus.InProgress, TaskStatus.Blocked)).toBe(false);
      });

      it('should return false for InProgress -> Pending (backward)', () => {
        expect(isValidTransition(TaskStatus.InProgress, TaskStatus.Pending)).toBe(false);
      });

      it('should return false for Completed -> any status', () => {
        expect(isValidTransition(TaskStatus.Completed, TaskStatus.Pending)).toBe(false);
        expect(isValidTransition(TaskStatus.Completed, TaskStatus.InProgress)).toBe(false);
        expect(isValidTransition(TaskStatus.Completed, TaskStatus.Failed)).toBe(false);
        expect(isValidTransition(TaskStatus.Completed, TaskStatus.Blocked)).toBe(false);
      });

      it('should return false for Failed -> any status', () => {
        expect(isValidTransition(TaskStatus.Failed, TaskStatus.Pending)).toBe(false);
        expect(isValidTransition(TaskStatus.Failed, TaskStatus.InProgress)).toBe(false);
        expect(isValidTransition(TaskStatus.Failed, TaskStatus.Completed)).toBe(false);
        expect(isValidTransition(TaskStatus.Failed, TaskStatus.Blocked)).toBe(false);
      });

      it('should return false for Blocked -> Completed', () => {
        expect(isValidTransition(TaskStatus.Blocked, TaskStatus.Completed)).toBe(false);
      });

      it('should return false for Blocked -> Failed', () => {
        expect(isValidTransition(TaskStatus.Blocked, TaskStatus.Failed)).toBe(false);
      });
    });

    describe('self-transitions', () => {
      it('should return false for Pending -> Pending', () => {
        expect(isValidTransition(TaskStatus.Pending, TaskStatus.Pending)).toBe(false);
      });

      it('should return false for InProgress -> InProgress', () => {
        expect(isValidTransition(TaskStatus.InProgress, TaskStatus.InProgress)).toBe(false);
      });

      it('should return false for Completed -> Completed', () => {
        expect(isValidTransition(TaskStatus.Completed, TaskStatus.Completed)).toBe(false);
      });
    });
  });
});
