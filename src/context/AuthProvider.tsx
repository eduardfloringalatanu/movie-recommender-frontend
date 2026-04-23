import { useState, useEffect, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { login, logout, register } from "../api";
import type { LoginRequestDto, RegisterRequestDto } from "../types";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

    useEffect(() => {
        const accessToken = localStorage.getItem("accessToken");

        if (accessToken != null) {
            setIsAuthenticated(true);
        }

        setIsCheckingAuth(false);
    }, []);

    const loginHandler = async (data: LoginRequestDto) => {
        const response = await login(data);

        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);

        setIsAuthenticated(true);
    };

    const registerHandler = async (data: RegisterRequestDto) => {
        const response = await register(data);

        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);

        setIsAuthenticated(true);
    };

    const logoutHandler = async () => {
        try {
            const refreshToken = localStorage.getItem("refreshToken");

            if (refreshToken != null)
                await logout({ refreshToken });
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");

            setIsAuthenticated(false);

            window.location.href = "/login";
        }
    };

    if (isCheckingAuth)
        return <div className="min-h-screen bg-[#0B1120]"></div>;

    return (
        <AuthContext.Provider value={{ isAuthenticated, login: loginHandler, register: registerHandler, logout: logoutHandler }}>
            { children }
        </AuthContext.Provider>
    );
};