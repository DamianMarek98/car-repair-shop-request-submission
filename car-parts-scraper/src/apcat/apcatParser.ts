import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

export interface ApcatProductData {
  dealerPartNumber: string;   // Wholesaler article number, e.g. "MD75117223"
  producer: string;           // Producer/manufacturer name, e.g. "MEAT & DORIA" (from einspeiser rows)
  availability: string[];     // Stock table entries, e.g. ["24h --", "CD 1", "HUB --", "48h --"]
  prices: string[];           // Price rows, e.g. ["Net purchase: 131,54 PLN", "Gross purchase: 161,79 PLN", ...]
}

export function parseApcatHTML(htmlContent: string): ApcatProductData[] {
  const $ = cheerio.load(htmlContent);
  const products: ApcatProductData[] = [];

  // Iterate all rows with a row_type attribute. Producer rows (row_type="einspeiser")
  // appear before their product rows (row_type="artikel1"). We track the current producer
  // and assign it to all product rows that follow until a new producer row appears.
  let currentProducer = '';

  $('tr[row_type]').each((_index, element) => {
    const $row = $(element);
    const rowType = $row.attr('row_type');

    // --- producer row ---
    // e.g. <tr row_type="einspeiser"><td colspan="8"><span>MEAT &amp; DORIA</span></td></tr>
    if (rowType === 'einspeiser') {
      currentProducer = $row.find('td[colspan] > span').first().text().trim();
      return; // continue to next row
    }

    // Only process product rows
    if (rowType !== 'artikel1') return;

    // --- dealerPartNumber ---
    // Located in: div.pnl_link_haendlernr > a.link_haendlernr > nobr
    const dealerPartNumber = $row
      .find('div.pnl_link_haendlernr a.link_haendlernr nobr')
      .first()
      .text()
      .trim();

    // --- availability ---
    // Located in: table#tbl_Erp_Info_Stock
    // Headers: tr.thr_title_Stock > th  (column names e.g. "24h", "CD", "HUB", "48h")
    // Values:  tr.tr_desc_Stock   > td > span
    const availability: string[] = [];
    const $stockTable = $row.find('table#tbl_Erp_Info_Stock');

    if ($stockTable.length > 0) {
      const headers: string[] = [];
      $stockTable.find('tr.thr_title_Stock th').each((_i, th) => {
        headers.push($(th).text().trim());
      });

      const values: string[] = [];
      $stockTable.find('tr.tr_desc_Stock td span').each((_i, span) => {
        values.push($(span).text().trim());
      });

      headers.forEach((header, i) => {
        const value = values[i] ?? '--';
        availability.push(`${header} ${value}`);
      });
    }

    // --- prices ---
    // Located in: table.tbl_al_erp_price
    // Each row: td.tbl_al_erp_price_spalte_prBez span  →  label (e.g. "Net purchase: ")
    //           td.tbl_al_erp_price_spalte_prVal span  →  value (e.g. "131,54 PLN")
    const prices: string[] = [];
    const $priceTable = $row.find('table.tbl_al_erp_price');

    if ($priceTable.length > 0) {
      $priceTable.find('tr').each((_i, tr) => {
        const label = $(tr).find('td.tbl_al_erp_price_spalte_prBez span').text().trim();
        const value = $(tr).find('td.tbl_al_erp_price_spalte_prVal span').text().trim();

        if (label && value) {
          prices.push(`${label} ${value}`);
        }
      });
    }

    products.push({
      dealerPartNumber: dealerPartNumber || 'N/A',
      producer: currentProducer,
      availability,
      prices,
    });
  });

  return products;
}

function main() {
  const htmlFilePath = path.join(__dirname, 'apcat-test.html');

  console.log('Parsing APCAT HTML file...');
  console.log(`File: ${htmlFilePath}\n`);

  const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
  const products = parseApcatHTML(htmlContent);

  console.log(`Found ${products.length} products\n`);

  const tableData = products.map((product, index) => ({
    index: index + 1,
    dealerPartNumber: product.dealerPartNumber,
    producer: product.producer,
    availability: product.availability.join(' | '),
    prices: product.prices.join(' | '),
  }));

  console.table(tableData);

  if (products.length > 0) {
    console.log('\n=== Detailed view of first product ===');
    console.log(JSON.stringify(products[0], null, 2));
  }
}

// Run the parser only when executed directly, not when imported as a module
if (require.main === module) {
  main();
}
