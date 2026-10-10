import './stub.js'
import { waitFor } from '../../src/index.js'

// A script that awaits one successful `waitFor` and does nothing else.
// It should exit on its own.
await waitFor(null, { visible:false }, () => ({} as Element))
