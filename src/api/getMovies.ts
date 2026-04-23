import { axiosInstance } from "./axiosInstance";
import type { PaginatedGetMoviesResponseItemDto } from "../types";

export const getMovies = async (search: string = "", page: number = 0, size: number = 10, sort: string = "movieId,desc"): Promise<PaginatedGetMoviesResponseItemDto> => {
    const queryParams: Record<string, string | number> = {
        page,
        size,
        sort,
    };

    const safeSearch = search.trim();

    if (safeSearch !== "")
        queryParams.search = safeSearch;

    const response = await axiosInstance.get<PaginatedGetMoviesResponseItemDto>("/movies", {
        params: queryParams
    });

    return response.data;
};