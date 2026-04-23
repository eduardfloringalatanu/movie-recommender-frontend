import { useState, useEffect, useRef, useCallback, type SyntheticEvent } from "react";
import type { GetMoviesResponseItemDto, AddMovieRequestDto, RecommendMoviesRequestDto } from "../types";
import { getMovies, rateMovie, addMovie, recommendMovies, removeMovie } from "../api";
import { AxiosError } from "axios";
import type { ExceptionResponseDto } from "../types";
import { mapErrorCode } from "../utils/mapErrorCode";
import { useAuth } from "../hooks/useAuth";

const AVAILABLE_GENRES = [
    "Action", "Adventure", "Comedy", "Drama", "Horror",
    "Thriller", "Romance", "Sci-Fi", "Fantasy", "Crime",
    "Mystery", "Animation"
];

export const Movies = () => {
    const [movies, setMovies] = useState<GetMoviesResponseItemDto[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

    const [expandedMovieId, setExpandedMovieId] = useState<number | null>(null);
    const [openRatingId, setOpenRatingId] = useState<number | null>(null);
    const [hoveredRating, setHoveredRating] = useState<number>(0);

    const ratingPopoverRef = useRef<HTMLDivElement>(null);

    const [formTitle, setFormTitle] = useState("");
    const [formYear, setFormYear] = useState<number | "">("");
    const [formPlot, setFormPlot] = useState("");
    const [formGenres, setFormGenres] = useState<string[]>([]);
    const [formDirectors, setFormDirectors] = useState<string[]>([]);

    const [isGenreOpen, setIsGenreOpen] = useState(false);
    const [isDirectorOpen, setIsDirectorOpen] = useState(false);
    const [directorInput, setDirectorInput] = useState("");

    const genreRef = useRef<HTMLDivElement>(null);
    const directorRef = useRef<HTMLDivElement>(null);

    const [generalError, setGeneralError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isAddingMovie, setIsAddingMovie] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [refreshKey, setRefreshKey] = useState(0);

    const [recommendExcludedGenres, setRecommendExcludedGenres] = useState<string[]>([]);
    const [isRecommendGenreOpen, setIsRecommendGenreOpen] = useState(false);
    const [recommendMinYear, setRecommendMinYear] = useState<number | "">("");
    const [aiResponse, setAiResponse] = useState("");
    const [isRecommending, setIsRecommending] = useState(false);

    const recommendGenreRef = useRef<HTMLDivElement>(null);

    const { logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to logout.", error);
        }
    };

    const handleRemoveMovie = async (movieId: number) => {
        try {
            await removeMovie(movieId);

            setMovies(prevMovies => prevMovies.filter(movie => movie.movieId !== movieId));
        } catch (error) {
            console.error("Failed to remove movie.", error);
        }
    };

    const aiResponseRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (aiResponseRef.current) {
            aiResponseRef.current.scrollTop = aiResponseRef.current.scrollHeight;
        }
    }, [aiResponse]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(0);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (openRatingId !== null && ratingPopoverRef.current && !ratingPopoverRef.current.contains(target))
                setOpenRatingId(null);

            if (isGenreOpen && genreRef.current && !genreRef.current.contains(target))
                setIsGenreOpen(false);

            if (isDirectorOpen && directorRef.current && !directorRef.current.contains(target))
                setIsDirectorOpen(false);

            if (isRecommendGenreOpen && recommendGenreRef.current && !recommendGenreRef.current.contains(target))
                setIsRecommendGenreOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openRatingId, isGenreOpen, isDirectorOpen, isRecommendGenreOpen]);

    useEffect(() => {
        void fetchMovies(page, debouncedSearch);
    }, [page, debouncedSearch, refreshKey]);

    const fetchMovies = async (pageNumber: number, searchString: string) => {
        try {
            if (pageNumber > 0)
                setIsFetchingNextPage(true);
            else
                setIsInitialLoading(true);

            const data = await getMovies(searchString, pageNumber);

            setMovies(prevMovies => pageNumber === 0 ? data.content : [...prevMovies, ...data.content]);
            setHasMore(!data.last);
        } catch (error) {
            console.error("Failed to fetch movies.", error);
        } finally {
            setIsInitialLoading(false);
            setIsFetchingNextPage(false);
        }
    };

    const observer = useRef<IntersectionObserver | null>(null);

    const lastMovieElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isInitialLoading || isFetchingNextPage)
            return;

        if (observer.current)
            observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore)
                setPage(prevPage => prevPage + 1);
        });

        if (node)
            observer.current.observe(node);
    }, [isInitialLoading, isFetchingNextPage, hasMore]);

    const handleRateMovie = async (movieId: number, rating: number) => {
        try {
            await rateMovie(movieId, { rating });

            setMovies(prevMovies => prevMovies.map(movie => movie.movieId === movieId ? { ...movie, rating } : movie));
        } catch (error) {
            console.error("Failed to rate movie.", error);
        }
    };

    const toggleGenre = (genre: string) => {
        setFormGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
    };

    const toggleRecommendGenre = (genre: string) => {
        setRecommendExcludedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
    };

    const handleAddMovie = async (e: SyntheticEvent) => {
        e.preventDefault();
        setGeneralError("");
        setFieldErrors({});
        setIsAddingMovie(true);

        try {
            const data: AddMovieRequestDto = {
                title: formTitle, releaseYear: Number(formYear), directors: formDirectors, genres: formGenres, plot: formPlot
            };

            await addMovie(data);

            setFormTitle("");
            setFormYear("");
            setFormPlot("");
            setFormGenres([]);
            setFormDirectors([]);
            setSearchQuery("");
            setDebouncedSearch("");
            setPage(0);

            setRefreshKey(prev => prev + 1);
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
            setIsAddingMovie(false);
        }
    };

    const handleAskAI = async () => {
        setIsRecommending(true);
        setAiResponse("");

        try {
            const requestData: RecommendMoviesRequestDto = {
                excludedGenres: recommendExcludedGenres.length > 0 ? recommendExcludedGenres : null,
                minReleaseYear: recommendMinYear ? Number(recommendMinYear) : null
            };

            await recommendMovies(requestData, (chunk) => {
                setAiResponse(prev => prev + chunk);
            });

        } catch (error) {
            console.error("Failed to get AI recommendations.", error);

            setAiResponse("Something went wrong while connecting to the AI.");
        } finally {
            setIsRecommending(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-[#0B1120] text-slate-300 font-sans p-4 md:p-8 flex flex-col">
            <div className="max-w-[1400px] mx-auto w-full flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                <div className="flex flex-col flex-1 min-w-0 min-h-0 border-r border-transparent lg:border-slate-800 lg:pr-4">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
                        <h1 className="text-3xl font-bold text-white tracking-tight">My watchlist</h1>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                                <input
                                    type="text"
                                    placeholder="Search by title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500"
                                />
                                <svg className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" aria-hidden="true">
                                    <use href="/icons.svg#icon-search"></use>
                                </svg>
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                title="Log out"
                                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-[#1F2937] hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-lg px-4 py-2 text-sm transition-all focus:outline-none shrink-0"
                            >
                                <svg className="w-4 h-4 shrink-0" aria-hidden="true">
                                    <use href="/icons.svg#icon-logout"></use>
                                </svg>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl shadow-[0_0_40px_rgba(8,_112,_184,_0.07)] flex flex-col flex-1 min-h-0 overflow-hidden mb-6">
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {isInitialLoading ? (
                                <div className="flex justify-center py-10">
                                    <svg className="animate-spin h-8 w-8 text-cyan-500" aria-hidden="true"><use href="/icons.svg#icon-spinner"></use></svg>
                                </div>
                            ) : movies.length === 0 ? (
                                <p className="text-slate-500 text-center py-10">
                                    {debouncedSearch
                                        ? `No movies found matching "${debouncedSearch}".`
                                        : "You have no movies in your watchlist yet."}
                                </p>
                            ) : (
                                movies.map((movie, index) => (
                                    <div key={movie.movieId} ref={movies.length === index + 1 ? lastMovieElementRef : null} className="bg-[#1F2937] border border-slate-700 rounded-xl p-4 transition-all duration-200 hover:border-cyan-500/50">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-white">{movie.title} <span className="text-slate-500 text-sm font-normal">({movie.releaseYear})</span></h3>
                                                <div className="relative mt-2" ref={openRatingId === movie.movieId ? ratingPopoverRef : null}>
                                                    {movie.rating !== null ? (
                                                        <button onClick={() => setOpenRatingId(openRatingId === movie.movieId ? null : movie.movieId)} className="inline-flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-md border border-yellow-500/20 hover:bg-yellow-500/20 focus:outline-none">
                                                            <svg className="w-4 h-4 fill-current shrink-0 transform -translate-y-[1px]" aria-hidden="true"><use href="/icons.svg#icon-star-solid"></use></svg>
                                                            <div className="flex items-baseline"><span className="font-bold text-sm leading-none">{movie.rating}</span><span className="text-yellow-500/70 text-[11px] font-medium leading-none">/10</span></div>
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setOpenRatingId(openRatingId === movie.movieId ? null : movie.movieId)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 bg-[#111827] border border-slate-600 px-3 py-1 rounded-md focus:outline-none">
                                                            <svg className="w-4 h-4 text-current" aria-hidden="true"><use href="/icons.svg#icon-star-outline"></use></svg> Rate
                                                        </button>
                                                    )}
                                                    {openRatingId === movie.movieId && (
                                                        <div className="absolute top-full left-0 mt-2 z-20 bg-[#1F2937] border border-slate-600 rounded-xl shadow-2xl p-4 min-w-[260px]" onMouseLeave={() => setHoveredRating(0)}>
                                                            <div className="text-center mb-3"><span className="text-sm font-bold text-cyan-400">{hoveredRating > 0 ? hoveredRating : (movie.rating || "?")}</span><span className="text-slate-500 text-xs ml-1">/ 10</span></div>
                                                            <div className="flex items-center justify-between gap-1">
                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => {
                                                                    const isFilled = hoveredRating > 0 ? star <= hoveredRating : star <= (movie.rating || 0);
                                                                    return (
                                                                        <button key={star} onMouseEnter={() => setHoveredRating(star)} onClick={() => { void handleRateMovie(movie.movieId, star); setOpenRatingId(null); setHoveredRating(0); }} className="focus:outline-none transition-transform hover:scale-125">
                                                                            <svg className={`w-5 h-5 transition-colors duration-150 ${isFilled ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600 fill-transparent'}`} aria-hidden="true"><use href="/icons.svg#icon-star-rating"></use></svg>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleRemoveMovie(movie.movieId)}
                                                    title="Remove movie"
                                                    className="flex items-center justify-center h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors bg-[#111827] border border-slate-700 rounded-lg focus:outline-none"
                                                >
                                                    <svg className="w-4 h-4 text-current" aria-hidden="true">
                                                        <use href="/icons.svg#icon-trash"></use>
                                                    </svg>
                                                </button>

                                                <button
                                                    onClick={() => setExpandedMovieId(expandedMovieId === movie.movieId ? null : movie.movieId)}
                                                    className="flex items-center justify-center h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors bg-[#111827] border border-slate-700 rounded-lg focus:outline-none"
                                                >
                                                    <svg className={`w-4 h-4 text-current transition-transform duration-200 ${expandedMovieId === movie.movieId ? 'rotate-180' : ''}`} aria-hidden="true">
                                                        <use href="/icons.svg#icon-chevron-down"></use>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        {expandedMovieId === movie.movieId && (
                                            <div className="mt-4 pt-4 border-t border-slate-700 text-sm space-y-2 text-slate-400">
                                                <p><strong className="text-slate-300 font-medium">Directors:</strong> {movie.directors.join(", ")}</p>
                                                <p><strong className="text-slate-300 font-medium">Genres:</strong> {movie.genres.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(", ")}</p>
                                                <p className="leading-relaxed"><strong className="text-slate-300 font-medium">Plot:</strong> {movie.plot}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            {isFetchingNextPage && (
                                <div className="flex justify-center py-4">
                                    <svg className="animate-spin h-8 w-8 text-cyan-500" aria-hidden="true"><use href="/icons.svg#icon-spinner"></use></svg>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl mb-4 lg:mb-0 relative">
                        <form onSubmit={handleAddMovie} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {generalError && (
                                <div className="md:col-span-2 flex items-center gap-3 rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
                                    <svg className="h-5 w-5 shrink-0 text-current" aria-hidden="true">
                                        <use href="/icons.svg#icon-error"></use>
                                    </svg>
                                    <span>{generalError}</span>
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <input type="text" placeholder="Title" required value={formTitle} onChange={e => setFormTitle(e.target.value)}
                                       className={`w-full bg-[#1F2937] border rounded-lg px-4 py-2 focus:outline-none transition-colors ${fieldErrors.title ? "border-red-500/50 focus:border-red-500" : "border-slate-700 focus:border-cyan-500"}`} />
                                {fieldErrors.title && <p className="ml-1 text-xs text-red-400">{fieldErrors.title}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <input type="number" placeholder="Year" required value={formYear} onChange={e => setFormYear(e.target.value ? Number(e.target.value) : "")}
                                       className={`w-full bg-[#1F2937] border rounded-lg px-4 py-2 focus:outline-none transition-colors ${fieldErrors.releaseYear ? "border-red-500/50 focus:border-red-500" : "border-slate-700 focus:border-cyan-500"}`} />
                                {fieldErrors.releaseYear && <p className="ml-1 text-xs text-red-400">{fieldErrors.releaseYear}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="relative" ref={genreRef}>
                                    <button type="button" onClick={() => setIsGenreOpen(!isGenreOpen)}
                                            className={`w-full bg-[#1F2937] border rounded-lg px-4 py-2 text-left flex justify-between items-center transition-colors ${fieldErrors.genres ? "border-red-500/50" : "border-slate-700 hover:border-slate-600"}`}>
                                        <span className={formGenres.length ? "text-slate-200" : "text-slate-500"}>{formGenres.length ? `${formGenres.length} genres` : "Add genres"}</span>
                                        <svg className="w-4 h-4"><use href="/icons.svg#icon-chevron-down" /></svg>
                                    </button>
                                    {isGenreOpen && (
                                        <div className="absolute bottom-full mb-2 left-0 w-full z-30 bg-[#1F2937] border border-slate-600 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-2">
                                            {AVAILABLE_GENRES.map(g => (
                                                <button key={g} type="button" onClick={() => toggleGenre(g)} className={`text-xs px-2 py-1.5 rounded border ${formGenres.includes(g) ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-[#111827] border-slate-700'}`}>{g}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {fieldErrors.genres && <p className="ml-1 text-xs text-red-400">{fieldErrors.genres}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="relative" ref={directorRef}>
                                    <button type="button" onClick={() => setIsDirectorOpen(!isDirectorOpen)}
                                            className={`w-full bg-[#1F2937] border rounded-lg px-4 py-2 text-left flex justify-between items-center transition-colors focus:outline-none ${fieldErrors.directors ? "border-red-500/50" : "border-slate-700 hover:border-slate-600"}`}>
                                        <span className={formDirectors.length ? "text-slate-200" : "text-slate-500"}>
                                            {formDirectors.length ? `${formDirectors.length} directors` : "Add directors"}
                                        </span>
                                        <svg className="w-4 h-4 text-slate-400"><use href="/icons.svg#icon-plus" /></svg>
                                    </button>
                                    {isDirectorOpen && (
                                        <div className="absolute bottom-full mb-2 left-0 w-full z-30 bg-[#1F2937] border border-slate-600 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <div className="flex gap-2 mb-3">
                                                <input type="text" placeholder="Director name" value={directorInput} onChange={e => setDirectorInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); if(directorInput.trim()) setFormDirectors([...formDirectors, directorInput.trim()]); setDirectorInput(""); } }} className="flex-1 bg-[#111827] border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600" />
                                                <button type="button" onClick={() => { if(directorInput.trim()) setFormDirectors([...formDirectors, directorInput.trim()]); setDirectorInput(""); }} className="bg-cyan-600 hover:bg-cyan-500 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center shrink-0 shadow-lg shadow-cyan-900/20" title="Add director"><svg className="w-4 h-4"><use href="/icons.svg#icon-plus" /></svg></button>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                                {formDirectors.length === 0 && <p className="text-[10px] text-slate-500 italic px-1">No directors added yet.</p>}
                                                {formDirectors.map((d, i) => (
                                                    <span key={i} className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-md flex items-center gap-1.5 animate-in zoom-in-95 duration-150">
                                                        {d} <button type="button" onClick={() => setFormDirectors(formDirectors.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400 transition-colors"><svg className="w-3 h-3"><use href="/icons.svg#icon-x" /></svg></button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {fieldErrors.directors && <p className="ml-1 text-xs text-red-400">{fieldErrors.directors}</p>}
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-1">
                                <textarea placeholder="Plot" required value={formPlot} onChange={e => setFormPlot(e.target.value)}
                                          className={`w-full bg-[#1F2937] border rounded-lg px-4 py-2 focus:outline-none h-20 resize-none custom-scrollbar transition-colors ${fieldErrors.plot ? "border-red-500/50 focus:border-red-500" : "border-slate-700 focus:border-cyan-500"}`} />
                                {fieldErrors.plot && <p className="ml-1 text-xs text-red-400">{fieldErrors.plot}</p>}
                            </div>
                            <button type="submit" disabled={isAddingMovie}
                                    className="md:col-span-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg transition-all shadow-lg shadow-cyan-900/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isAddingMovie ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" aria-hidden="true"><use href="/icons.svg#icon-spinner"></use></svg>
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5"><use href="/icons.svg#icon-plus" /></svg> Add movie
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
                <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 flex flex-col min-h-0">
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-6 mt-1 flex items-center gap-2">
                        <svg className="w-6 h-6 text-fuchsia-500 shrink-0" aria-hidden="true">
                            <use href="/icons.svg#icon-ai-sparkle"></use>
                        </svg>
                        AI recommendations
                    </h2>
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl shadow-[0_0_40px_rgba(8,_112,_184,_0.07)] flex flex-col flex-1 min-h-0 overflow-hidden p-6 gap-4">
                        <div className="flex flex-col gap-3 shrink-0">
                            <div className="flex gap-3">
                                <div className="relative flex-1" ref={recommendGenreRef}>
                                    <button type="button" onClick={() => setIsRecommendGenreOpen(!isRecommendGenreOpen)} className="w-full bg-[#1F2937] border border-slate-700 rounded-lg px-4 py-2.5 text-left flex justify-between items-center hover:border-slate-600 transition-colors text-sm">
                                        <span className={recommendExcludedGenres.length ? "text-slate-200" : "text-slate-500"}>
                                            {recommendExcludedGenres.length ? `${recommendExcludedGenres.length} genres` : "Exclude genres"}
                                        </span>
                                        <svg className="w-4 h-4"><use href="/icons.svg#icon-chevron-down" /></svg>
                                    </button>
                                    {isRecommendGenreOpen && (
                                        <div className="absolute top-full mt-2 left-0 w-full z-30 bg-[#1F2937] border border-slate-600 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {AVAILABLE_GENRES.map(g => (
                                                <button key={g} type="button" onClick={() => toggleRecommendGenre(g)} className={`text-xs px-2 py-1.5 rounded border ${recommendExcludedGenres.includes(g) ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#111827] border-slate-700 hover:border-slate-500 transition-colors'}`}>
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    placeholder="Min year"
                                    value={recommendMinYear}
                                    onChange={e => setRecommendMinYear(e.target.value ? Number(e.target.value) : "")}
                                    className="w-32 bg-[#1F2937] border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-fuchsia-500 transition-colors placeholder:text-slate-500"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAskAI}
                                disabled={isRecommending}
                                className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-fuchsia-900/20 flex justify-center items-center gap-2"
                            >
                                {isRecommending ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" aria-hidden="true"><use href="/icons.svg#icon-spinner"></use></svg>
                                        Thinking...
                                    </>
                                ) : "Ask AI"}
                            </button>
                        </div>
                        <div ref={aiResponseRef} className="flex-1 bg-[#1F2937] border border-slate-700 rounded-xl p-4 overflow-y-auto custom-scrollbar mt-2 relative">
                            {aiResponse ? (
                                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {aiResponse}
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                                    <svg className="w-12 h-12 mb-3 opacity-20" aria-hidden="true">
                                        <use href="/icons.svg#icon-magic-wand"></use>
                                    </svg>
                                    <p className="text-sm">Click "Ask AI" to get personalized movie recommendations based on your watchlist.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};