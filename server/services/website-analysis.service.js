import axios from "axios";

function validateWebsiteUrl(url) {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid website URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS websites are supported.");
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  const blockedHosts = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
  ];

  if (
    blockedHosts.includes(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Local and internal websites are not allowed.");
  }

  return parsedUrl.toString();
}

function cleanText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match ? cleanText(match[1]) : "";
}

export async function fetchWebsiteContent(url) {
  const validatedUrl = validateWebsiteUrl(url);

  const response = await axios.get(validatedUrl, {
    timeout: 10000,
    maxContentLength: 2 * 1024 * 1024,
    maxBodyLength: 2 * 1024 * 1024,

    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; OSCAR-Website-Analyzer/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },

    validateStatus: (status) => status >= 200 && status < 400,
  });

  const html = String(response.data);

  return {
    url: validatedUrl,
    status: response.status,
    title: extractTitle(html),
    text: cleanText(html).slice(0, 20000),
  };
}