import { axiosInstance } from "./axiosInstance";
import type { RegisterRequestDto, RegisterResponseDto } from "../types";

export const register = async (data: RegisterRequestDto): Promise<RegisterResponseDto> => {
    const response = await axiosInstance.post<RegisterResponseDto>("/auth/register", data);

    return response.data;
};