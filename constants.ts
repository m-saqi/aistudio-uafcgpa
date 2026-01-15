
export const BED_COURSES = new Set([
  'EDU-501', 'EDU-503', 'EDU-505', 'EDU-507', 'EDU-509', 'EDU-511', 'EDU-513',
  'EDU-502', 'EDU-504', 'EDU-506', 'EDU-508', 'EDU-510', 'EDU-512', 'EDU-516',
  'EDU-601', 'EDU-604', 'EDU-605', 'EDU-607', 'EDU-608', 'EDU-623'
]);

export const GRADING_SCALE: Record<number, { A: number; B: number; C: number; D: number }> = {
  10: { A: 160, B: 130, C: 100, D: 80 },
  9: { A: 144, B: 117, C: 90, D: 72 },
  8: { A: 128, B: 104, C: 80, D: 64 },
  7: { A: 112, B: 91, C: 70, D: 56 },
  6: { A: 96, B: 78, C: 60, D: 48 },
  5: { A: 80, B: 65, C: 50, D: 40 },
  4: { A: 64, B: 52, C: 40, D: 32 },
  3: { A: 48, B: 39, C: 30, D: 24 },
  2: { A: 32, B: 26, C: 20, D: 16 },
  1: { A: 16, B: 13, C: 10, D: 8 }
};
