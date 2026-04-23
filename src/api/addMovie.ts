import { axiosInstance } from "./axiosInstance";
import type { AddMovieRequestDto } from "../types";

export const addMovie = async (data: AddMovieRequestDto): Promise<void> => {
    await axiosInstance.post("/movies", data);
};