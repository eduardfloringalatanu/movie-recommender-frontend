import { axiosInstance } from "./axiosInstance";

export const removeMovie = async (movieId: number): Promise<void> => {
    await axiosInstance.delete(`/movies/${movieId}`);
};