import { describe, expect, test } from "vitest";
import { cleanProductUrl, decodeEntities, extractMetadata, parsePrice, previewFromUrl, titleFromUrl } from "./linkMetadata";

const shopPage = `<!doctype html><html><head>
<title>Vaso in ceramica Terra, 25 cm | Bottega Shop</title>
<meta property="og:site_name" content="Bottega Shop">
<meta property="og:title" content="Vaso in ceramica Terra, 25 cm &#8211; Bottega Shop">
<meta property="og:description" content="Vaso fatto a mano &amp; smaltato.">
<meta property="og:image" content="/img/vaso-terra.jpg">
<meta property="product:price:amount" content="59,90">
<meta property="product:price:currency" content="EUR">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Bottega"},{"@type":"Product","name":"Vaso in ceramica Terra","description":"<p>Vaso fatto a mano, smaltato, adatto a fiori freschi.</p>","image":["https://cdn.example-shop.it/vaso.jpg"],"offers":{"@type":"Offer","price":"45.00","priceCurrency":"EUR"}}]}
</script></head><body><h1>Vaso</h1></body></html>`;

describe("Estrazione dei dati prodotto", () => {
  test("preferisce il JSON-LD Product e ripulisce testo, prezzo e immagine", () => {
    const preview = extractMetadata(shopPage, "https://www.example-shop.it/vasi/terra?utm_source=newsletter&color=rosso");
    expect(preview).toMatchObject({ fetched: true, title: "Vaso in ceramica Terra", description: "Vaso fatto a mano, smaltato, adatto a fiori freschi.", priceCents: 4500, imageUrl: "https://cdn.example-shop.it/vaso.jpg", siteName: "Bottega Shop", url: "https://www.example-shop.it/vasi/terra?color=rosso" });
  });
  test("ricade su Open Graph e sul titolo della pagina, togliendo il nome del sito", () => {
    const withoutJsonLd = shopPage.replace(/<script[\s\S]*<\/script>/, "");
    const preview = extractMetadata(withoutJsonLd, "https://www.example-shop.it/vasi/terra");
    expect(preview.title).toBe("Vaso in ceramica Terra, 25 cm");
    expect(preview.description).toBe("Vaso fatto a mano & smaltato.");
    expect(preview.priceCents).toBe(5990);
    expect(preview.imageUrl).toBe("https://www.example-shop.it/img/vaso-terra.jpg");
    const onlyTitle = `<html><head><title>  Cuffie &quot;Studio&quot;  </title></head></html>`;
    expect(extractMetadata(onlyTitle, "https://shop.example-shop.it/p/1")).toMatchObject({ title: "Cuffie \"Studio\"", description: undefined, priceCents: undefined });
    const domainSuffix = `<html><head><title>Borsa a mano - marrone - Example-shop.it</title></head></html>`;
    expect(extractMetadata(domainSuffix, "https://www.example-shop.it/p/2").title).toBe("Borsa a mano - marrone");
    const countrySuffix = `<html><head><meta property="og:site_name" content="IKEA"><meta property="og:title" content="LYCKSELE divano letto  - IKEA Italia"></head></html>`;
    expect(extractMetadata(countrySuffix, "https://www.ikea.com/it/it/p/x").title).toBe("LYCKSELE divano letto");
  });
  test("ignora prezzi in valute diverse dall'euro e offerte malformate", () => {
    const usd = shopPage.replace("\"priceCurrency\":\"EUR\"", "\"priceCurrency\":\"USD\"");
    expect(extractMetadata(usd, "https://www.example-shop.it/vasi/terra").priceCents).toBeUndefined();
    const aggregate = shopPage.replace("{\"@type\":\"Offer\",\"price\":\"45.00\",\"priceCurrency\":\"EUR\"}", "{\"@type\":\"AggregateOffer\",\"lowPrice\":1299.5,\"priceCurrency\":\"EUR\"}");
    expect(extractMetadata(aggregate, "https://www.example-shop.it/vasi/terra").priceCents).toBe(129950);
    const specifications = shopPage.replace("{\"@type\":\"Offer\",\"price\":\"45.00\",\"priceCurrency\":\"EUR\"}", "{\"@type\":\"Offer\",\"priceSpecification\":[{\"@type\":\"UnitPriceSpecification\",\"price\":\"319\",\"priceCurrency\":\"EUR\",\"priceType\":\"https://schema.org/StrikethroughPrice\"},{\"@type\":\"UnitPriceSpecification\",\"price\":\"279\",\"priceCurrency\":\"EUR\"}]}");
    expect(extractMetadata(specifications, "https://www.example-shop.it/vasi/terra").priceCents).toBe(27900);
    const broken = shopPage.replace("\"@graph\"", "\"@graph");
    expect(extractMetadata(broken, "https://www.example-shop.it/vasi/terra")).toMatchObject({ title: "Vaso in ceramica Terra, 25 cm", priceCents: 5990 });
  });
  test("limita la lunghezza dei testi e rimuove markup", () => {
    const long = `<html><head><meta name="description" content="${"parola ".repeat(200)}"><meta property="og:title" content="&lt;b&gt;${"x".repeat(400)}&lt;/b&gt;"></head></html>`;
    const preview = extractMetadata(long, "https://www.example-shop.it/p");
    expect(preview.title?.length).toBeLessThanOrEqual(150);
    expect(preview.title).not.toContain("<");
    expect(preview.description?.length).toBeLessThanOrEqual(600);
    expect(preview.description?.endsWith("parola")).toBe(true);
  });
  test("non accetta immagini con schemi diversi da http e https", () => {
    const page = `<html><head><meta property="og:image" content="javascript:alert(1)"></head></html>`;
    expect(extractMetadata(page, "https://www.example-shop.it/p").imageUrl).toBeUndefined();
  });
});

describe("Prezzi, link e fallback", () => {
  test("interpreta i formati di prezzo italiani e internazionali", () => {
    expect(parsePrice("45,00")).toBe(4500);
    expect(parsePrice("45.00")).toBe(4500);
    expect(parsePrice("1.299,00")).toBe(129900);
    expect(parsePrice("1,299.00")).toBe(129900);
    expect(parsePrice("1.299")).toBe(129900);
    expect(parsePrice("€ 45,5")).toBe(4550);
    expect(parsePrice("EUR 12")).toBe(1200);
    expect(parsePrice(19.99)).toBe(1999);
    expect(parsePrice("")).toBeUndefined();
    expect(parsePrice("gratis")).toBeUndefined();
    expect(parsePrice(-5)).toBeUndefined();
    expect(parsePrice("999999999")).toBeUndefined();
  });
  test("rimuove i parametri di tracciamento e riduce i link Amazon all'ASIN", () => {
    expect(cleanProductUrl("https://www.amazon.it/Sony-WH-1000XM5-Cuffie-Wireless/dp/B09XS7JWHH/ref=sr_1_3?keywords=cuffie&tag=aff-21")).toBe("https://www.amazon.it/dp/B09XS7JWHH");
    expect(cleanProductUrl("https://shop.example-shop.it/p/1?utm_campaign=x&fbclid=abc&size=m#reviews")).toBe("https://shop.example-shop.it/p/1?size=m");
    expect(cleanProductUrl("non-un-url")).toBe("non-un-url");
  });
  test("ricava un titolo dallo slug Amazon quando la pagina non è leggibile", () => {
    expect(titleFromUrl("https://www.amazon.it/Sony-WH-1000XM5-Cuffie-Wireless/dp/B09XS7JWHH")).toBe("Sony WH 1000XM5 Cuffie Wireless");
    expect(titleFromUrl("https://www.amazon.it/dp/B09XS7JWHH")).toBeUndefined();
    expect(titleFromUrl("https://www.example-shop.it/p/1")).toBeUndefined();
    expect(previewFromUrl("https://www.amazon.it/Sony-WH-1000XM5-Cuffie-Wireless/dp/B09XS7JWHH?tag=x")).toEqual({ url: "https://www.amazon.it/dp/B09XS7JWHH", fetched: false, title: "Sony WH 1000XM5 Cuffie Wireless" });
  });
  test("decodifica le entità HTML più comuni", () => {
    expect(decodeEntities("Tom &amp; Jerry &#8364; &#x20AC; &euro; &unknown;")).toBe("Tom & Jerry € € € &unknown;");
  });
});
