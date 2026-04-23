import { axiosInstance } from "./axiosInstance";
import type { RateMovieRequestDto } from "../types";

export const rateMovie = async (movieId: number, data: RateMovieRequestDto): Promise<void> => {
    await axiosInstance.put(`/movies/${movieId}/rating`, data);
};