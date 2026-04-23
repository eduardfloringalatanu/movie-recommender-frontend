import { createContext } from "react";
import type { LoginRequestDto, RegisterRequestDto } from "../types";

export interface AuthContextType {
    isAuthenticated: boolean;
    login: (data: LoginRequestDto) => Promise<void>;
    register: (data: RegisterRequestDto) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);