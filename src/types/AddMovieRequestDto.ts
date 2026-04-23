export interface AddMovieRequestDto {
    title: string;
    releaseYear: number;
    directors: string[];
    genres: string[];
    plot: string;
}