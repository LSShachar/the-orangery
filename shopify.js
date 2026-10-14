/* A small bridge to the Shopify store (Storefront API).
   Used by The Orangery (one collection, product pages, bag).
   The storefront token is public by design: it can only read published products and make carts. */
window.SHOP = (() => {
  const CFG = {
    domain: 'uz01gp-ge.myshopify.com',
    token: 'a174cb76b040fc58070e0007693aec9b',
    version: '2026-01',
  };
  const ready = !!CFG.token && !CFG.token.startsWith('__');
  const endpoint = `https://${CFG.domain}/api/${CFG.version}/graphql.json`;

  async function gql(query, variables = {}) {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': CFG.token },
      body: JSON.stringify({ query, variables }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.errors) throw new Error((body.errors && body.errors[0] && body.errors[0].message) || `Store unavailable (${r.status})`);
    return body.data;
  }

  const money = m => m ? new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currencyCode }).format(Number(m.amount)) : '';

  const PRODUCT = `id handle title description availableForSale vendor tags
    featuredImage { url altText }
    images(first: 8) { nodes { url altText } }
    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
    options { name optionValues { name } }
    variants(first: 100) { nodes { id title availableForSale price { amount currencyCode } selectedOptions { name value } image { url altText } } }`;

  async function collections() {
    const d = await gql(`query { collections(first: 30) { nodes { handle title products(first: 100) { nodes { ${PRODUCT} } } } } }`);
    return d.collections.nodes;
  }
  async function collection(handle) {
    const d = await gql(`query($h: String!) { collection(handle: $h) { handle title products(first: 100) { nodes { ${PRODUCT} } } } }`, { h: handle });
    return d.collection;
  }
  async function product(handle) {
    const d = await gql(`query($h: String!) { product(handle: $h) { ${PRODUCT} } }`, { h: handle });
    return d.product;
  }

  /* ---------- the bag (a Shopify cart, remembered in this browser) ---------- */
  const KEY = 'orangery-cart-id';
  const CART = `id checkoutUrl totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 100) { nodes { id quantity
      cost { totalAmount { amount currencyCode } }
      merchandise { ... on ProductVariant { id title image { url altText } price { amount currencyCode } product { title handle featuredImage { url altText } } } } } }`;
  const store = {
    get(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } },
    set(v){ try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch(e){} },
  };
  const check = (res, name) => {
    const errs = res[name] && res[name].userErrors;
    if (errs && errs.length) throw new Error(errs[0].message);
    return res[name].cart;
  };
  async function getCart() {
    const id = store.get(); if (!id) return null;
    const d = await gql(`query($id: ID!) { cart(id: $id) { ${CART} } }`, { id });
    if (!d.cart) store.set(null);
    return d.cart;
  }
  async function add(variantId, quantity = 1) {
    const id = store.get();
    if (id) {
      try {
        const d = await gql(`mutation($id: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $id, lines: $lines) { cart { ${CART} } userErrors { message } } }`,
          { id, lines: [{ merchandiseId: variantId, quantity }] });
        const c = check(d, 'cartLinesAdd'); if (c) return c;
      } catch (e) { store.set(null); }
    }
    const d = await gql(`mutation($lines: [CartLineInput!]!) { cartCreate(input: { lines: $lines }) { cart { ${CART} } userErrors { message } } }`,
      { lines: [{ merchandiseId: variantId, quantity }] });
    const c = check(d, 'cartCreate'); store.set(c.id); return c;
  }
  async function setQty(lineId, quantity) {
    const id = store.get();
    const d = quantity > 0
      ? await gql(`mutation($id: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $id, lines: $lines) { cart { ${CART} } userErrors { message } } }`, { id, lines: [{ id: lineId, quantity }] })
      : await gql(`mutation($id: ID!, $ids: [ID!]!) { cartLinesRemove(cartId: $id, lineIds: $ids) { cart { ${CART} } userErrors { message } } }`, { id, ids: [lineId] });
    return check(d, quantity > 0 ? 'cartLinesUpdate' : 'cartLinesRemove');
  }
  /* a one-off purchase straight to checkout (the coffee) */
  async function buyNow(variantId, quantity = 1) {
    const d = await gql(`mutation($lines: [CartLineInput!]!) { cartCreate(input: { lines: $lines }) { cart { checkoutUrl } userErrors { message } } }`,
      { lines: [{ merchandiseId: variantId, quantity }] });
    return check(d, 'cartCreate').checkoutUrl;
  }

  return { ready, gql, money, collections, collection, product, cart: { get: getCart, add, setQty }, buyNow };
})();
