import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

let isRefreshing = false;

let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: AxiosError | Error) => void;
}> = [];

const processQueue = (error: AxiosError | Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error != null)
            prom.reject(error);
        else
            prom.resolve(token);
    });

    failedQueue = [];
};

axiosInstance.interceptors.request.use(
    (internalAxiosRequestConfig) => {
        const accessToken = localStorage.getItem("accessToken");

        if (accessToken != null && internalAxiosRequestConfig.headers != null)
            internalAxiosRequestConfig.headers.Authorization = `Bearer ${accessToken}`;

        return internalAxiosRequestConfig;
    },
    (error) => {
        return Promise.reject(error);
    }
);

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

axiosInstance.interceptors.response.use(
    (axiosResponse) => {
        return axiosResponse;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers != null)
                            originalRequest.headers.Authorization = `Bearer ${token}`;

                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem("refreshToken");

            if (refreshToken) {
                try {
                    const axiosResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken: refreshToken,
                    });

                    const newAccessToken = axiosResponse.data.accessToken;
                    const newRefreshToken = axiosResponse.data.refreshToken;

                    localStorage.setItem("accessToken", newAccessToken);
                    localStorage.setItem("refreshToken", newRefreshToken);

                    processQueue(null, newAccessToken);

                    if (originalRequest.headers != null)
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                    return axiosInstance(originalRequest);
                } catch (refreshError) {
                    const refreshError2 = refreshError as Error;
                    processQueue(refreshError2, null);

                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");

                    window.location.href = "/login";

                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                window.location.href = "/login";

                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);