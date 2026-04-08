/**
 * Robust JSON extractor — finds the first complete JSON object in a string.
 * Works even when the LLM wraps it in backticks or adds surrounding text.
 */
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text.replace(/```json\s?|```/g, "");
  let depth = 0, start = -1, end = -1;

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        end = i;
        break;
      }
    }
  }

  if (start === -1 || end === -1) {
    throw new Error("No JSON found in response. Please retry.");
  }

  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
