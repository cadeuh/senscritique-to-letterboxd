/**
 * Core movie data types for Senscritique extraction
 */
export interface Movie {
  title: string;
  year?: number;
  rating: number; // 1-10 scale from Senscritique
  url: string;
} 