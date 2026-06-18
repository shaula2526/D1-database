export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Header untuk CORS agar bisa diakses dari mana saja (termasuk Postman)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle Preflight Request untuk CORS
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. READ ALL (GET /users) & READ SINGLE (GET /users/:id)
      if (path.startsWith("/users") && method === "GET") {
        const id = path.split("/")[2];
        
        if (id) {
          const { results } = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).all();
          if (results.length === 0) {
            return new Response(JSON.stringify({ error: "User tidak ditemukan" }), { status: 404, headers: corsHeaders });
          }
          return new Response(JSON.stringify(results[0]), { status: 200, headers: corsHeaders });
        } else {
          const { results } = await env.DB.prepare("SELECT * FROM users").all();
          return new Response(JSON.stringify(results), { status: 200, headers: corsHeaders });
        }
      }

      // 2. CREATE (POST /users)
      if (path === "/users" && method === "POST") {
        const { name, email } = await request.json() as any;
        if (!name || !email) {
          return new Response(JSON.stringify({ error: "Name dan Email wajib diisi" }), { status: 400, headers: corsHeaders });
        }

        const info = await env.DB.prepare("INSERT INTO users (name, email) VALUES (?, ?)")
          .bind(name, email)
          .run();
          
        return new Response(JSON.stringify({ message: "User berhasil dibuat", id: info.meta.last_row_id }), { status: 201, headers: corsHeaders });
      }

      // 3. UPDATE (PUT /users/:id)
      if (path.startsWith("/users/") && method === "PUT") {
        const id = path.split("/")[2];
        const { name, email } = await request.json() as any;

        if (!name || !email) {
          return new Response(JSON.stringify({ error: "Name dan Email wajib diisi" }), { status: 400, headers: corsHeaders });
        }

        const { success } = await env.DB.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?")
          .bind(name, email, id)
          .run();

        if (!success) {
          return new Response(JSON.stringify({ error: "Gagal mengupdate user" }), { status: 400, headers: corsHeaders });
        }
        return new Response(JSON.stringify({ message: "User berhasil diupdate" }), { status: 200, headers: corsHeaders });
      }

      // 4. DELETE (DELETE /users/:id)
      if (path.startsWith("/users/") && method === "DELETE") {
        const id = path.split("/")[2];
        
        await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ message: "User berhasil dihapus" }), { status: 200, headers: corsHeaders });
      }

      // Route Tidak Ditemukan
      return new Response(JSON.stringify({ error: "Route Not Found" }), { status: 404, headers: corsHeaders });

    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  },
};
