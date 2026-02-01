export default function handler(request) {
  return new Response(JSON.stringify({ success: true, message: "API works!" }), {
    headers: { 'Content-Type': 'application/json' }
  };
}
