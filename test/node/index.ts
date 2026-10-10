import { spawn } from 'node:child_process'
import { test } from '@substrate-system/tapzero'

// bundled from ./fixture.ts by the `test:node` script
const FIXTURE = 'test/node-fixture.js'
const KILL_AFTER = 2000

test('a script that awaits waitFor exits on its own', async t => {
    const child = spawn(process.execPath, [FIXTURE], { stdio:'inherit' })
    const killer = setTimeout(() => child.kill(), KILL_AFTER)

    const code = await new Promise<number|null>(resolve => {
        child.on('exit', resolve)
    })
    clearTimeout(killer)

    t.equal(code, 0, `should exit before being killed at ${KILL_AFTER}ms`)
})
