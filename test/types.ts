/**
 * Compile-time tests. These are checked by `npm run test:types` (tsc), not
 * executed. A wrong type is a compile error.
 */
import { dom, waitFor } from '../src/index.js'

type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends
    (<T>() => T extends B ? 1 : 2) ?
        true :
        false

function expectType<T extends true> (_?:T):void {}

class TestWidget extends HTMLElement {
    widgetMethod ():void {}
}

declare global {
    interface HTMLElementTagNameMap {
        'test-widget':TestWidget;
    }
}

export async function waitForTypes ():Promise<void> {
    // a tag name selector resolves to the element type for that tag
    const _input = await waitFor('input')
    expectType<Equal<typeof _input, HTMLInputElement|null>>()

    // a custom element registered in HTMLElementTagNameMap
    const _widget = await waitFor('test-widget')
    expectType<Equal<typeof _widget, TestWidget|null>>()

    // any selector, with the element type given explicitly
    const _byId = await waitFor<HTMLInputElement>('#foo')
    expectType<Equal<typeof _byId, HTMLInputElement|null>>()

    // any other selector defaults to HTMLElement
    const _other = await waitFor('#foo')
    expectType<Equal<typeof _other, HTMLElement|null>>()

    // so does a lambda with no selector
    const _fromLambda = await waitFor(null, null, () => null)
    expectType<Equal<typeof _fromLambda, HTMLElement|null>>()

    // the `dom` namespace export has the same signatures
    const _domInput = await dom.waitFor('input')
    expectType<Equal<typeof _domInput, HTMLInputElement|null>>()

    const _domById = await dom.waitFor<HTMLInputElement>('#foo')
    expectType<Equal<typeof _domById, HTMLInputElement|null>>()
}
