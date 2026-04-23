import { useState, type SyntheticEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AxiosError } from "axios";
import type { ExceptionResponseDto } from "../types";
import { mapErrorCode } from "../utils/mapErrorCode";

export const Login = () => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [generalError, setGeneralError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: SyntheticEvent) => {
        e.preventDefault();
        setGeneralError("");
        setFieldErrors({});
        setIsLoading(true);

        try {
            await login({ identifier, password });

            navigate("/movies");
        } catch (error) {
            const axiosError = error as AxiosError<ExceptionResponseDto>;

            if (axiosError.response != null && axiosError.response.data != null) {
                const responseData = axiosError.response.data;

                if (responseData.errorCode === "ARGUMENT_INVALID_ERROR" && responseData.argumentErrors != null) {
                    const newFieldErrors: Record<string, string> = {};

                    responseData.argumentErrors.forEach((argumentError) => {
                        newFieldErrors[argumentError.argument] = mapErrorCode(argumentError.errorCode2);
                    });

                    setFieldErrors(newFieldErrors);
                } else
                    setGeneralError(mapErrorCode(responseData.errorCode));
            } else
                setGeneralError("Unable to connect to the server.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0B1120] px-4 py-8 font-sans text-slate-300">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827] p-8 shadow-[0_0_40px_rgba(8,_112,_184,_0.07)]">
                <div className="mb-8 text-center">
                    <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
                        Welcome
                    </h1>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {generalError && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
                            <svg className="h-5 w-5 shrink-0 text-current" aria-hidden="true">
                                <use href="/icons.svg#icon-error"></use>
                            </svg>
                            <span>{generalError}</span>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-400">
                            Username or email
                        </label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className={`w-full rounded-xl border bg-[#1F2937] px-4 py-3 text-white placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-4 ${fieldErrors.identifier ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"}`}
                            placeholder="Enter your username or email"
                        />
                        {fieldErrors.identifier && (
                            <p className="ml-1 mt-1 text-xs text-red-400">{fieldErrors.identifier}</p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-400">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full rounded-xl border bg-[#1F2937] px-4 py-3 pr-12 text-white placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-4 ${fieldErrors.password ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"}`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-200 focus:outline-none"
                            >
                                <svg className="h-5 w-5 text-current" aria-hidden="true">
                                    <use href={`/icons.svg#${showPassword ? 'icon-eye-slash' : 'icon-eye'}`}></use>
                                </svg>
                            </button>
                        </div>
                        {fieldErrors.password && (
                            <p className="ml-1 mt-1 text-xs text-red-400">{fieldErrors.password}</p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white shadow-[0_0_20px_rgba(8,_145,_178,_0.3)] transition-all duration-200 hover:bg-cyan-500 hover:shadow-[0_0_25px_rgba(8,_145,_178,_0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? (
                            <svg className="h-5 w-5 animate-spin text-white" aria-hidden="true">
                                <use href="/icons.svg#icon-spinner-circle"></use>
                            </svg>
                        ) : (
                            "Log in"
                        )}
                    </button>
                </form>
                <div className="mt-8 border-t border-slate-800 pt-6 text-center">
                    <p className="text-sm text-slate-400">
                        <Link to="/register" className="font-medium text-cyan-400 transition-colors hover:text-cyan-300">
                            Create new account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};