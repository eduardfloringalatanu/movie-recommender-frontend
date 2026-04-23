import { axiosInstance } from "./axiosInstance";
import type { RecommendMoviesRequestDto } from "../types";

// ... restul funcțiilor (login, getMovies etc.)

export const recommendMovies = async (
    data: RecommendMoviesRequestDto,
    onChunk: (chunk: string) => void
): Promise<void> => {

    const accessToken = localStorage.getItem("accessToken");

    const response = await fetch(`${axiosInstance.defaults.baseURL}/movies/recommend`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
    }

    if (!response.body) {
        throw new Error("No readable stream available");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // NOU: Un buffer pentru a stoca textul parțial între pachete
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Adăugăm noua bucată la buffer
        buffer += decoder.decode(value, { stream: true });

        // SSE trimite liniile separate de \n
        const lines = buffer.split('\n');

        // Păstrăm ultima linie în buffer, în caz că e incompletă (ex: s-a oprit la jumătatea cuvântului)
        buffer = lines.pop() || "";

        // Extragem textul curat din linii
        const cleanedText = lines
            .filter(line => line.startsWith("data:"))
            .map(line => {
                const text = line.substring(5); // Tăiem fix caracterele "data:"

                // Spring WebFlux transformă un rând nou (enter) trimis de AI într-un event "data:" gol
                // Așa că, dacă textul e gol, noi îi dăm înapoi rândul nou (\n)
                return text === "" ? "\n" : text;
            })
            .join(""); // Le unim la loc

        if (cleanedText) {
            onChunk(cleanedText);
        }
    }
};