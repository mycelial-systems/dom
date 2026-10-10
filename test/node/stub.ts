// The module binds `document` methods when it loads, so stub `document`
// before importing it.
const noop = () => null
;(globalThis as any).document = new Proxy({}, {
    get:() => Object.assign(noop, { bind:() => noop })
})
