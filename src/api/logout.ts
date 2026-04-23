import { axiosInstance } from "./axiosInstance";
import type { LogoutRequestDto } from "../types";

export const logout = async (data: LogoutRequestDto): Promise<void> => {
    await axiosInstance.post("/auth/logout", data);
};