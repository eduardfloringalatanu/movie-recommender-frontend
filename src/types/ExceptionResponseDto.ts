interface ArgumentError {
    argument: string;
    errorCode2: string;
    constraints: unknown;
}

export interface ExceptionResponseDto {
    timestamp: string;
    status: number;
    errorCode: string;
    argumentErrors: ArgumentError[] | null;
}