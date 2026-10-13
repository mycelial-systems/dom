# dom
[![tests](https://img.shields.io/github/actions/workflow/status/substrate-system/dom/nodejs.yml?style=flat-square)](https://github.com/substrate-system/dom/actions/workflows/nodejs.yml)
[![types](https://img.shields.io/npm/types/msgpackr?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg?style=flat-square)](package.json)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/dom)](https://packagephobia.com/result?p=@substrate-system/dom)
[![GZip size](https://img.shields.io/bundlephobia/minzip/@substrate-system/dom?style=flat-square)](https://bundlephobia.com/package/@substrate-system/dom)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](https://common-changelog.org)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


Helpers for working with the DOM; useful for tests.

[Read the docs](https://substrate-system.github.io/dom/)

<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [Install](#install)
- [Use](#use)
  * [`import`](#import)
  * [`require`](#require)
- [API](#api)
  * [convenient shortcuts](#convenient-shortcuts)
  * [`waitFor`](#waitfor)
  * [`waitForText`](#waitfortext)
  * [`click`](#click)
  * [`event`](#event)
  * [`sleep`](#sleep)
  * [`type`](#type)
- [credits](#credits)

<!-- tocstop -->

</details>


## Install

```sh
npm i -D @substrate-system/dom
```

## Use

### `import`
```js
import { dom } from '@substrate-system/dom'

// or import individual functions
import { waitFor } from '@substrate-system/dom'
```

### `require`
```js
const dom = require('@substrate-system/dom').dom
```

## API

### convenient shortcuts

__`dom.qs`__ points to `document.querySelector`

__`dom.qsa`__ is equal to `document.querySelectorAll`

__`dom.byId`__ is equal to `document.getElementById`


-------


### `waitFor`
Look for a DOM element by slector. Default timeout is 5 seconds. Throws if the element is not found.

```ts
function waitFor<K extends keyof HTMLElementTagNameMap> (
    selector:K,
    args?:{ visible?:boolean; timeout?:number }|null,
    lambda?:() => Element|null
):Promise<HTMLElementTagNameMap[K]|null>

function waitFor<E extends Element = HTMLElement> (
    selector?:string|null,
    args?:{ visible?:boolean; timeout?:number }|null,
    lambda?:() => Element|null
):Promise<E|null>
```

A tag name selector resolves to that tag's element type, including custom
elements declared in `HTMLElementTagNameMap`. Any other selector resolves to
`HTMLElement` by default, or to the type you pass in.

#### `waitFor` example
```js
import { waitFor } from '@substrate-system/dom'

// or pass in a query selector string
const el = await waitFor('#my-element')

// a tag name gets the matching element type (HTMLInputElement here)
const input = await waitFor('input')

// pass the element type for any other selector
const field = await waitFor<HTMLInputElement>('#my-input')

// example of using a lambda function only
const el2 = dom.waitFor(null, null, () => {
    return document.querySelector('p')
})
```

### `waitForText`
Look for an element containing the given text, or that matches a given regex. Return the element if found. Default timeout is 5 seconds. Throws if the element is not found.

Takes either an option object or a string of text.

```ts
function waitForText (args:Partial<{
    text:string,
    timeout:number,
    multipleTags:boolean,
    regex:RegExp
}>|string, parentElement:Element = document.body):Promise<Element|null>
```

#### `waitForText` example

```js
import { waitForText } from '@substrate-system/dom'

// by default will search the document.body
const el = await waitForText({
    regex: /bar/
})
```

##### Pass in a string selector
Can pass in a string to search for. Will search the `document.body` by default.

```js
import { waitForText } from '@substrate-system/dom'

const el = await dom.waitForText('bar')
```

##### Pass in a parent element and timeout.
```js
const found = await waitForText({
    element: dom.qs('#test-two'),
    multipleTags: true,
    text: 'bbb',
    timeout: 10000  // 10 seconds
})
```

### `click`
Dispatch a click event from the given element.

```ts
async function click (selector:Element|string):Promise<void>
```

#### `click` example

```js
import { dom } from '@substrate-system/dom'
// or import { click } from '@substrate-system/dom'

dom.click(dom.qs('#my-element'))

// or pass a selector
dom.click('#my-element')
```

### `event`
Dispatch an event from an element. Will dispatch from `window` if no element is passed in.

```ts
function event (
    event:CustomEvent|Event|string,
    element?:Element|Window|null
):void
```

#### `event` example
```js
import { dom } from '@substrate-system/dom'

// pass in an event name. Will create a custom event.
dom.event('hello', dom.qs('#test'))

// create an event, then dispatch it
dom.event(
    new CustomEvent('test-event', {
        bubbles: true,
        detail: 'test'
    }),
    dom.qs('#test-two')
)
```

### `sleep`
Wait for the given milliseconds.

```ts
async function sleep (ms:number):Promise<void>
```

#### `sleep` example
```js
import { sleep } from '@substrate-system/dom'

await sleep(3000)  // wait 3 seconds
```

### `type`
Enter text into an input. This will simulate typing by dispatching `input` events.

```ts
async function type (
    selector:string|HTMLElement|Element,
    value:string,
):Promise<void>
```

#### `type` example

```js
import { type } from '@substrate-system/dom'

// this will dispatch 5 `input` events,
// one for each character
await type('#test', 'hello')
```

## credits

Thanks [@raynos](https://github.com/raynos/) for writing this originally.
