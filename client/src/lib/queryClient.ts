import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Cloniamo la risposta per evitare il problema "body stream already read"
    const clonedRes = res.clone();
    
    // Tenta di analizzare la risposta JSON per messaggi di errore strutturati
    try {
      const errorData = await clonedRes.json();
      if (errorData.error) {
        throw new Error(errorData.error);
      } else if (errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error(`Errore ${res.status}: ${JSON.stringify(errorData)}`);
      }
    } catch (e) {
      // Se non è possibile analizzare come JSON, usa il corpo di testo
      try {
        const text = await res.text() || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      } catch (textError) {
        // Fallback se anche il testo non può essere letto
        throw new Error(`Errore ${res.status}: ${res.statusText}`);
      }
    }
  }
}

export async function apiRequest(
  urlOrOptions: string | { method: string; url?: string; data?: unknown },
  dataOrUrl?: unknown | string,
  optionalData?: unknown
): Promise<Response> {
  let method = "GET";
  let url: string;
  let data: unknown;

  // Gestisce entrambi i formati:
  // apiRequest("/api/sectors") - solo URL, GET
  // apiRequest("/api/sectors", data) - URL e dati, GET
  // apiRequest("POST", "/api/sectors", data) - metodo, URL e dati
  // apiRequest({ method: "POST", url: "/api/sectors", data }) - oggetto opzioni
  
  if (typeof urlOrOptions === 'object') {
    // Formato { method, url, data }
    method = urlOrOptions.method;
    url = urlOrOptions.url as string;
    data = urlOrOptions.data;
  } else if (typeof dataOrUrl === 'string') {
    // Formato (method, url, data)
    method = urlOrOptions;
    url = dataOrUrl;
    data = optionalData;
  } else {
    // Formato (url, data) o solo (url)
    url = urlOrOptions;
    data = dataOrUrl;
  }

  // Get stored mobile session ID for mobile app
  const mobileSessionId = localStorage.getItem('mobileSessionId');
  
  // Per le richieste GET/HEAD non possiamo includere un corpo
  const options: RequestInit = {
    method,
    headers: {
      ...(mobileSessionId && { 'x-mobile-session-id': mobileSessionId })
    },
    credentials: "include",
  };
  
  // Aggiunge il corpo solo per metodi diversi da GET/HEAD
  if (data && method !== 'GET' && method !== 'HEAD') {
    if (data instanceof FormData) {
      // For FormData, don't set Content-Type header (let browser set it with boundary)
      options.body = data;
    } else {
      // For JSON data, set Content-Type and stringify
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json"
      };
      options.body = JSON.stringify(data);
    }
  }
  
  const res = await fetch(url, options);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get stored mobile session ID for mobile app
    const mobileSessionId = localStorage.getItem('mobileSessionId');
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        ...(mobileSessionId && { 'x-mobile-session-id': mobileSessionId })
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
