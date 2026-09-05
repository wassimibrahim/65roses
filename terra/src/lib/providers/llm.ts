/**
 * Terra Intelligence provider interface.
 *
 * The MVP answers questions deterministically against the internal database
 * and never leaves the server. An external model is opt-in through
 * LLM_PROVIDER and, when enabled, receives only the fields a caller explicitly
 * passes — confidential material is never sent implicitly.
 */

export interface QueryContext {
  question: string;
  /** Structured, already-authorised rows. Never raw database access. */
  facts: Record<string, unknown>[];
}

export interface QueryAnswer {
  answer: string;
  provider: "deterministic" | "external";
}

export interface IntelligenceProvider {
  readonly name: string;
  /** Narrate a result set. The deterministic provider does not call out. */
  narrate(context: QueryContext): Promise<QueryAnswer>;
}

class DeterministicProvider implements IntelligenceProvider {
  readonly name = "deterministic";

  async narrate(context: QueryContext): Promise<QueryAnswer> {
    const count = context.facts.length;
    return {
      answer:
        count === 0
          ? "Nothing in the database matches that."
          : `${count} ${count === 1 ? "result" : "results"} from Terra's own records.`,
      provider: "deterministic",
    };
  }
}

/**
 * Placeholder for a future hosted model. It refuses rather than silently
 * falling back, so a misconfigured deployment cannot leak by accident.
 */
class ExternalProviderNotConfigured implements IntelligenceProvider {
  readonly name = "external";

  async narrate(): Promise<QueryAnswer> {
    throw new Error(
      "LLM_PROVIDER is set but no external provider is configured. Terra Intelligence will not send data to an unconfigured endpoint.",
    );
  }
}

export function intelligenceProvider(): IntelligenceProvider {
  const configured = process.env.LLM_PROVIDER ?? "none";
  if (configured === "none" || configured === "") return new DeterministicProvider();
  return new ExternalProviderNotConfigured();
}

export function externalIntelligenceEnabled(): boolean {
  const configured = process.env.LLM_PROVIDER ?? "none";
  return configured !== "none" && configured !== "";
}
