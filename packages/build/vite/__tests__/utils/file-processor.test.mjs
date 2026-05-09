import { describe, it, expect, vi, beforeEach } from 'vitest';

import { processFiles } from '../../utils/file-processor.mjs';

vi.mock('glob', () => ({
  glob: vi.fn(),
}));

vi.mock('@eleventy-plugin-themer/core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const { glob } = await import('glob');

describe('file-processor.mjs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('processFiles', () => {
    it('should return success with 0 processed when no files match', async () => {
      glob.mockResolvedValue([]);

      const result = await processFiles({
        pattern: '*.css',
        outputDir: '/output',
        taskName: 'Test',
        processor: vi.fn(),
      });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
    });

    it('should process each matching file', async () => {
      glob.mockResolvedValue(['/output/a.css', '/output/b.css']);
      const processor = vi.fn().mockResolvedValue({ message: ' (ok)' });

      const result = await processFiles({
        pattern: '*.css',
        outputDir: '/output',
        taskName: 'Test',
        processor,
      });

      expect(processor).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should throw when processor fails', async () => {
      glob.mockResolvedValue(['/output/a.css']);
      const processor = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(
        processFiles({
          pattern: '*.css',
          outputDir: '/output',
          taskName: 'Test',
          processor,
        }),
      ).rejects.toThrow('Test failed for 1 file(s)');
    });

    it('should log errorTip when processor fails and errorTip is set', async () => {
      const { logger } = await import('@eleventy-plugin-themer/core/logger');
      glob.mockResolvedValue(['/output/a.css']);
      const processor = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(
        processFiles({
          pattern: '*.css',
          outputDir: '/output',
          taskName: 'Test',
          processor,
          errorTip: 'Check your CSS syntax',
        }),
      ).rejects.toThrow('Test failed for 1 file(s)');

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Check your CSS syntax'));
    });

    it('should handle multiple patterns', async () => {
      glob.mockResolvedValueOnce(['/output/a.css']).mockResolvedValueOnce(['/output/b.css']);
      const processor = vi.fn().mockResolvedValue({});

      const result = await processFiles({
        pattern: ['*.css', '*.scss'],
        outputDir: '/output',
        taskName: 'Test',
        processor,
      });

      expect(glob).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(2);
    });

    it('should deduplicate files from multiple patterns', async () => {
      glob
        .mockResolvedValueOnce(['/output/a.css', '/output/b.css'])
        .mockResolvedValueOnce(['/output/a.css']);
      const processor = vi.fn().mockResolvedValue({});

      const result = await processFiles({
        pattern: ['*.css', 'a.css'],
        outputDir: '/output',
        taskName: 'Test',
        processor,
      });

      expect(result.processed).toBe(2);
    });

    it('should call calculateStats when provided', async () => {
      glob.mockResolvedValue(['/output/a.css']);
      const processor = vi.fn().mockResolvedValue({ size: 100 });
      const calculateStats = vi.fn().mockReturnValue({ 'total size': '100B' });

      await processFiles({
        pattern: '*.css',
        outputDir: '/output',
        taskName: 'Test',
        processor,
        calculateStats,
      });

      expect(calculateStats).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ size: 100 })]),
      );
    });
  });
});
