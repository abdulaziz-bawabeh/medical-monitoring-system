const API_BASE_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
  ).replace(/\/+$/, "");
  
  export class ApiError extends Error {
    constructor(
      message,
      {
        status = 0,
        code = "REQUEST_FAILED",
        fieldErrors = {},
        data = null,
      } = {},
    ) {
      super(message);
  
      this.name = "ApiError";
      this.status = status;
      this.code = code;
      this.fieldErrors = fieldErrors;
      this.data = data;
    }
  }
  
  async function readResponseBody(response) {
    const contentType =
      response.headers.get("content-type") || "";
  
    if (!contentType.includes("application/json")) {
      return null;
    }
  
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  
  export async function apiRequest(
    path,
    {
      method = "GET",
      json,
      headers: customHeaders,
      signal,
    } = {},
  ) {
    const normalizedPath = path.startsWith("/")
      ? path
      : `/${path}`;
  
    const headers = new Headers(customHeaders);
  
    if (json !== undefined) {
      headers.set("Content-Type", "application/json");
    }
  
    let response;
  
    try {
      response = await fetch(
        `${API_BASE_URL}${normalizedPath}`,
        {
          method,
          headers,
  
          // يسمح للمتصفح بإرسال واستقبال HttpOnly Cookie.
          credentials: "include",
  
          body:
            json === undefined
              ? undefined
              : JSON.stringify(json),
  
          signal,
        },
      );
    } catch (error) {
      throw new ApiError(
        "Unable to connect to the medical monitoring server.",
        {
          code: "NETWORK_ERROR",
          data: error,
        },
      );
    }
  
    const responseBody =
      await readResponseBody(response);
  
    if (!response.ok) {
      throw new ApiError(
        responseBody?.message ||
          "The server rejected the request.",
        {
          status: response.status,
          code:
            responseBody?.code ||
            "REQUEST_FAILED",
          fieldErrors:
            responseBody?.fieldErrors || {},
          data: responseBody,
        },
      );
    }
  
    return responseBody;
  }
  
  export { API_BASE_URL };