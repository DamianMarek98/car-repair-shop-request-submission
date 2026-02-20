import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

export interface InterPartsProductData {
  sku: string;                    // Identyfikator produktu (SKU)
  manufacturer: string;            // Producent
  quantities: string[];            // Ilość (array: ["2", "2", ">10"]) - can be empty []
  branchAvailability: string[];    // W filii (GDP) (array: ["Teraz", "Jutro 05:00", "Pojutrze 05:00"]) - can be empty []
  routeDeparture: string[];        // Wyjazd trasy (array: ["Jutro 07:30", "Jutro 07:30", "2026-02-16 07:30"]) - can be empty []
  stock: string;                   // Stan
  priceGross: string;              // Cena BRUTTO (wholesale)
  priceRetail: string;             // Cena detal. (retail gross)
  productCode?: string;            // Internal Inter Cars code (E1A06E)
  productName?: string;            // Product name for context
}

export function parseInterPartsHTML(htmlContent: string): InterPartsProductData[] {
  const $ = cheerio.load(htmlContent);

  const products: InterPartsProductData[] = [];

  // Find all product containers
  $('tbody.listingcollapsed__item').each((index, element) => {
    const $product = $(element);

    // Extract product code
    const productCode = $product.attr('data-product-code') || '';

    // Extract SKU
    const sku = $product.find('a.activenumber.activenumber--listingcollapsed').first().text().trim();

    // Extract manufacturer (with multiple fallback strategies)
    let manufacturer = '';

    // Strategy 1: From data attribute
    const manufacturerAttr = $product.find('[data-clk-listing-collapsed-item-manufacturer]').attr('data-clk-listing-collapsed-item-manufacturer');
    if (manufacturerAttr) {
      manufacturer = manufacturerAttr.trim();
    }

    // Strategy 2: From img title attribute
    if (!manufacturer) {
      const imgTitle = $product.find('.listingcollapsed__manufacturer img[title]').attr('title');
      if (imgTitle) {
        manufacturer = imgTitle.trim();
      }
    }

    // Strategy 3: From div text content (for cases like "OE RENAULT")
    if (!manufacturer) {
      manufacturer = $product.find('.listingcollapsed__manufacturer').first().text().trim();
    }

    // Extract product name
    const productName = $product.find('.productname.productname--listingcollapsed').first().text().trim();

    // Extract availability data (quantities, branch availability, route departure)
    const quantities: string[] = [];
    const branchAvailability: string[] = [];
    const routeDeparture: string[] = [];

    // Find all availability blocks
    $product.find('.productdelivery__delivery .productdelivery__block').each((idx, block) => {
      const $block = $(block);

      // Skip the subheader block
      if ($block.hasClass('productdelivery__block--subheader')) {
        return;
      }

      // Extract data from each block
      const items = $block.find('.productdelivery__item');

      if (items.length >= 3) {
        // First item is quantity
        const quantity = $(items[0]).text().trim();
        quantities.push(quantity);

        // Second item is branch availability (W filii GDP)
        const branchDate = $(items[1]).find('.productdelivery__date').text().trim();
        branchAvailability.push(branchDate);

        // Third item is route departure (Wyjazd trasy)
        const routeDate = $(items[2]).find('.productdelivery__date').text().trim();
        routeDeparture.push(routeDate);
      }
    });

    // Extract stock information
    let stock = '';
    const stockAmount = $product.find('[data-clk-listing-item-availability-amount]').attr('data-clk-listing-item-availability-amount');
    if (stockAmount) {
      stock = stockAmount.trim();
    }

    // Extract prices
    let priceGross = '';
    let priceRetail = '';

    // Wholesale gross price
    const wholesaleGrossEl = $product.find('.productprice.js-product-price .productpricetoggle__gross .quantity__amount--new').first();
    if (wholesaleGrossEl.length > 0) {
      priceGross = wholesaleGrossEl.text().trim() + ' PLN';
    }

    // Retail gross price
    const retailGrossEl = $product.find('.productretailprice.js-product-retail-price .productpricetoggle__gross .quantity__amount--new').first();
    if (retailGrossEl.length > 0) {
      priceRetail = retailGrossEl.text().trim() + ' PLN';
    }

    // Build product data object
    const productData: InterPartsProductData = {
      sku: sku || 'N/A',
      manufacturer: manufacturer || 'N/A',
      quantities,
      branchAvailability,
      routeDeparture,
      stock: stock || 'N/A',
      priceGross: priceGross || 'N/A',
      priceRetail: priceRetail || 'N/A',
      productCode,
      productName,
    };

    products.push(productData);
  });

  return products;
}

function main() {
  const htmlFilePath = path.join(__dirname, 'test.html');

  console.log('Parsing Inter-Parts HTML file...');
  console.log(`File: ${htmlFilePath}\n`);

  // Read HTML file and pass content to parser
  const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
  const products = parseInterPartsHTML(htmlContent);

  console.log(`Found ${products.length} products\n`);

  // Display results in console table
  const tableData = products.map((product, index) => ({
    index: index + 1,
    sku: product.sku,
    manufacturer: product.manufacturer,
    quantities: product.quantities.join(', '),
    branchAvailability: product.branchAvailability.join(', '),
    routeDeparture: product.routeDeparture.join(', '),
    stock: product.stock,
    priceGross: product.priceGross,
    priceRetail: product.priceRetail,
  }));

  console.table(tableData);

  // Also print detailed view for first product as example
  if (products.length > 0) {
    console.log('\n=== Detailed view of first product ===');
    console.log(JSON.stringify(products[0], null, 2));
  }
}

// Run the parser only when executed directly, not when imported as a module
if (require.main === module) {
  main();
}
