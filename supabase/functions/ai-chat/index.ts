// Supabase Edge Function
// Deno runtime

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    const { question, context } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing valid question." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const systemPrompt = `
You are a finance help assistant inside the MoneyMentor mobile app.

Rules:
- Be helpful, clear, and short.
- Use the provided transaction context only.
- Do not claim to see data that is not present.
- If the user asks for totals or patterns, use the context.
- If the user asks for financial advice, give educational suggestions, not legal/tax/professional guarantees.
- Never invent transactions.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4",
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `User question:\n${question}\n\nTransaction context:\n${JSON.stringify(
                  context,
                  null,
                  2
                )}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data?.error?.message ?? "OpenAI request failed.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const answer =
      data?.output_text ??
      "I could not generate a response from the finance assistant.";

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown server error.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
