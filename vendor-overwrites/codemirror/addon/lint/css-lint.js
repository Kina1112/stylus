// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// Depends on csslint.js from https://github.com/stubbornella/csslint

/* global CodeMirror require define */
/* global CSSLint stylelint stylelintDefaultConfig csslintDefaultRuleset */
'use strict';

(mod => {
  if (typeof exports === 'object' && typeof module === 'object') {
    // CommonJS
    mod(require('../../lib/codemirror'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['../../lib/codemirror'], mod);
  } else {
    // Plain browser env
    mod(CodeMirror);
  }
})(CodeMirror => {
  CodeMirror.registerHelper('lint', 'csslint', text => {
    const found = [];
    if (!window.CSSLint) {
      return found;
    }
    /* STYLUS: hack start (part 1) */
    return BG.chromeLocal.getValue('editorCSSLintRules').then((ruleset = csslintDefaultRuleset) => {
      // csslintDefaultRuleset stored in csslint-ruleset.js & loaded by edit/lint.js
      if (Object.keys(ruleset).length === 0) {
        ruleset = Object.assign({}, csslintDefaultRuleset);
      }
      const results = CSSLint.verify(text, ruleset);
      const messages = results.messages;
      const hslRegex = /hsla?\(\s*(-?\d+)%?\s*,\s*(-?\d+)%\s*,\s*(-?\d+|-?\d*.\d+)%(\s*,\s*(-?\d+|-?\d*.\d+))?\s*\)/;
      let message = null;
      /* STYLUS: hack end */

      for (let i = 0; i < messages.length; i++) {
        message = messages[i];

        /* STYLUS: hack start (part 2) */
        if (message.type === 'warning') {
           // @font-face {font-family: 'Ampersand'; unicode-range: U+26;}
          if (message.message.indexOf('unicode-range') !== -1) {
            continue;
          } else if (
            // color: hsl(210, 100%, 2.2%); or color: hsla(210, 100%, 2.2%, 0.3);
            message.message.startsWith('Expected (<color>) but found \'hsl') &&
            hslRegex.test(message.message)
          ) {
            continue;
          }
        }
        const startLine = message.line - 1;
        const endLine = message.line - 1;
        const startCol = message.col - 1;
        const endCol = message.col;
        /* STYLUS: hack end */

        found.push({
          from: CodeMirror.Pos(startLine, startCol),
          to: CodeMirror.Pos(endLine, endCol),
          message: message.message + ` (${message.rule.id})`,
          severity : message.type
        });
      }
      return found;
    });
  });

  CodeMirror.registerHelper('lint', 'stylelint', text => {
    const found = [];
    window.stylelint = require('stylelint').lint;
    if (window.stylelint) {
      return BG.chromeLocal.getValue('editorStylelintRules').then((rules = stylelintDefaultConfig.rules) => {
        // stylelintDefaultConfig stored in stylelint-config.js & loaded by edit/lint.js
        if (Object.keys(rules).length === 0) {
          rules = stylelintDefaultConfig.rules;
        }
        return stylelint({
          code: text,
          config: {
            syntax: stylelintDefaultConfig.syntax,
            rules: rules
          }
        }).then(output => {
          const warnings = output.results.length ? output.results[0].warnings : [];
          const len = warnings.length;
          let warning;
          let message;
          if (len) {
            for (let i = 0; i < len; i++) {
              warning = warnings[i];
              message = warning.text
                .replace('Unexpected ', '')
                .replace(/^./, function (firstLetter) {
                  return firstLetter.toUpperCase();
                });
              found.push({
                from: CodeMirror.Pos(warning.line - 1, warning.column - 1),
                to: CodeMirror.Pos(warning.line - 1, warning.column),
                message,
                severity : warning.severity
              });
            }
          }
          return found;
        });
      });
    }
    return found;
  });
});
