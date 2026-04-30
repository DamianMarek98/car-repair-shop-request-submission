import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

export interface AutoPartnerProductData {
  name: string;         // e.g. "75117223E MD"
  producer: string;     // e.g. "VALEO" (from <b class="producer-name">)
  availability: string; // e.g. "3 [0]"
  price: string;        // e.g. "144,39 PLN brutto"
  priceNetto: string;   // e.g. "96,75 PLN netto" (from data-original-title on span.price-text)
  link?: string;        // Product page link from data-details-url
}

export function parseAutoPartnerHTML(htmlContent: string): AutoPartnerProductData[] {
  const $ = cheerio.load(htmlContent);
  const products: AutoPartnerProductData[] = [];

  $('tr[data-rel="product-info"]').each((_index, element) => {
    const $row = $(element);

    // --- availability ---
    // Located in: td.available > div > span (contains a <b> with quantity + text like "[0]")
    const $availabilitySpan = $row.find('td.available > div > span');
    if ($availabilitySpan.length === 0) {
      // Skip rows that have no availability data
      return;
    }

    const availabilityText = $availabilitySpan.text().trim();
    if (!availabilityText) {
      return;
    }

    // --- price ---
    // Located in: td.price span.price-text (value) + span.currency-text (currency)
    const $priceText = $row.find('td.price span.price-text');
    const $currencyText = $row.find('td.price span.currency-text');
    if ($priceText.length === 0) {
      // Skip rows that have no price data
      return;
    }

    const priceValue = $priceText.text().trim();
    const currency = $currencyText.text().trim();
    if (!priceValue) {
      return;
    }

    const price = `${priceValue} ${currency} brutto`.trim();

    // --- priceNetto ---
    // Located in: td.price span.price-text[data-original-title] e.g. "96,75 PLN netto"
    const priceNettoRaw = $priceText.attr('data-original-title') || '';
    const priceNetto = priceNettoRaw.trim();

    // --- name ---
    // Located in: span.marked.name-labels (text content, excluding the trailing <br>)
    const name = $row.find('span.marked.name-labels').first().text().trim();

    // --- producer ---
    // Located in: <b class="producer-name">VALEO</b> (may be absent)
    const producer = $row.find('b.producer-name').first().text().trim();

    // --- link ---
    const link = $row.attr('data-details-url') || undefined;

    products.push({
      name: name || 'N/A',
      producer: producer || '',
      availability: availabilityText,
      price,
      priceNetto,
      link,
    });
  });

  return products;
}

function main() {
  const htmlFilePath = path.join(__dirname, 'auto-partner-test.html');

  console.log('Parsing Auto Partner HTML file...');
  console.log(`File: ${htmlFilePath}\n`);

  const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
  const products = parseAutoPartnerHTML(htmlContent);

  console.log(`Found ${products.length} products\n`);

  const tableData = products.map((product, index) => ({
    index: index + 1,
    name: product.name,
    producer: product.producer,
    availability: product.availability,
    price: product.price,
  }));

  console.table(tableData);

  if (products.length > 0) {
    console.log('\n=== Detailed view of first product ===');
    console.log(JSON.stringify(products[0], null, 2));
  }
}

// Run the parser only when executed directly, not when imported as a module
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}
