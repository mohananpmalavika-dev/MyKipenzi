import { readFile, readdir, writeFile } from 'node:fs/promises';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { normalizeFeatureText } from '../shared/featureLanguage.js';
const traverse = traverseModule.default;
const catalog = {};
function addBilingual(value) {
  const text = normalizeFeatureText(value);
  if (!/[\u0d00-\u0d7f]/.test(text) || !/[a-zA-Z]/.test(text)) return;
  const parenthesis = text.match(/^(.*?)\s*\(([^()]+)\)(.*?)$/);
  const pieces = parenthesis ? [parenthesis[1] + parenthesis[3], parenthesis[2]] : text.split(' · ');
  const english = pieces.find(piece => /[a-zA-Z]/.test(piece) && !/[\u0d00-\u0d7f]/.test(piece))?.trim();
  const malayalam = pieces.find(piece => /[\u0d00-\u0d7f]/.test(piece) && !/[a-zA-Z]/.test(piece))?.trim();
  if (english && malayalam) {
    catalog[text] ||= { en: english, ml: malayalam };
    catalog[english] ||= catalog[text];
    catalog[malayalam] ||= catalog[text];
  }
}
for (const directory of ['src', 'shared']) {
  for (const file of (await readdir(directory)).filter(name => /\.(jsx|js)$/.test(name))) {
    if (file === 'FriendshipLocale.jsx' || file === 'featureLanguage.js' || file === 'featureLocale.js') continue;
    const source = await readFile(`${directory}/${file}`, 'utf8');
    let ast;
    try { ast = parse(source, { sourceType: 'module', plugins: ['jsx'] }); }
    catch { process.stderr.write(`Skipping unparseable feature file ${file}\n`); continue; }
    traverse(ast, { StringLiteral(path) { addBilingual(path.node.value); }, JSXText(path) { addBilingual(path.node.value); }, ObjectExpression(path) {
      const fields = Object.fromEntries(path.node.properties.filter(property => property.type === 'ObjectProperty' && ['StringLiteral', 'Identifier'].includes(property.key.type) && property.value.type === 'StringLiteral').map(property => [property.key.name || property.key.value, property.value.value]));
      for (const [english, malayalam] of [[fields.name, fields.malayalamName], [fields.label, fields.labelMl], [fields.label, fields.label_ml]]) {
        if (english && malayalam) {
          const pair = { en: english, ml: malayalam };
          catalog[normalizeFeatureText(english)] = pair;
          catalog[normalizeFeatureText(malayalam)] = pair;
        }
      }
      for (const [key, english] of Object.entries(fields)) {
        const match = key.match(/^(.*?)(?:_en|En|_En)$/);
        if (!match) continue;
        const base = match[1], malayalam = fields[base + '_ml'] || fields[base + 'Ml'] || fields[base + '_Ml'];
        if (!malayalam) continue;
        const pair = { en: english, ml: malayalam };
        const swahili = fields[base + '_sw'] || fields[base + 'Sw'];
        if (swahili) pair.sw = swahili;
        catalog[normalizeFeatureText(english)] = pair;
        catalog[normalizeFeatureText(malayalam)] = pair;
      }
    } });
  }
}
await writeFile('shared/feature-pairs.json', JSON.stringify(catalog, null, 2) + '\n');
process.stdout.write(`Catalogued ${Object.keys(catalog).length} built-in language variants.\n`);
