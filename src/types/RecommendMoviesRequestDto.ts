export interface RecommendMoviesRequestDto {
    excludedGenres?: string[] | null;
    minReleaseYear?: number | null;
}