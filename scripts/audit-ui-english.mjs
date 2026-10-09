import { readFile, readdir } from 'node:fs/promises';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { featureText } from '../shared/featureLocale.js';
const traverse = traverseModule.default;
const missing = new Map();
const inspect = (text, file) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (/[\u0d00-\u0d7f]/.test(featureText(normalized))) missing.set(normalized, [...new Set([...(missing.get(normalized) || []), file])]);
};
for (const file of (await readdir('src')).filter(file => file.endsWith('.jsx'))) {
  let tree;
  try { tree = parse(await readFile(`src/${file}`, 'utf8'), { sourceType: 'module', plugins: ['jsx'] }); }
  catch { continue; }
  traverse(tree, {
    JSXText(path) { inspect(path.node.value, file); },
    JSXExpressionContainer(path) {
      if (path.parent.type === 'JSXAttribute') return;
      path.traverse({ StringLiteral(child) { inspect(child.node.value, file); } });
    },
    JSXAttribute(path) {
      if (['title', 'aria-label', 'placeholder', 'alt', 'label'].includes(path.node.name.name) && path.node.value?.type === 'StringLiteral') inspect(path.node.value.value, file);
    },
  });
}
process.stdout.write(JSON.stringify(Object.fromEntries(missing), null, 2) + '\n');
