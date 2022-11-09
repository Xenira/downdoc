/* eslint-env mocha */
'use strict'

const { expect, heredoc } = require('./harness')
const downdoc = require('downdoc')

describe('downdoc()', () => {
  describe('document parts', () => {
    it('should convert empty document', () => {
      const input = ''
      expect(downdoc(input)).to.equal(input)
    })

    it('should convert document with only body', () => {
      const input = 'Body.'
      expect(downdoc(input)).to.equal(input)
    })

    it('should convert document with only document title', () => {
      const input = '= Title'
      const expected = '# Title'
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert document with header and body', () => {
      const input = heredoc`
        = Title

        Body.
      `
      const expected = heredoc`
        # Title

        Body.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert document with body directly adjacent to header', () => {
      const input = heredoc`
        = Title
        Body.
      `
      const expected = heredoc`
        # Title

        Body.
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('document header', () => {
    it('should store document title in doctitle attribute', () => {
      const input = heredoc`
        = Document Title

        The title of this document is {doctitle}.
      `
      const expected = heredoc`
        # Document Title

        The title of this document is Document Title.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should discard author line with single author', () => {
      const input = heredoc`
        = Title
        Doc Writer <doc@example.org>

        Body written by {author}.
      `
      const expected = heredoc`
        # Title

        Body written by Doc Writer.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should discard author line with multiple authors', () => {
      const input = heredoc`
        = Title
        Doc Writer <doc@example.org>; Junior Écrivain <jr@example.org>

        Body written by {authors}.
      `
      const expected = heredoc`
        # Title

        Body written by Doc Writer, Junior Écrivain.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should process and remove attribute entries found in document header below doctitle', () => {
      const input = heredoc`
        = Title
        :foo: bar
        :yin: yang

        Body
      `
      const expected = heredoc`
        # Title

        Body
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should process and remove attribute entries found in document header above doctitle', () => {
      const input = heredoc`
        :foo: bar
        :yin: yang
        = Title

        Body
      `
      const expected = heredoc`
        # Title

        Body
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should remove attribute entries found in body', () => {
      const input = heredoc`
        = Title

        before

        :ignore-me:

        after
      `
      const expected = heredoc`
        # Title

        before

        after
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should substitute attribute reference in value of attribute entry', () => {
      const input = heredoc`
        :project-slug: acme
        = Title
        :url-org: https://example.org
        :url-project: {url-org}/{project-slug}

        The URL for this project is {url-project}.
      `
      const expected = heredoc`
        # Title

        The URL for this project is https://example.org/acme.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should set value of attribute entry to empty string if value is not specified', () => {
      const input = heredoc`
        = Title
        :empty-string:

        foo{empty-string}bar
      `
      const expected = heredoc`
        # Title

        foobar
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should allow seed attributes to be passed in to API function', () => {
      const input = heredoc`
        = Title
        :attribute-from-document: from document
        :attribute-from-api: from document

        {attribute-from-api}

        {attribute-from-document}
      `
      const expected = heredoc`
        # Title

        from API

        from document
      `
      expect(downdoc(input, { attributes: { 'attribute-from-api': 'from API' } })).to.equal(expected)
    })

    it('should ignore doctitle attribute set from CLI', () => {
      const input = heredoc`
        = Document Title

        The doctitle is {doctitle}.
      `
      const expected = heredoc`
        # Document Title

        The doctitle is Document Title.
      `
      expect(downdoc(input, { attributes: { doctitle: 'Title' } })).to.equal(expected)
    })
  })

  describe('attribute references', () => {
    it('should substitute attribute reference in paragraph', () => {
      const input = heredoc`
        = Title
        :project-name: ACME

        The name of this project is {project-name}.
      `
      const expected = heredoc`
        # Title

        The name of this project is ACME.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should substitute multiple attribute references in same line', () => {
      const input = heredoc`
        = Title
        :author-1: Jim
        :author-2: Jane

        This project was created by {author-1} and {author-2}.
      `
      const expected = heredoc`
        # Title

        This project was created by Jim and Jane.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should substitute attribute reference in section title', () => {
      const input = heredoc`
        = Title
        :product: ACME

        == Introduction to {product}

        Let's get acquainted.
      `
      const expected = heredoc`
        # Title

        ## Introduction to ACME

        Let's get acquainted.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should substitute attribute reference in unordered list item', () => {
      const input = heredoc`
        = Title
        :product: ACME
        :url-product: https://example.org/acme

        . First, download the {product} installer from the {url-product}[{product} website].
      `
      const expected = heredoc`
        # Title

        1. First, download the ACME installer from the https://example.org/acme[ACME website].
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should unescape escaped attribute references', () => {
      const input = heredoc`
        = Title

        Use the endpoint \`/repos/\\{owner}/\\{repo}\` to retrieve information about a repository.
      `
      expect(input).to.include('\\')
      const expected = heredoc`
        # Title

        Use the endpoint \`/repos/{owner}/{repo}\` to retrieve information about a repository.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should skip unresolved attribute reference', () => {
      const input = heredoc`
        = Title

        This project is named {unknown}.
      `
      const expected = heredoc`
        # Title

        This project is named {unknown}.
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('sections', () => {
    it('should convert section titles', () => {
      const input = heredoc`
        = Title

        == Level 1

        content

        === Level 2

        ==== Level 3

        content

        == Another Level 1
      `
      const expected = heredoc`
        # Title

        ## Level 1

        content

        ### Level 2

        #### Level 3

        content

        ## Another Level 1
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('text formatting', () => {
    it('should convert bold formatting', () => {
      const input = heredoc`
        = Title

        You *really* need to check *this* * out!
      `
      const expected = heredoc`
        # Title

        You **really** need to check **this** * out!
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert bold formatting in unordered list item', () => {
      const input = heredoc`
        * be *bold*
      `
      const expected = heredoc`
        * be **bold**
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert italic formatting', () => {
      const input = heredoc`
        = Title

        The _ is _so_ incredibly _useful_ when making snake_case.
      `
      const expected = heredoc`
        # Title

        The _ is *so* incredibly *useful* when making snake_case.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert monospace formatting', () => {
      const input = heredoc`
        = Title

        A boolean value can be \`true\` or \`false\`.
      `
      const expected = heredoc`
        # Title

        A boolean value can be \`true\` or \`false\`.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should honor backslash at start of monospace formatting', () => {
      const input = heredoc`
        = Title

        Visit \`\\http://localhost:8080\` in your browser to see a preview.
      `
      const expected = heredoc`
        # Title

        Visit \`http://localhost:8080\` in your browser to see a preview.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should drop attribute list in front of formatted text', () => {
      const input = heredoc`
        = Title

        Use downdoc to convert [.path]_README.adoc_ to [.path]_README.md_ *before* publishing.
      `
      const expected = heredoc`
        # Title

        Use downdoc to convert *README.adoc* to *README.md* **before** publishing.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert formatted text before replacing attribute references', () => {
      const input = heredoc`
        = Title
        :italic: *italic*

        {italic}
      `
      const expected = heredoc`
        # Title

        *italic*
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should not drop line that starts with formatting text with attribute list', () => {
      const input = heredoc`
        = Title

        [.path]_README.adoc_ contains all the essential information.
      `
      const expected = heredoc`
        # Title

        *README.adoc* contains all the essential information.
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('xrefs', () => {
    it('should convert internal xrefs', () => {
      const input = heredoc`
        = Title
        :idprefix:
        :idseparator: -

        == First Section

        Go to the <<second-section,next section>> or skip to <<#fin, the end>>.

        == Second Section

        Go to the xref:first-section[previous section] or continue to xref:#fin[the end].

        == Fin

        The end.
      `
      const expected = heredoc`
        # Title

        ## First Section

        Go to the [next section](#second-section) or skip to [the end](#fin).

        ## Second Section

        Go to the [previous section](#first-section) or continue to [the end](#fin).

        ## Fin

        The end.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should fill in text for backward xref', () => {
      const input = heredoc`
        = HOWTO
        :idprefix:
        :idseparator: -

        == System Requirements

        A computer connected to the internet.

        == Usage

        Be sure you have read the <<system-requirements>>.
      `
      const expected = heredoc`
        # HOWTO

        ## System Requirements

        A computer connected to the internet.

        ## Usage

        Be sure you have read the [System Requirements](#system-requirements).
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should not fill in text for xref to doctitle without explicit ID', () => {
      const input = heredoc`
        = HOWTO

        In this <<_howto>>, you will learn how to do stuff.
      `
      const expected = heredoc`
        # HOWTO

        In this [_howto](#_howto), you will learn how to do stuff.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should fill in text for xref to doctitle with explicit ID', () => {
      const input = heredoc`
        [#howto]
        = HOWTO

        In this <<howto>>, you will learn how to do stuff.
      `
      const expected = heredoc`
        # HOWTO

        In this [HOWTO](#howto), you will learn how to do stuff.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should fill in text for forward xref', () => {
      const input = heredoc`
        = Title
        :idprefix:

        == System Requirements

        A computer connected to the internet.
        Once you have that, move on to <<usage>>.

        == Usage

        Let's get started.
      `
      const expected = heredoc`
        # Title

        ## System Requirements

        A computer connected to the internet.
        Once you have that, move on to [Usage](#usage).

        ## Usage

        Let's get started.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should honor idprefix and idseparator when mapping autogenerated IDs', () => {
      const input = heredoc`
        = Title
        :idprefix: ref_
        :idseparator: -

        == System Requirements

        == Get Started

        Check the <<ref_system-requirements>>, then <<ref_get-started>>.
      `
      const expected = heredoc`
        # Title

        ## System Requirements

        ## Get Started

        Check the [System Requirements](#system-requirements), then [Get Started](#get-started).
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should rewrite explicit ID to auto-generated ID', () => {
      const input = heredoc`
        = HOWTO

        You'll learn how to <<build>> and how to xref:deploy[].

        [#build]
        == Build Your Site

        Instructions go here.

        [[deploy]]
        == Deploy Your Site

        Instructions go here.
      `
      const expected = heredoc`
        # HOWTO

        You'll learn how to [Build Your Site](#build-your-site) and how to [Deploy Your Site](#deploy-your-site).

        ## Build Your Site

        Instructions go here.

        ## Deploy Your Site

        Instructions go here.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should preserve escaped square brackets in xref text', () => {
      const input = heredoc`
        = Title
        :idprefix:
        :idseparator: -

        The next section covers the xref:array-of-strings[String\\[\\] type].

        [#array-of-strings]
        == Array of strings

        A type that represents multiple string values.
      `
      const expected = heredoc`
        # Title

        The next section covers the [String\\[\\] type](#array-of-strings).

        ## Array of strings

        A type that represents multiple string values.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should replace attribute reference in title of internal reference', () => {
      const input = heredoc`
        = Title
        :product: ACME

        Let's <<get-started>>.

        [[get-started]]
        == Get Started with {product}

        Let's go!
      `
      const expected = heredoc`
        # Title

        Let's [Get Started with ACME](#get-started-with-acme).

        ## Get Started with ACME

        Let's go!
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should use ID as text for unresolved xref', () => {
      const input = heredoc`
        = Title

        Refer to <<webserver-instructions>> to set up your webserver.
      `
      const expected = heredoc`
        # Title

        Refer to [webserver-instructions](#webserver-instructions) to set up your webserver.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should not prepend # to target of external xref', () => {
      const input = heredoc`
        = Title

        Please refer to the <<contributing.adoc#,contributing guide>>.
        The xref:contribution.adoc[contribution guide] will teach you how to <<contribution.adoc#build-project,build the project>>.
      `
      const expected = heredoc`
        # Title

        Please refer to the [contributing guide](contributing.adoc).
        The [contribution guide](contribution.adoc) will teach you how to [build the project](contribution.adoc#build-project).
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('macros', () => {
    it('should convert URL macro', () => {
      const input = heredoc`
        = Title

        These tests are run using https://mochajs.org[Mocha].
      `
      const expected = heredoc`
        # Title

        These tests are run using [Mocha](https://mochajs.org).
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert URL macro defined using attribute reference', () => {
      const input = heredoc`
        = Title
        :url-mocha: https://mochajs.org

        These tests are run using {url-mocha}[Mocha].
      `
      const expected = heredoc`
        # Title

        These tests are run using [Mocha](https://mochajs.org).
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert link macro to relative file', () => {
      const input = heredoc`
        = Title

        See link:LICENSE[LICENSE] or link:LICENSE[] to find the license text.
      `
      const expected = heredoc`
        # Title

        See [LICENSE](LICENSE) or [LICENSE](LICENSE) to find the license text.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert URL macro with link macro prefix', () => {
      const input = heredoc`
        = Title

        These tests are run using link:https://mochajs.org[Mocha].
      `
      const expected = heredoc`
        # Title

        These tests are run using [Mocha](https://mochajs.org).
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should preserve escaped square brackets in link text', () => {
      const input = heredoc`
        = Title

        The https://example.org[toc::\\[\\]] macro is not supported in Markdown.
      `
      const expected = heredoc`
        # Title

        The [toc::\\[\\]](https://example.org) macro is not supported in Markdown.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should not convert bare URL', () => {
      const input = heredoc`
        = Title

        https://example.org is a domain for tests, like this one.
      `
      const expected = heredoc`
        # Title

        https://example.org is a domain for tests, like this one.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert local inline image', () => {
      const input = heredoc`
        = Title

        When you see image:green-bar.png[green bar], you know the tests have passed!
      `
      const expected = heredoc`
        # Title

        When you see ![green bar](green-bar.png), you know the tests have passed!
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert remote inline image', () => {
      const input = heredoc`
        = Title

        * image:https://cdn.jsdelivr.net/gh/madebybowtie/FlagKit/Assets/PNG/FR.png[fr]
      `
      const expected = heredoc`
        # Title

        * ![fr](https://cdn.jsdelivr.net/gh/madebybowtie/FlagKit/Assets/PNG/FR.png)
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert local block image', () => {
      const input = heredoc`
        = Title

        Here's a screenshot of the application in action.

        image::screenshot.png[Screenshot]
      `
      const expected = heredoc`
        # Title

        Here's a screenshot of the application in action.

        ![Screenshot](screenshot.png)
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert remote block image', () => {
      const input = heredoc`
        = Title

        image::https://cdn.jsdelivr.net/gh/madebybowtie/FlagKit/Assets/PNG/FR.png[fr,32]
      `
      const expected = heredoc`
        # Title

        ![fr](https://cdn.jsdelivr.net/gh/madebybowtie/FlagKit/Assets/PNG/FR.png)
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should preserve escaped square brackets in image alt text', () => {
      const input = heredoc`
        = Title

        image::square-brackets.png[The \\[ and \\] brackets]
      `
      const expected = heredoc`
        # Title

        ![The \\[ and \\] brackets](square-brackets.png)
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should not match macro whose target contains backslash characters', () => {
      const input = heredoc`
        = Title

        Learn more about the xref:image-macro[image:\\[\\] macro].

        [#image-macro]
        == Image macro

        Similar to the xref:\\[\\] macro, but for images. The text between [ and ] is the alt text.
      `
      const expected = heredoc`
        # Title

        Learn more about the [image:\\[\\] macro](#image-macro).

        ## Image macro

        Similar to the xref:\\[\\] macro, but for images. The text between [ and ] is the alt text.
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('admonitions', () => {
    it('should convert admonitions', () => {
      const input = heredoc`
        = Title
        :milk-type: oat

        NOTE: Remember the {milk-type} milk.

        IMPORTANT: Don't forget the children!

        TIP: Look for the warp zone under the bridge.

        CAUTION: Slippery when wet.

        WARNING: The software you're about to use has not been tested.
      `
      const expected = heredoc`
        # Title

        📌 **NOTE:** Remember the oat milk.

        ❗ **IMPORTANT:** Don't forget the children!

        💡 **TIP:** Look for the warp zone under the bridge.

        🔥 **CAUTION:** Slippery when wet.

        ⚠️ **WARNING:** The software you're about to use has not been tested.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should only replace admonition label at start of paragraph', () => {
      const input = heredoc`
        = Title

        TIP: Look
        for the
        NOTE: prefix.
      `
      const expected = heredoc`
        # Title

        💡 **TIP:** Look
        for the
        NOTE: prefix.
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('blockquotes', () => {
    it('should retain Markdown-style blockquotes', () => {
      const input = heredoc`
        = Title

        > Roads?
        >
        > Where we're going, we don't need _roads_!

        The rest is...the future!

        > And away we go!
      `

      const expected = heredoc`
        # Title

        > Roads?
        >
        > Where we're going, we don't need *roads*!

        The rest is...the future!

        > And away we go!
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('code blocks', () => {
    it('should convert literal paragraph', () => {
      const input = heredoc`
        = Title

        beginning

         literal

        middle

            literal
              so literal

        end
      `
      const expected = heredoc`
        # Title

        beginning

            literal

        middle

            literal
              so literal

        end
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert literal paragraph at start of document', () => {
      const input = ' literal paragraph'
      const expected = '    literal paragraph'
      expect(downdoc(input)).to.equal(expected)
    })

    it('should promote literal paragraph that starts with command prompt to a console code block', () => {
      const input = heredoc`
        Example:

         $ npx downdoc README.adoc

        Get more information:

         $ npx downdoc -h
      `
      const expected = heredoc`
        Example:

        \`\`\`console
        $ npx downdoc README.adoc
        \`\`\`

        Get more information:

        \`\`\`console
        $ npx downdoc -h
        \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert source block with language', () => {
      const input = heredoc`
        = Title

        [,js]
        ----
        const downdoc = require('downdoc')
        console.log(downdoc('= Document Title'))
        ----
      `
      const expected = heredoc`
        # Title

        \`\`\`js
        const downdoc = require('downdoc')
        console.log(downdoc('= Document Title'))
        \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert source block with language preceded by space', () => {
      const input = heredoc`
        = Title

        [, text]
        ----
        just plain text
        ----
      `
      const expected = heredoc`
        # Title

        \`\`\`text
        just plain text
        \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert source block without language', () => {
      const input = heredoc`
        = Title

        [source]
        ----
        /.cache/
        /node_modules/
        ----
      `
      const expected = heredoc`
        # Title

        \`\`\`
        /.cache/
        /node_modules/
        \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert listing block', () => {
      const input = heredoc`
        = Title

        ----
        folder/
          file.yml
          subfolder/
            file.js
        ----
      `
      const expected = heredoc`
        # Title

        \`\`\`
        folder/
          file.yml
          subfolder/
            file.js
        \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert literal block with style (diagram)', () => {
      const input = heredoc`
        = Title

        [plantuml]
        ....
        start;
        stop;
        ....
      `
      const expected = heredoc`
        # Title

        \`\`\`plantuml
        start;
        stop;
        \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should not substitute text in a verbatim block', () => {
      const input = heredoc`
        = Title
        :project-name: ACME

        The name of the project is {project-name}.

        [,ruby]
        ----
        puts '{project-name}'
        ----

        {project-name} is awesome.
      `
      const expected = heredoc`
        # Title

        The name of the project is ACME.

        \`\`\`ruby
        puts '{project-name}'
        \`\`\`

        ACME is awesome.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should not process line-oriented syntax inside verbatim block', () => {
      const input = heredoc`
        = Title

        [,asciidoc]
        ----
        = Document Title
        :toc: preamble
        :toc-title: Contents

        preamble

        == Section

        content
        ----

        Isn't AsciiDoc grand?
      `
      const expected = heredoc`
        # Title

        \`\`\`asciidoc
        = Document Title
        :toc: preamble
        :toc-title: Contents

        preamble

        == Section

        content
        \`\`\`

        Isn't AsciiDoc grand?
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should honor subs=+attributes on source block', () => {
      const input = heredoc`
        = Title
        :url-repo: https://github.com/octocat/Spoon-Knife

        [,console,subs=+attributes]
        ----
        $ git clone {url-repo}
        ----
      `
      const expected = heredoc`
        # Title

        \`\`\`console
        $ git clone https://github.com/octocat/Spoon-Knife
        \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should honor subs="attributes+" on source block', () => {
      const input = heredoc`
        = Title
        :url-repo: https://github.com/octocat/Spoon-Knife

        [,console,subs="attributes+"]
        ----
        $ git clone {url-repo}
        ----
      `
      const expected = heredoc`
        # Title

        \`\`\`console
        $ git clone https://github.com/octocat/Spoon-Knife
        \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert block title on source block', () => {
      const input = heredoc`
        = Title

        .Clone the repository
        [,console]
        ----
        $ git clone https://github.com/octocat/Spoon-Knife
        ----
      `
      const expected = heredoc`
        # Title

        **Clone the repository**
        \`\`\`console
        $ git clone https://github.com/octocat/Spoon-Knife
        \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should replace conums in source block with circled numbers', () => {
      const input = heredoc`
        = Title

        [,js]
        ----
        'use strict' // <1>

        const fs = require('node:fs') // <2>
        ----
        <1> Enables strict mode.
        <2> Requires the built-in fs module.
      `
      const expected = heredoc`
        # Title

        \`\`\`js
        'use strict' // ❶

        const fs = require('node:fs') // ❷
        \`\`\`
        1. Enables strict mode.
        2. Requires the built-in fs module.
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('lists', () => {
    it('should retain unordered list', () => {
      const input = heredoc`
        * work
        * play
        * drink

        paragraph

        * and party!
      `
      expect(downdoc(input)).to.equal(input)
    })

    it('should convert ordered list to numbered list', () => {
      const input = heredoc`
        = Title

        . one
        . two
        . three

        paragraph

        . and one
      `
      const expected = heredoc`
        # Title

        1. one
        2. two
        3. three

        paragraph

        1. and one
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should convert colist to numbered list', () => {
      const input = heredoc`
        = Document Title

        <1> Prints the number 1.
      `
      const expected = heredoc`
        # Document Title

        1. Prints the number 1.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should indent block following a list continuation', () => {
      const input = heredoc`
        * Install
        +
        [,console]
        ----
        $ npm i downdoc
        ----

        * Use
        +
        [,console]
        ----
        $ npx downdoc README.adoc
        ----
      `
      const expected = heredoc`
        * Install

          \`\`\`console
          $ npm i downdoc
          \`\`\`

        * Use

          \`\`\`console
          $ npx downdoc README.adoc
          \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should reset indent when starting new ordered list item', () => {
      const input = heredoc`
        . Install
        +
        [,console]
        ----
        $ npm i downdoc
        ----
        . Use
        +
        [,console]
        ----
        $ npx downdoc README.adoc
        ----
      `
      const expected = heredoc`
        1. Install

          \`\`\`console
          $ npm i downdoc
          \`\`\`
        2. Use

          \`\`\`console
          $ npx downdoc README.adoc
          \`\`\`
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('comments', () => {
    it('should skip comment lines and blocks', () => {
      const input = heredoc`
        // This is an AsciiDoc document.
        = Title
        ////
        ignored
        ////
        :summary: Summary
        // ignore this line

        ////
        ignore
        these
        lines
        ////

        {summary}

        // ignore this line
        More summary
        //fin
      `
      const expected = heredoc`
        # Title

        Summary

        More summary
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('preprocessor conditionals', () => {
    it('should expand ifdef enclosure on attribute entry in header for defined attribute', () => {
      const input = heredoc`
        = Title
        :project-handle: downdoc
        ifdef::project-handle[:url-project: https://example.org/{project-handle}]

        This project is named {project-handle}.
        The URL of the project is {url-project}.
      `
      const expected = heredoc`
        # Title

        This project is named downdoc.
        The URL of the project is https://example.org/downdoc.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should permit use of conditional directive above doctitle', () => {
      const input = heredoc`
        ifdef::not-set[ignore line]
        = Title
        :project-handle: downdoc

        This project is named {project-handle}.
      `
      const expected = heredoc`
        # Title

        This project is named downdoc.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should skip ifdef enclosure on attribute entry in header for undefined attribute', () => {
      const input = heredoc`
        = Title
        ifdef::env-github[:toc-title: Contents]

        {toc-title}
      `
      const expected = heredoc`
        # Title

        {toc-title}
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should expand ifndef enclosure on attribute entry in header for undefined attribute', () => {
      const input = heredoc`
        = Title
        ifndef::project-handle[:project-handle: downdoc]
        :url-project: https://example.org/{project-handle}

        This project is named {project-handle}.
        The URL of the project is {url-project}.
      `
      const expected = heredoc`
        # Title

        This project is named downdoc.
        The URL of the project is https://example.org/downdoc.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should skip ifndef enclosure on attribute entry in header for defined attribute', () => {
      const input = heredoc`
        = Title
        :project-handle: downdoc
        ifndef::project-handle[:project-handle: foobar]
        :url-project: https://example.org/{project-handle}

        This project is named {project-handle}.
        The URL of the project is {url-project}.
      `
      const expected = heredoc`
        # Title

        This project is named downdoc.
        The URL of the project is https://example.org/downdoc.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should keep contents of ifdef directive block if attribute is set', () => {
      const input = heredoc`
        = Title
        :badges:

        ifdef::badges[]
        image:https://img.shields.io/npm/v/downdoc[npm version]
        endif::[]

        Summary
      `
      const expected = heredoc`
        # Title

        ![npm version](https://img.shields.io/npm/v/downdoc)

        Summary
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should keep contents of ifndef directive block if attribute is not set', () => {
      const input = heredoc`
        = Title

        ifndef::author[]
        There is no author.
        endif::[]

        Summary
      `
      const expected = heredoc`
        # Title

        There is no author.

        Summary
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should skip ifdef directive block if attribute is not set and collapse empty lines', () => {
      const input = heredoc`
        = Title

        ifdef::not-set[]
        image:https://img.shields.io/npm/v/downdoc[link="https://www.npmjs.com/package/downdoc",title="npm version"]
        endif::[]

        Summary
      `
      const expected = heredoc`
        # Title

        Summary
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should skip ifndef directive block if attribute is set and collapse empty lines', () => {
      const input = heredoc`
        = Title
        Author Name
        ifdef::author[:attribution: written by {author}]
        First paragraph.

        ifndef::author[]
        There is no author.
        endif::[]

        Summary {attribution}.
      `
      const expected = heredoc`
        # Title

        First paragraph.

        Summary written by Author Name.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should skip single line conditional directive if condition is false', () => {
      const input = heredoc`
        = Title

        ifdef::flag[ignored line]
        Summary
      `
      const expected = heredoc`
        # Title

        Summary
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should keep and process text from single line conditional directive if condition is true', () => {
      const input = heredoc`
        = Title
        :foo: bar

        ifndef::bar[{foo}]
      `
      const expected = heredoc`
        # Title

        bar
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })

  describe('unsupported', () => {
    it('should drop block attribute list', () => {
      const input = heredoc`
        = Title

        [.lead]
        Lead paragraph.
      `
      const expected = heredoc`
        # Title

        Lead paragraph.
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should remove toc macro', () => {
      const input = heredoc`
        = Title

        toc::[]

        == First Section
      `
      const expected = heredoc`
        # Title

        ## First Section
      `
      expect(downdoc(input)).to.equal(expected)
    })

    it('should skip table (for now)', () => {
      const input = heredoc`
        = Title

        Here's a list of configuration options.

        |===
        | Name | Description

        | dryRun
        | Report what actions will be taken without doing them.
        |===

        That's all.
      `
      const expected = heredoc`
        # Title

        Here's a list of configuration options.

        That's all.
      `
      expect(downdoc(input)).to.equal(expected)
    })
  })
})
