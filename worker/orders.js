
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin":
        "https://mrkingmubarakmm-code.github.io"
    }
  });

export async function handleOrders(request, env) {
  if (request.method !== "POST") {
    return json({
      success: false,
      message: "Method not allowed"
    }, 405);
  }

  try {
    const body = await request.json();

    const {
      customerName,
      phone,
      game,
      gameId,
      note = "",
      items
    } = body;

    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > 20
    ) {
      return json({
        success: false,
        message: "Invalid order information"
      }, 400);
    }

    const orderItems = [];
    let total = 0;

    for (const item of items) {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 100
      ) {
        return json({
          success: false,
          message: "Invalid product quantity"
        }, 400);
      }

      const product = await env.DB
        .prepare(
          "SELECT id, name, price FROM products WHERE id = ? AND active = 1"
        )
        .bind(item.productId)
        .first();

      if (!product) {
        return json({
          success: false,
          message: "Product not found or unavailable"
        }, 400);
      }

      const subtotal = Number(product.price) * item.quantity;

      orderItems.push({
        name: product.name,
        quantity: item.quantity,
        price: Number(product.price),
        subtotal
      });

      total += subtotal;
    }

    const orderNumber =
      "DS-" + crypto.randomUUID().slice(0, 8).toUpperCase();

    const orderResult = await env.DB
      .prepare(`
        INSERT INTO orders (
          order_number,
          customer_name,
          phone,
          game,
          game_id,
          note,
          total_amount,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
      `)
      .bind(
        orderNumber,
        customerName.trim(),
        phone.trim(),
        String(game || ""),
        String(gameId || ""),
        String(note || ""),
        total
      )
      .run();

    const orderId = orderResult.meta.last_row_id;

    const statements = orderItems.map(item =>
      env.DB.prepare(`
        INSERT INTO order_items (
          order_id,
          product_name,
          quantity,
          unit_price,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        orderId,
        item.name,
        item.quantity,
        item.price,
        item.subtotal
      )
    );

    await env.DB.batch(statements);

    return json({
      success: true,
      message: "Order created successfully",
      orderNumber,
      totalAmount: total
    }, 201);

  } catch (error) {
    return json({
      success: false,
      message: "Unable to create order",
      error: error.message
    }, 500);
  }
}
