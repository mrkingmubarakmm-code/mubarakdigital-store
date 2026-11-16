
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://mrkingmubarakmm-code.github.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });

    if (url.pathname === "/") {
      return json({
        success: true,
        message: "DigitalStore API is running!"
      });
    }

    if (url.pathname === "/api/health") {
      try {
        const result = await env.DB
          .prepare("SELECT 1 AS connection_test")
          .first();

        return json({
          success: true,
          database: "Connected",
          test: result
        });
      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    return json({
      success: false,
      message: "API endpoint not found"
    }, 404);
  }
};
