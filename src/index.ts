import { toElement, requestAnimationFrame } from './util.js'
import { sleep } from './sleep.js'
export const qs = document.querySelector.bind(document)
export const qsa = document.querySelectorAll.bind(document)
export const byId = document.getElementById.bind(document)

const SECOND = 1000
const DEFAULT_TIMEOUT = (5 * SECOND)

export { sleep }

export const dom = {
    getComputedStyle,
    isElementVisible,
    waitForText,
    waitFor,
    click,
    event,
    sleep,
    qs,
    qsa,
    byId
}

export default dom

/**
 * @param {Element} element
 */
export function isStyleVisible (element:Element):boolean {
    const ownerDocument = element.ownerDocument
    if (!ownerDocument || !ownerDocument.defaultView) {
        console.warn('invalid element?', element)
        throw new Error('element has no ownerDocument')
    }

    const {
        display,
        visibility,
        opacity
    } = ownerDocument.defaultView.getComputedStyle(element)

    return (
        display !== 'none' &&
        visibility !== 'hidden' &&
        visibility !== 'collapse' &&
        opacity !== '0' &&
        Number(opacity) !== 0
    )
}

/**
 * Return an object containing the values of all CSS properties of an element,
 * after applying active stylesheets.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle|MDN}
 * @param {Element | HTMLElement} element
 */
export function getComputedStyle (element:Element|HTMLElement) {
    const ownerDocument = element.ownerDocument

    if (!ownerDocument || !ownerDocument.defaultView) {
        console.warn('invalid element?', element)
        throw new Error('element has no ownerDocument')
    }

    return ownerDocument.defaultView.getComputedStyle(element)
}

/**
 * Return if the given attribute is visible.
 *
 * @param {Element} element
 * @param {Element} [previousElement]
 * @returns {boolean}
 */
export function isAttributeVisible (element:Element, previousElement?:Element):boolean {
    return (
        !element.hasAttribute('hidden') &&
    (element.nodeName === 'DETAILS' && previousElement?.nodeName !== 'SUMMARY'
        ? element.hasAttribute('open')
        : true)
    )
}

/**
 * Return `true` if the given element is visible.
 * Copy pasted from https://raw.githubusercontent.com/testing-library/jest-dom/master/src/to-be-visible.js
 *
 * @param {Element} element
 * @param {Element} [previousElement]
 * @returns {boolean}
 */
export function isElementVisible (
    element:Element,
    previousElement?:Element
):boolean {
    return (
        isStyleVisible(element) &&
        isAttributeVisible(element, previousElement) &&
        (!element.parentElement ||
            dom.isElementVisible(element.parentElement, element))
    )
}

/**
 * Look for the given text within the given parent element. Return the element
 * containing the text.
 *
 * @param {{
 *    text?: string,
 *    timeout?: number
 *    element: Element,
 *    multipleTags?: boolean,
 *    regex?: RegExp
 * }|string} args
 */
export function waitForText (args:Partial<{
    text:string,
    timeout:number,
    multipleTags:boolean,
    regex:RegExp
}>|string, parentElement:Element = document.body):Promise<HTMLElement|null> {
    let opts:{
        text?:string;
        timeout?:number;
        element:Element;
        multipleTags?:boolean;
        regex?:RegExp
    }

    if (typeof args === 'string') {
        opts = { text:args, element:document.body }
    } else {
        opts = { ...args, element:parentElement }
    }

    return waitFor(
        null,
        { timeout:opts.timeout },
        () => {  // the lambda
            const {
                element,
                text,
                regex,
                multipleTags
            } = opts

            const elems:Element[] = []

            let maxLoop = 10000
            const stack:Element[] = [element]
            // Walk the DOM tree breadth first and build up a list of
            // elements with the leafs last.
            while (stack.length > 0 && maxLoop-- >= 0) {
                const current = stack.pop()
                if (current && current.children.length > 0) {
                    stack.push(...current.children)
                    elems.push(...current.children)
                }
            }

            // Loop over children in reverse to scan the LEAF nodes first.
            let match:HTMLElement|null = null
            for (let i = elems.length - 1; i >= 0; i--) {
                const node = elems[i]
                if (!node.textContent) continue

                if (regex && regex.test(node.textContent)) {
                    return node
                }

                if (text && node.textContent?.includes(text)) {
                    return node
                }

                if (text && multipleTags) {
                    if (text[0] !== (node.textContent)[0]) continue

                    // if equal, check the sibling nodes
                    let sibling = node.nextSibling
                    let i = 1

                    // while there is a potential match, keep checking the siblings
                    while (i < text.length) {
                        if (sibling && (sibling.textContent === text[i])) {
                            // is equal still, check the next sibling
                            sibling = sibling.nextSibling
                            i++
                            match = node.parentElement
                        } else {
                            if (i === (text.length - 1)) return node.parentElement
                            match = null
                            break
                        }
                    }
                }
            }

            return match
        }
    )
}

/**
 * Wait for an element to appear in the DOM, then resolve the promise. Either
 * a query selector or lambda function must be provided.
 *
 * @param {string} [selector] The CSS selector to use
 * @param {{ visible:boolean, timeout:number }} [args] Configuration args
 * @param {() => Element|null} [lambda] An optional function that returns the
 *   element. Used if the `selector` is not provided.
 * @returns {Promise<Element|null>} A promise that resolves to the
 *   found element.
 *
 * @throws {Error} - Throws if neither `lambda` nor `selector` is provided.
 * @throws {Error} - Throws if the element is not found within the timeout.
 *
 * @example
 * ```js
 * waitFor({ selector: '#my-element', visible: true, timeout: 5000 })
 *   .then(el => console.log('Element found:', el))
 *   .catch(err => console.log('Element not found:', err));
 * ```
 */
export function waitFor (selector?:string|null, args?:{
    visible?:boolean,
    timeout?:number
}|null, lambda?:() => Element|null):Promise<HTMLElement|null> {
    return new Promise((resolve, reject) => {
        const visible = args?.visible ?? true
        const timeout = args?.timeout ?? DEFAULT_TIMEOUT

        if (!lambda && selector) {
            lambda = () => {
                return globalThis.document.querySelector(selector)
            }
        }

        if (!lambda) {
            throw new Error('lambda or selector required')
        }

        const interval = setInterval(() => {
            let el:Element|null
            try {
                el = lambda!()
            } catch (err) {
                clearInterval(interval)
                clearTimeout(timer)
                return reject(err)
            }

            if (el) {
                if (visible && !isElementVisible(el)) return
                clearInterval(interval)
                clearTimeout(timer)
                return resolve(el as HTMLElement)
            }
        }, 50)

        const timer = setTimeout(() => {
            clearInterval(interval)
            const wantsVisable = visible ? 'A visible selector' : 'A Selector'
            reject(
                selector ?
                    new Error(`${wantsVisable} was not found after ${timeout}ms (${selector})`) :
                    new Error(`${wantsVisable} was not found after ${timeout}ms`)
            )
        }, timeout)
    })
}

/**
 * Dispatch the `click`` method on an element specified by selector.
 *
 * @param {string|Element} selector - A CSS selector string, or
 *   an instance of an HTMLElement.
 * @returns {Promise<void>}
 *
 * @example
 * ```js
 * await click('.class button', 'Click a button')
 * ```
 */
export async function click (selector:HTMLElement|string):Promise<void> {
    const element = toElement(selector)

    event(new globalThis.MouseEvent('click', {
        bubbles:true,
        cancelable:true,
        button:0
    }), element)

    await requestAnimationFrame()
}

/**
 * @param {string|Event} event  The event to dispatch
 * @param {Element|window} [element] - The element to dispatch from, or
 *   will use `window` if none given.
 * @returns {void}
 *
 * @throws {Error} Throws an error if the `event` is not a string that can be
 *   converted to a CustomEvent or not an instance of Event.
 */
export function event (
    event:CustomEvent|Event|string,
    element?:Element|Window|null
):void {
    element = (element instanceof Window ? element : toElement(element))

    if (typeof event === 'string') {
        event = new globalThis.CustomEvent(event)
    }

    if (
        !(event instanceof Event) &&
        !((event as any) instanceof CustomEvent)
    ) {
        throw new Error('event should be of type Event')
    }

    element.dispatchEvent(event)
}

/**
 * Type the given value into the element, emitting all relevant events, to
 * simulate a user typing with a keyboard.
 *
 * @param {string|HTMLElement|Element} selector - A CSS selector string, or an instance of HTMLElement, or Element.
 * @param {string} value - The string to type into the :focus element.
 * @returns {Promise<void>}
 *
 * @example
 * ```js
 * await type('#my-div', 'Hello World')
 * ```
 */
export async function type (
    selector:string|HTMLElement|Element,
    value:string,
):Promise<void> {
    const el = toElement(selector)

    if (!('value' in el!)) throw new Error('Element missing value attribute')

    for (const c of value.split('')) {
        await requestAnimationFrame()
        el.value = el.value != null ? el.value + c : c
        el.dispatchEvent(
            new Event('input', {
                bubbles:true,
                cancelable:true
            })
        )
    }

    await requestAnimationFrame()
}
