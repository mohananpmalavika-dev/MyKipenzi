import { normalizeFeatureText } from '../shared/featureLanguage.js';
import { featureText } from '../shared/featureLocale.js';

const excluded = /[\\/](FriendshipLocale|MediaPlayer|MessageThread)\.jsx$/;

// Normalize built-in interface copy to English, independently of message receive language.
// Text remains a React text node: this adds no DOM wrappers or mutation observers.
export default function featureLocalePlugin({ types: t }) {
  const contentField = value => t.isMemberExpression(value) && (
    /^(label(?:Ml|En|_ml|Full)?|name(?:Ml|En)|malayalamName|description(?:Ml|En)|desc(?:Ml|En)|title(?:Ml|En)|question(?:Ml|En|_ml|_en)|text(?:Ml|En)|option[AB]_(?:Ml|En))$/.test(value.property.name || '') ||
    (t.isIdentifier(value.object, { name: 'action' }) && ['title', 'description', 'category', 'reason'].includes(value.property.name))
  );
  const safeContent = value => t.isStringLiteral(value) || contentField(value) || (t.isConditionalExpression(value) && safeContent(value.consequent) && safeContent(value.alternate));
  return {
    name: 'kipenzi-feature-locale',
    visitor: {
      Program: {
        enter(path, state) { state.featureLocale = !excluded.test(state.filename || '') && /[\\/]src[\\/].+\.jsx$/.test(state.filename || ''); },
        exit(path, state) {
          if (state.featureLocale && state.featureLocaleUsed) path.unshiftContainer('body', t.importDeclaration([t.importSpecifier(t.identifier('KipenziFeatureText'), t.identifier('FeatureText'))], t.stringLiteral('./FriendshipLocale.jsx')));
        },
      },
      JSXElement: {
        exit(path, state) {
          if (!state.featureLocale || path.node.openingElement.name.name === 'KipenziFeatureText') return;
          // User-entered fields, code, and native options must remain plain text.
          if (['textarea', 'script', 'style', 'code', 'pre', 'option'].includes(path.node.openingElement.name.name)) return;
          path.node.children = path.node.children.map(child => {
            let expression;
            if (t.isJSXText(child)) {
              const lines = child.value.replace(/\r/g, '').split('\n');
              const text = lines.map((line, index) => {
                let result = line.replace(/\t/g, ' ');
                if (index) result = result.replace(/^ +/, '');
                if (index < lines.length - 1) result = result.replace(/ +$/, '');
                return result;
              }).filter(Boolean).join(' ');
              if (!normalizeFeatureText(text) || !/[\p{L}]/u.test(text)) return child;
              expression = t.stringLiteral(text);
            } else if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
              const value = child.expression;
              if (!safeContent(value)) return child;
              expression = value;
            }
            else return child;
            state.featureLocaleUsed = true;
            return t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('KipenziFeatureText'), [t.jsxAttribute(t.jsxIdentifier('value'), t.jsxExpressionContainer(expression))], true), null, [], true);
          });
        },
      },
      JSXAttribute(path, state) {
        if (!state.featureLocale || !['title', 'aria-label', 'placeholder', 'alt', 'label'].includes(path.node.name.name)) return;
        if (t.isStringLiteral(path.node.value)) path.node.value.value = featureText(path.node.value.value);
      },
    },
  };
}
