import api from "../api";

export interface GeneratePrefixesRequest {
  prompt: string;
}

export interface GeneratePrefixesResponse {
  prefixes: string;
}

export const generatePrefixes = async (
  prompt: string
): Promise<GeneratePrefixesResponse> => {
  const response = await api.post<GeneratePrefixesResponse>(
    "/ai/generate-prefixes",
    { prompt }
  );
  return response.data;
};
