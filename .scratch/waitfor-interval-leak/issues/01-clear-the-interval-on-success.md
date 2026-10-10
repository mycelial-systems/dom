# waitFor keeps polling after it resolves

**Status:** ready-for-agent
**Blocked by:** None
**Touches:** `src/index.ts` (`waitFor`, and `waitForText` through it),
`test/index.ts`

## Problem

`waitFor` polls with a 50 ms `setInterval` and bounds the wait with a
`setTimeout`. The timeout path clears the interval, but the success path
does not:

```ts
// src/index.ts:244-261 (0.1.13)
const interval = setInterval(() => {
    const el = lambda!()
    if (el) {
        if (visible && !isElementVisible(el)) return
        clearTimeout(timer)
        return resolve(el as HTMLElement)  // interval is never cleared
    }
}, 50)

const timer = setTimeout(() => {
    clearInterval(interval)
    // ...reject
}, timeout)
```

After the promise resolves, the interval keeps calling the lambda every
50 ms for the life of the page. `resolve` is a no-op after the first
call, so nothing visible happens, which is why this has gone unnoticed.

## Effects

- Every successful `waitFor` (and `waitForText`, which calls `waitFor`)
  leaves a permanent 50 ms timer. A test suite that calls `waitFor`
  hundreds of times ends with hundreds of intervals, each running a
  `querySelector` (or a full DOM walk, for `waitForText`) 20 times a
  second.
- The lambda's closure stays reachable, so the found element and
  anything the lambda captures can never be garbage collected, even
  after the element is removed from the DOM.
- A lambda with side effects keeps running them.
- If the lambda starts throwing later (for example, because the test
  tore down the DOM it reads), each tick throws an uncaught error from
  the timer. In a test runner that treats uncaught errors as failures
  (tapout does), that error appears during a later, unrelated test.
- In Node (jsdom, happy-dom, or a stubbed `document`) the live interval
  keeps the event loop alive, so a process that used `waitFor` never
  exits on its own.

## Reproduction

Node, bundling `src/index.ts` with esbuild. The module binds `document`
methods when it loads, so `document` is stubbed first.

```ts
// stub.ts
const noop = () => null
;(globalThis as any).document = new Proxy({}, {
    get: () => Object.assign(noop, { bind: () => noop })
})
```

```ts
// repro.ts
import './stub.ts'
import { waitFor } from '../src/index.js'

let calls = 0
const el = {} as Element
const found = await waitFor(null, { visible: false, timeout: 5000 }, () => {
    calls++
    return el
})
const atResolve = calls
setTimeout(() => {
    console.log(`resolved: ${found === el}`)
    console.log(`lambda calls at resolve: ${atResolve}`)
    console.log(`lambda calls 1000ms later: ${calls}`)
}, 1000)
```

```sh
esbuild repro.ts --bundle --platform=node --format=esm --outfile=repro.mjs
timeout 8 node repro.mjs; echo "exit=$?"
```

Observed (Node 26, dom 0.1.13):

```
resolved: true
lambda calls at resolve: 1
lambda calls 1000ms later: 20
exit=124
```

The lambda ran 19 more times in the second after the promise resolved,
and the process did not exit until `timeout` killed it (exit 124), even
though the `setTimeout` had already been cleared.

## Fix

Clear the interval on success, the same way the timeout path does:

```ts
if (el) {
    if (visible && !isElementVisible(el)) return
    clearInterval(interval)
    clearTimeout(timer)
    return resolve(el as HTMLElement)
}
```

Worth considering in the same change, though not required:

- Wrap the lambda call in try/catch and reject (after clearing both
  timers) if it throws, so a throwing lambda fails the `waitFor` call
  that owns it instead of throwing from a timer.

## Acceptance criteria

- [ ] After `waitFor` resolves, the lambda is not called again: a test
  counts lambda calls, awaits `waitFor`, waits 200 ms, and asserts the
  count did not change.
- [ ] The same holds for `waitForText`.
- [ ] After `waitFor` rejects on timeout, the lambda is not called again
  (already true today; keep it covered).
- [ ] In Node with a stubbed `document`, a script that awaits one
  successful `waitFor` exits on its own.

## Related, separate

- The JSDoc example on `waitFor` (`src/index.ts:221`) calls
  `waitFor({ selector: '#my-element', visible: true, timeout: 5000 })`,
  but the signature is `waitFor(selector, args, lambda)`. The example
  passes an object where the selector string goes.

## Comments

Found while hardening the browser tests in
`@substrate-system/blur-hash` (branch `no-partial-paint`), which uses
`waitFor` from this package as a dev dependency.
