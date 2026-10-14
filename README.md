# theorangery.hevilleandrick.com

The Orangery at Heville & Rick: candles, soaps and eaux de parfum, sold through the same Shopify store as the gallery.

- `index.html` is the whole site. The four scents are the `SCENTS` list near the top of the script (name, Shopify handle, colours, notes). The facade at the top is drawn from that same list.
- `shopify.js` reads the Shopify collection `the-orangery` through the Storefront API. Products appear on the shelf once they are **published to the Headless / storefront sales channel** and placed in that collection (the collection is automatic: any product tagged `orangery`). Until then the page says the first season is being prepared.
- A scent's bay links to its product page when a published product's handle matches the `handle` in `SCENTS`.
- The bag is a Shopify cart kept in this browser; checkout happens on Shopify.
- Remove the `noindex` line in the `<head>` at launch.

## Publishing
Cloudflare Pages project connected to this repository, production branch `main`, no build command, output directory `/`. Custom domain: `theorangery.hevilleandrick.com`. Every push to `main` goes live.

© 2026 House of Heville & Rick, a house of Ontokinesis Applied Systems LLC.
