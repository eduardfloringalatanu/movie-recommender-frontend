export interface GetMoviesResponseItemDto {
    movieId: number;
    title: string;
    releaseYear: number;
    directors: string[];
    genres: string[];
    plot: string;
    rating: number | null;
}