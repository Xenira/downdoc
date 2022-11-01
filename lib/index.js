'use strict'

const ADMONITION_EMOJI = { CAUTION: '🔥', IMPORTANT: '❗', NOTE: '📌', TIP: '💡', WARNING: '⚠️' }
const CONUMS = { 1: '❶', 2: '❷', 3: '❸', 4: '❹', 5: '❺', 6: '❻', 7: '❼', 8: '❽', 9: '❾' }

const AttributeEntryRx = /^:([^:]+):(?: (.+)|)$/
const AttributeReferenceRx = /\\?\{([a-z0-9_-]+)\}/g
const AuthorInfoLineRx = /^(?:[\p{Alpha}0-9_]+(?: +[\p{Alpha}0-9_]+){0,2}(?: +<([^>]+)>)?(?:; |$))+$/u
const ConditionalDirectiveRx = /^if(n)?def::([^[]+)\[(.+)?\]$/
const ConumRx = / <([1-9])>$/
const MacroRx = /(?:link:|(image:)?(https?:))([^[]+)\[(|.*?[^\\])\]/g
const SectionMarkerRx = /^=+(?= \S)/
const SubAttributesRx = /^subs=(")?\+?attributes\+?\1$/

function downdoc (asciidoc) {
  const attrs = {}
  const lines = asciidoc.trimEnd().split('\n')
  let inHeader = asciidoc.startsWith('= ')
  let verbatim = false
  let skipping = false
  let subAttrs = false
  let indent
  let outdent
  let listNumeral = 1
  let prev
  return lines
    .reduce((accum, line) => {
      while (true) {
        const line_ = line
        const chr0 = line.charAt()
        if (skipping) {
          if (line === 'endif::[]' || line === '////' || (!inHeader && line === '|===')) skipping = false
          line = undefined
        } else if (verbatim) {
          if (line === '----') {
            verbatim = false
            line = '```'
          } else if (line.charAt(line.length - 1) === '>') {
            line = line.replace(ConumRx, (_, conum) => ' ' + CONUMS[conum])
          }
        } else if (chr0) {
          subAttrs = false
          if (chr0 === ':') {
            if (inHeader) {
              const [, name, value = ''] = line.match(AttributeEntryRx)
              attrs[name] = substituteAttributeReferences(value, attrs)
            }
            line = undefined
          } else if (line === 'endif::[]') {
            line = undefined
          } else if (chr0 === '/' && line.charAt(1) === '/') {
            if (line === '////') skipping = true
            line = undefined
          } else if (chr0 === 'i' && (line.startsWith('ifdef::') || line.startsWith('ifndef::'))) {
            const [, negated, name, text] = line.match(ConditionalDirectiveRx)
            skipping = negated ? name in attrs : !(name in attrs)
            if (text) {
              if (!skipping) {
                line = text
                continue
              }
              skipping = false
            }
            line = undefined
          } else if (chr0 === '=' && (!inHeader || line === lines[0]) && SectionMarkerRx.test(line)) {
            inHeader ? (attrs.doctitle = line.slice(2)) : (subAttrs = true)
            line = line.replace(SectionMarkerRx, (m) => '#'.repeat(m.length))
          } else if (inHeader) {
            if (!('author' in attrs) && AuthorInfoLineRx.test(line)) {
              const authors = line.split('; ').map((it) => it.split(' <')[0])
              Object.assign(attrs, { author: authors[0], authors: authors.join(', ') })
            }
            line = undefined
          } else if (chr0 === '.') {
            subAttrs = true
            if (line.charAt(1) === ' ') {
              indent = undefined
              line = `${listNumeral++}${line}`
            } else {
              line = `**${line.slice(1)}**`
            }
          } else if (chr0 === '[' && line.charAt(line.length - 1) === ']') {
            line = undefined
          } else if (line === '|===') {
            skipping = true
            line = undefined
          } else if (line === 'toc::[]') {
            line = undefined
          } else if (line === '----') {
            verbatim = true
            line = '```'
            if (prev && prev.charAt(0) === '[') {
              const blockAttrs = prev.slice(1, -1).split(',')
              line += (blockAttrs[1] || '').trimStart() // append the source language
              subAttrs = (subAttrs = blockAttrs.find((it) => it.startsWith('subs='))) && SubAttributesRx.test(subAttrs)
            }
          } else if (line === '+') {
            indent = '  '
            line = ''
          } else if (chr0 === ' ' && (!prev || outdent != null)) {
            if (!prev) {
              outdent = line.length - line.trimStart().length
              indent = '    '
            }
            line = line.slice(outdent)
          } else if (chr0 === '<' && CONUMS[line.charAt(1)]) {
            subAttrs = true
            line = line.slice(1).replace('>', '.')
          } else {
            line = substituteAttributeReferences(line, attrs)
              .replace(
                MacroRx,
                (_, img = '', scheme = '', target, text) =>
                  `${img && '!'}[${text.split(',')[0] || scheme + target}](${scheme + target})`
              )
              .replace(/(?:\[[^[\]]+\]|)(?<!\\)(\*.+?\*)/g, '*$1*')
              .replace(/(?:\[[^[\]]+\]|)\b(?<!\\)_(.+?)_(?=\b)/g, '*$1*')
              .replace(/`\\/g, '`')
              .replace(/^(CAUTION|IMPORTANT|NOTE|TIP|WARNING):(?=\s)/, (_, t) => ADMONITION_EMOJI[t] + ` **${t}:**`)
          }
        } else {
          if (accum[accum.length - 1] === '') line = undefined
          inHeader = false
          indent = outdent = undefined
          listNumeral = 1
        }
        if (line !== undefined) {
          if (line) {
            if (subAttrs) line = substituteAttributeReferences(line, attrs)
            if (indent) line = indent + line
          }
          accum.push(line)
        }
        prev = line_
        return accum
      }
    }, [])
    .join('\n')
}

function substituteAttributeReferences (text, attrs) {
  if (!(text && ~text.indexOf('{'))) return text
  return text.replace(AttributeReferenceRx, replaceAttributeReference.bind(attrs))
}

function replaceAttributeReference (match, name) {
  if (match.charAt() === '\\') return match.slice(1)
  return name in this ? this[name] : match
}

module.exports = downdoc
