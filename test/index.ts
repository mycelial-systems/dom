import { byId, dom, qs, waitForText, type } from '../src/index.js'
import { test } from '@substrate-system/tapzero'
import { Terminal } from 'xterm'

test('setup', () => {
    document.body.innerHTML += `
        <form>
            <input id="test-input" type="text" />
        </form>

        <div id="id-test">testing the ID attribute</div>
    `
})

test('byId', t => {
    t.plan(1)
    const el = byId('id-test')
    t.ok(el, 'should get an element by ID')
})

test('dom.waitFor', async t => {
    const p = document.createElement('p')
    p.textContent = 'testing'
    document.body.appendChild(p)

    const foundP = await dom.waitFor('p')

    t.equal(foundP!.textContent, 'testing', 'should find the element by tag')

    const pViaString = await dom.waitFor('p')
    t.equal(pViaString!.textContent, 'testing',
        'should take a string selector as arg')

    const a = document.body.appendChild(document.createElement('a'))
    a.id = 'hello'
    a.textContent = 'hello'

    const foundA = await dom.waitFor('#hello')
    t.ok(foundA, 'should find an element by ID')
    t.equal(foundA?.textContent, 'hello', 'should find the right element by ID')

    // wait a bit, then add the element
    setTimeout(() => {
        const div = document.createElement('div')
        div.textContent = 'bar'
        div.setAttribute('id', 'foo')
        document.body.appendChild(div)
    }, 2000)

    // first start waiting
    const el = await dom.waitFor('#foo')

    t.equal(el!.textContent, 'bar', 'should find the element after waiting')
})

test('call waitFor with a string and options', async t => {
    const el = dom.waitFor('p', { timeout:1000, visible:false })
    t.ok(el, 'should find an element given a some option args')
})

test('call waitFor with a lambda only', async t => {
    const el = dom.waitFor(null, null, () => {
        return document.querySelector('p')
    })

    t.ok(el, 'should find an element given a lambda function')
})

test('waitFor stops polling after it resolves', async t => {
    let calls = 0
    const p = document.createElement('p')
    document.body.appendChild(p)

    await dom.waitFor(null, { visible:false }, () => {
        calls++
        return p
    })
    const callsAtResolve = calls

    await dom.sleep(200)
    p.remove()

    t.equal(calls, callsAtResolve,
        'should not call the lambda again after resolving')
})

test("dom.waitFor when it doesn't find an element", async t => {
    t.plan(1)

    try {
        await dom.waitFor('.doesnt-exist', { timeout:1000 })
    } catch (err) {
        t.equal(
            (err as Error).message,
            'A visible selector was not found after 1000ms (.doesnt-exist)',
            "should throw if it doesn't find an element"
        )
    }
})

test('waitFor stops polling after it times out', async t => {
    let calls = 0

    try {
        await dom.waitFor(null, { timeout:200 }, () => {
            calls++
            return null
        })
        t.fail('should not resolve')
    } catch (err) {
        t.ok(err, 'should reject when the element is not found')
    }
    const callsAtReject = calls

    await dom.sleep(200)

    t.equal(calls, callsAtReject,
        'should not call the lambda again after rejecting')
})

test('waitFor rejects if the lambda throws', async t => {
    let calls = 0
    const boom = new Error('boom')

    try {
        await dom.waitFor(null, { timeout:1000 }, () => {
            calls++
            throw boom
        })
        t.fail('should not resolve')
    } catch (err) {
        t.equal(err, boom, 'should reject with the error from the lambda')
    }
    const callsAtReject = calls

    await dom.sleep(200)

    t.equal(calls, callsAtReject,
        'should not call the lambda again after rejecting')
})

test('dom.click', async t => {
    const p = await dom.waitFor('p')
    p?.addEventListener('click', function listener (ev) {
        t.ok(ev instanceof MouseEvent,
            'should get a click event given an element')

        p.removeEventListener('click', listener)
    })
    await dom.click(p as HTMLElement)

    p?.addEventListener('click', ev => {
        t.ok(ev instanceof MouseEvent,
            'should get a click event given a strig selector')
        t.ok(ev, 'should got a click event given a string selector')
    })

    dom.click('p')
})

test('dom.waitForText', async t => {
    // use the element we created previously
    const el = await dom.waitForText({
        regex:/bar/
    }, document.body)

    t.ok(el, 'should find by text content')

    const elAgain = await dom.waitForText('bar')
    t.ok(elAgain, 'should find an element given text only')
})

test('waitForText stops polling after it resolves', async t => {
    const parent = document.createElement('div')
    parent.innerHTML = '<span>polling target</span>'
    document.body.appendChild(parent)

    // count how many times the search reads the parent's children
    let reads = 0
    const childrenGetter = Object.getOwnPropertyDescriptor(
        Element.prototype,
        'children'
    )!.get!
    Object.defineProperty(parent, 'children', {
        get () {
            reads++
            return childrenGetter.call(parent)
        }
    })

    const el = await dom.waitForText('polling target', parent)
    const readsAtResolve = reads

    await dom.sleep(200)
    parent.remove()

    t.ok(el, 'should find the text')
    t.equal(reads, readsAtResolve,
        'should not search the DOM again after resolving')
})

test('multiple tags', async t => {
    const terminal = new Terminal({
        allowTransparency:true,
        fontFamily:'FiraMono',
        fontSize:14
    })
    terminal.writeln('foo bar baz')

    const el = document.createElement('div')
    document.body.appendChild(el)

    terminal.open(el)

    const found = await dom.waitForText({
        multipleTags:true,
        text:'foo bar'
    }, el)
    t.ok(found, 'should find text split into multiple tags')

    const text = await dom.waitForText({
        multipleTags:true,
        text:'baz'
    })
    t.ok(text, 'should find "baz" text')
})

test('more multiple tags', async t => {
    const testEl = document.createElement('div')
    testEl.setAttribute('id', 'test-el')
    document.body.appendChild(testEl)
    const children = Array.prototype.map.call('quux', letter => {
        const el = document.createElement('span')
        el.textContent = letter
        return el
    })
    testEl.append(...children as Node[])

    try {
        const quux = await dom.waitForText({
            text:'quux',
            multipleTags:true,
            timeout:1000
        }, testEl)

        t.ok(quux, 'should find the test in separate tags')
    } catch (err) {
        t.fail((err as Error).toString())
    }
})

test('return value for non-existant text', async t => {
    try {
        await dom.waitForText({
            text:'non existant',
            multipleTags:true,
            timeout:1000
        })
        t.fail("found text that doesn't exist")
    } catch (err) {
        t.ok(err, 'should throw an error because it is not found')
    }
})

test('partially matching text', async t => {
    try {
        await dom.waitForText({
            text:'quzz',
            multipleTags:true,
            timeout:1000
        })
        t.fail("found text that doesn't exist")
    } catch (err) {
        t.ok(err, "should throw an error because the text doesn't exist")
    }
})

test('another partial match', async t => {
    try {
        await dom.waitForText({
            text:'quuxaa',
            multipleTags:true,
            timeout:1000
        })
        t.fail('found non-existant text')
    } catch (err) {
        t.ok(err, "should throw an error because the text doesn't exist")
    }
})

test('match a middle section of text', async t => {
    try {
        const el = await dom.waitForText({
            text:'uux',
            multipleTags:true,
            timeout:1000
        })
        t.ok(dom.isElementVisible(el!), 'should find the element')
    } catch (err) {
        t.fail((err as Error).toString())
    }
})

test('return value for multipleTags', async t => {
    try {
        const match = await dom.waitForText({
            text:'uux',
            multipleTags:true,
            timeout:1000
        })

        t.equal(match!.getAttribute('id'), 'test-el',
            'should return the parent element')
    } catch (err) {
        t.fail((err as Error).toString())
    }
})

test('another case for text + tags', async t => {
    const test2 = document.createElement('div')
    test2.setAttribute('id', 'test-two')
    document.body.appendChild(test2)
    const children = Array.prototype.map.call('aaa bbb ccc', letter => {
        const el = document.createElement('span')
        el.textContent = letter
        return el
    })
    test2.append(...children as Node[])

    const div = document.getElementById('test-two')
    t.ok(div, 'div exists')
    t.equal(div?.querySelector('span:first-child')?.textContent, 'a',
        'children exist')

    try {
        const aaa = await dom.waitForText({
            multipleTags:true,
            text:'aaa',
            timeout:1000
        }, dom.byId('test-two')!)
        t.ok(dom.isElementVisible(aaa!), 'found the first string')
    } catch (err) {
        t.fail((err as Error).toString())
    }

    try {
        const found = await dom.waitForText({
            multipleTags:true,
            text:'bbb',
            timeout:1000
        }, dom.qs('#test-two')!)

        t.ok(dom.isElementVisible(found!), 'should find "bbb" string')
    } catch (err) {
        t.fail((err as Error).toString())
    }
})

test('dom.event', t => {
    t.plan(3)

    dom.qs('#test-two')!.addEventListener('hello', ev => {
        t.ok(ev, 'should get the custom event')
    })

    dom.qs('#test-two')!.addEventListener('testing-event', (ev) => {
        t.ok(ev, 'should get another custom event')
        t.equal((ev as CustomEvent).detail, 'test',
            'Can pass in properties to customize the event')
    })

    dom.event('hello', dom.qs('#test-two')!)
    dom.event(
        new CustomEvent('testing-event', {
            bubbles:true,
            detail:'test'
        }),
        dom.qs('#test-two')!
    )
})

test('waitForText', async t => {
    const text = await waitForText('testing')
    t.ok(text instanceof HTMLElement, 'should find the p tag given a string')
})

test('type', async t => {
    t.plan(11)
    const input = qs('#test-input')
    t.plan(11)
    input?.addEventListener('input', ev => {
        t.ok(ev, 'should dispatch an "input" event 11 times, once for each key')
    })

    await type('#test-input', 'hello world')
})

test('all done', () => {
    // @ts-expect-error tests
    window.testsFinished = true
})
